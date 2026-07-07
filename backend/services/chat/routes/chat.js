import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchTicker, getQuoteData, getFinancialStatements } from '../../../core/finance.js';
import { authenticateToken } from '../../../core/middleware/auth.js';

const router = express.Router();

// Initialize API key rotation pool for chat
const apiKeys = [
  process.env.GEMINI_API_KEY,
  process.env.NOTIFICATIONS_GEMINI_KEY,
  process.env.NOTIFICATIONS_GEMINI_KEY_BACKUP_1,
  process.env.NOTIFICATIONS_GEMINI_KEY_BACKUP_2,
  process.env.MAIN_GEMINI_KEY_BACKUP_1,
  process.env.MAIN_GEMINI_KEY_BACKUP_2
].filter(key => !!key && key.trim() !== "");

let currentKeyIndex = 0;
const modelsPool = [
  "gemini-3.5-flash",
  "gemini-2.5-flash"
];
let currentModelIndex = 0;

/**
 * Robust LLM Caller with backup keys and model rotation.
 */
async function callChatGemini(prompt) {
  if (apiKeys.length === 0) {
    throw new Error("No Gemini API Keys configured in pool!");
  }

  const maxRetries = apiKeys.length * modelsPool.length;
  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const keyToUse = apiKeys[currentKeyIndex];
    const modelToUse = modelsPool[currentModelIndex];
    
    try {
      const client = new GoogleGenerativeAI(keyToUse);
      const model = client.getGenerativeModel({ model: modelToUse });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      lastError = error;
      const errorMsg = String(error.message || error);
      const isRateLimit = errorMsg.includes("429") || 
                          errorMsg.toUpperCase().includes("RESOURCE_EXHAUSTED") ||
                          errorMsg.toUpperCase().includes("QUOTA") ||
                          (error.status && error.status === 429);

      if (isRateLimit) {
        console.warn(`[Chat LLM Client] Rate limit hit (429) using model ${modelToUse} at key index ${currentKeyIndex}. Rotating key...`);
        currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
        if (currentKeyIndex === 0) {
          currentModelIndex = (currentModelIndex + 1) % modelsPool.length;
          console.warn(`[Chat LLM Client] Rotating model to: ${modelsPool[currentModelIndex]}`);
        }
      } else {
        throw error;
      }
    }
  }
  throw lastError || new Error("AI rate limit retry loop failed.");
}

/**
 * POST /api/chat
 * Handles conversational queries with dynamic financial context injection.
 */
router.post('/chat', authenticateToken, async (req, res) => {
  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message content is required.' });
  }

  try {
    const extractionPrompt = `User message: "${message}"
    Extract all company names, stock tickers, or industry terms that could map to stock symbols mentioned in the query.
    Return only a JSON array of strings, e.g. ["Apple", "Tesla", "Nvidia"].
    Do not include markdown codeblocks (like \`\`\`json), headers, or any text other than the JSON array itself.`;

    let candidates = [];
    try {
      const rawExtraction = await callChatGemini(extractionPrompt);
      let cleaned = rawExtraction.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.substring(7);
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.substring(3);
      }
      if (cleaned.endsWith("```")) {
        cleaned = cleaned.substring(0, cleaned.length - 3);
      }
      candidates = JSON.parse(cleaned.trim());
    } catch (err) {
      console.warn('[Chat Agent] Failed to parse extracted tickers:', err);
    }

    let contextData = [];
    if (Array.isArray(candidates) && candidates.length > 0) {
      for (const name of candidates) {
        try {
          const resolved = await searchTicker(name);
          if (resolved && resolved.ticker) {
            const quote = await getQuoteData(resolved.ticker);
            const financials = await getFinancialStatements(resolved.ticker);
            
            contextData.push({
              ticker: resolved.ticker,
              companyName: resolved.name,
              quote,
              ratios: financials?.ratios || {}
            });
          }
        } catch (e) {
          console.warn(`Could not resolve ticker details for candidate "${name}":`, e);
        }
      }
    }

    let contextString = "";
    if (contextData.length > 0) {
      contextString = `Here is real-time financial data fetched from Yahoo Finance for the mentioned companies:\n` + 
        contextData.map(c => `
        Company: ${c.companyName} (${c.ticker})
        Current Price: ${c.quote?.currentPrice || 'N/A'} ${c.quote?.currency || ''}
        Market Cap: ${c.quote?.marketCap ? `$${(c.quote.marketCap / 1e9).toFixed(2)}B` : 'N/A'}
        P/E Ratio: ${c.quote?.trailingPE || 'N/A'} (Trailing), ${c.quote?.forwardPE || 'N/A'} (Forward)
        Operating Margin: ${c.ratios?.operatingMargin ? `${(c.ratios.operatingMargin * 100).toFixed(2)}%` : 'N/A'}
        Net Margin: ${c.ratios?.profitMargin ? `${(c.ratios.profitMargin * 100).toFixed(2)}%` : 'N/A'}
        Return on Equity (ROE): ${c.ratios?.returnOnEquity ? `${(c.ratios.returnOnEquity * 100).toFixed(2)}%` : 'N/A'}
        Return on Assets (ROA): ${c.ratios?.returnOnAssets ? `${(c.ratios.returnOnAssets * 100).toFixed(2)}%` : 'N/A'}
        Debt to Equity: ${c.ratios?.debtToEquity || 'N/A'}
        Current Ratio: ${c.ratios?.currentRatio || 'N/A'}
        Quick Ratio: ${c.ratios?.quickRatio || 'N/A'}
        `).join("\n---\n");
    }

    const formattedHistory = (history || [])
      .map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`)
      .join("\n");

    const chatPrompt = `You are a Senior Investment Analyst and Stock Market Specialist.
    Provide a professional, details-rich, and aesthetic response to the user's query.
    
    ${contextString}

    Conversation History:
    ${formattedHistory}

    Current User Query: "${message}"

    Guidelines for Response:
    - Address the query with precise, clear, and action-oriented intelligence.
    - If comparing companies or listing statistics, ALWAYS organize the data into clean Markdown tables so they render beautifully.
    - Use headers, bold points, and clean lists to make the response aesthetic and readable.
    - Explain any financial metrics used (e.g., P/E ratio, ROE, margins) in the comparison.
    - Speak directly, professionally, and objectively.`;

    const assistantResponse = await callChatGemini(chatPrompt);

    res.json({ response: assistantResponse.trim() });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Server error generating analysis response.' });
  }
});

export default router;
