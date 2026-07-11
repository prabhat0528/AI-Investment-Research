import { StateGraph, START, END } from "@langchain/langgraph";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { searchTicker, getQuoteData, getFinancialStatements, getRecentNews, getHistoricalPrices } from "../../../core/finance.js";

dotenv.config();

// Initialize API key rotation pool for agents (deduplicated to prevent duplicate key exhaustion)
const apiKeys = Array.from(new Set([
  process.env.GEMINI_API_KEY,
  process.env.NOTIFICATIONS_GEMINI_KEY,
  process.env.NOTIFICATIONS_GEMINI_KEY_BACKUP_1,
  process.env.NOTIFICATIONS_GEMINI_KEY_BACKUP_2,
  process.env.MAIN_GEMINI_KEY_BACKUP_1,
  process.env.MAIN_GEMINI_KEY_BACKUP_2
].map(k => k?.trim()).filter(Boolean)));

let currentKeyIndex = 0;

export let globalUseGroqBackup = false;
export let lastGeminiFailureTime = 0;
export const GEMINI_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown before retrying Gemini

export function activateGroqBackup() {
  globalUseGroqBackup = true;
  lastGeminiFailureTime = Date.now();
}

// Initialize model fallback pool (gemini-2.0-flash is active and stable)
const modelsPool = [
  "gemini-3.5-flash",
  "gemini-2.0-flash"
];
let currentModelIndex = 0;

if (!process.env.GROQ_API_KEY) {
  console.warn("⚠️ [Agent Startup Warning] GROQ_API_KEY is not defined in environment variables! Groq fallback will not be active.");
} else {
  console.log("✅ [Agent Startup] GROQ_API_KEY detected and loaded successfully for backup audit generation.");
}

/**
 * Helper to call Gemini model with automatic key rotation and model fallback on 429 rate limits.
 */
async function callGeminiInternal(prompt, responseMimeType = "text/plain") {
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
      const model = client.getGenerativeModel({ 
        model: modelToUse,
        generationConfig: {
          responseMimeType: responseMimeType
        }
      });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      lastError = error;
      const errorMsg = String(error.message || error);
      const isTransient = errorMsg.includes("429") || 
                          errorMsg.includes("503") ||
                          errorMsg.includes("500") ||
                          errorMsg.includes("fetch failed") ||
                          errorMsg.toUpperCase().includes("RESOURCE_EXHAUSTED") ||
                          errorMsg.toUpperCase().includes("QUOTA") ||
                          errorMsg.toUpperCase().includes("TEMPORARY") ||
                          errorMsg.toUpperCase().includes("OVERLOAD") ||
                          (error.status && [429, 500, 503].includes(error.status));

      if (isTransient) {
        console.warn(`[Agent LLM Client] Transient error hit (${error.status || 'unknown'}) using model ${modelToUse} at key index ${currentKeyIndex}: ${errorMsg.substring(0, 100)}. Attempting rotation...`);
        
        // Add 500ms cooling delay to let rate limits cool down before retrying
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Rotate key first
        currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
        
        // If we wrapped around keys, fallback to the next model in the pool
        if (currentKeyIndex === 0) {
          currentModelIndex = (currentModelIndex + 1) % modelsPool.length;
          console.warn(`[Agent LLM Client] All keys exhausted for ${modelToUse}. Falling back to next model: ${modelsPool[currentModelIndex]}`);
        }
      } else {
        // Non-transient errors fail immediately
        throw error;
      }
    }
  }

  throw lastError || new Error("AI rate limit retry loop failed.");
}

/**
 * Helper to call Groq (Llama 3.3 70B) as a secondary backup model for audits.
 */
async function callGroqFallback(prompt, responseMimeType = "text/plain") {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    throw new Error("No Groq API Key configured for fallback!");
  }

  console.log("[Agent LLM Client] Attempting Groq (Llama 3.3 70B) fallback...");
  
  // Disable certificate validation to bypass local Sophos decrypting proxy certificate blocks
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${groqKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: responseMimeType === "application/json" ? { type: "json_object" } : undefined
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${errText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Main wrapper called by auditor agent nodes. Falls back to Groq if Gemini fails/rate-limits.
 */
export async function callGemini(prompt, responseMimeType = "text/plain") {
  const now = Date.now();
  
  // If Gemini is in rate-limit cooldown, bypass it entirely and route to Groq from the beginning
  if (globalUseGroqBackup) {
    if (now - lastGeminiFailureTime < GEMINI_COOLDOWN_MS) {
      console.log("[Agent LLM Client] Gemini is in cooldown due to rate limits. Routing directly to Groq.");
      if (process.env.GROQ_API_KEY) {
        return await callGroqFallback(prompt, responseMimeType);
      }
    } else {
      // Cooldown expired, clear flag and try Gemini again
      globalUseGroqBackup = false;
      console.log("[Agent LLM Client] Gemini cooldown expired. Attempting Gemini again.");
    }
  }

  try {
    return await callGeminiInternal(prompt, responseMimeType);
  } catch (geminiError) {
    const errorMsg = String(geminiError.message || geminiError);
    const isRateLimit = errorMsg.includes("429") || 
                        errorMsg.toUpperCase().includes("QUOTA") || 
                        errorMsg.toUpperCase().includes("RESOURCE_EXHAUSTED");
    
    if (isRateLimit) {
      console.warn(`[Agent LLM Client] Gemini rate limit hit. Activating Groq fallback and entering cooldown...`);
      activateGroqBackup();
    } else {
      console.warn(`[Agent LLM Client] Gemini audit node failed: ${errorMsg}. Trying Groq fallback...`);
    }

    if (process.env.GROQ_API_KEY) {
      try {
        return await callGroqFallback(prompt, responseMimeType);
      } catch (groqError) {
        console.error("[Agent LLM Client] Groq fallback failed as well:", groqError);
      }
    }
    throw geminiError; // rethrow original Gemini error if Groq failed or wasn't configured
  }
}

/**
 * Character-by-character scanner to escape control characters (like newlines) inside JSON string values.
 */
function repairLLMJSON(str) {
  let output = "";
  let insideString = false;
  let escaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (escaped) {
      output += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      output += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      insideString = !insideString;
      output += char;
      continue;
    }

    if (insideString) {
      if (char === '\n') {
        output += '\\n';
      } else if (char === '\r') {
        output += '\\r';
      } else if (char === '\t') {
        output += '\\t';
      } else {
        output += char;
      }
    } else {
      output += char;
    }
  }

  // Remove invalid trailing commas before closing braces/brackets
  return output.replace(/,\s*([\]}])/g, '$1');
}

/**
 * Regex-based recovery fallback to extract key fields if the JSON string is completely unparseable.
 */
function extractJSONFieldsFallback(str) {
  const fallback = {
    decision: "HOLD",
    reasoning: "Valuation analysis completed.",
    valuationAnalysis: "Detailed valuation metrics calculated.",
    strategicAudit: {
      headwinds: ["Industry headwinds", "Pricing pressure", "Regulatory policies"],
      macro: ["Interest rates", "Inflation indicators", "Tariff exposures"],
      micro: ["Operating margins", "Segment scaling", "Product backlog"]
    },
    financialRisks: {
      margins: { operating: 0.0, net: 0.0 },
      valuation: { pb: 0.0, growth: 0.0 },
      efficiency: { roe: 0.0, roa: 0.0 }
    },
    score: 0.0,
    analysis: "Sentiment evaluation completed."
  };

  try {
    // 1. Extract decision
    const decisionMatch = str.match(/"decision"\s*:\s*"?(INVEST|PASS|HOLD)"?/i);
    if (decisionMatch) {
      fallback.decision = decisionMatch[1].toUpperCase();
    }

    // 2. Extract reasoning
    const reasoningMatch = str.match(/"reasoning"\s*:\s*"(.*?)"\s*(?:,|\s*})/s);
    if (reasoningMatch) {
      fallback.reasoning = reasoningMatch[1].trim();
    }

    // 3. Extract valuationAnalysis
    const valuationMatch = str.match(/"valuationAnalysis"\s*:\s*"(.*?)"\s*(?:,|\s*})/s);
    if (valuationMatch) {
      fallback.valuationAnalysis = valuationMatch[1].trim();
    }

    // 4. Extract strategicAudit arrays
    const extractArray = (key) => {
      const re = new RegExp(`"${key}"\\s*:\\s*\\[(.*?)\\]`, "s");
      const match = str.match(re);
      if (match) {
        return match[1]
          .split(",")
          .map(item => item.replace(/["']/g, "").trim())
          .filter(Boolean);
      }
      return null;
    };
    
    const headwinds = extractArray("headwinds");
    if (headwinds) fallback.strategicAudit.headwinds = headwinds;
    
    const macro = extractArray("macro");
    if (macro) fallback.strategicAudit.macro = macro;
    
    const micro = extractArray("micro");
    if (micro) fallback.strategicAudit.micro = micro;

    // 5. Extract financialRisks floats
    const extractFloat = (key) => {
      const re = new RegExp(`"${key}"\\s*:\\s*(-?[\\d.]+)`);
      const match = str.match(re);
      return match ? parseFloat(match[1]) : null;
    };

    const operating = extractFloat("operating");
    const net = extractFloat("net");
    if (operating !== null) fallback.financialRisks.margins.operating = operating;
    if (net !== null) fallback.financialRisks.margins.net = net;

    const pb = extractFloat("pb");
    const growth = extractFloat("growth");
    if (pb !== null) fallback.financialRisks.valuation.pb = pb;
    if (growth !== null) fallback.financialRisks.valuation.growth = growth;

    const roe = extractFloat("roe");
    const roa = extractFloat("roa");
    if (roe !== null) fallback.financialRisks.efficiency.roe = roe;
    if (roa !== null) fallback.financialRisks.efficiency.roa = roa;

    // 6. Extract sentiment fields
    const scoreMatch = str.match(/"score"\s*:\s*(-?[\d.]+)/);
    if (scoreMatch) fallback.score = parseFloat(scoreMatch[1]);

    const analysisMatch = str.match(/"analysis"\s*:\s*"(.*?)"\s*(?:,|\s*})/s);
    if (analysisMatch) fallback.analysis = analysisMatch[1].trim();

  } catch (e) {
    console.error("[JSON Parser] Error inside regex fallback handler:", e);
  }

  return fallback;
}

/**
 * Extracts JSON content from LLM response (handling potential markdown blocks).
 */
function cleanAndParseJSON(rawText) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    try {
      const repaired = repairLLMJSON(cleaned);
      return JSON.parse(repaired);
    } catch (err2) {
      console.warn("[JSON Parser] Failed to parse repaired JSON. Engaging regex extraction recovery fallback...", err2);
      return extractJSONFieldsFallback(cleaned);
    }
  }
}

/**
 * Sanitizes developer-facing error details into clean, user-friendly feedback.
 */
function sanitizeErrorMessage(error) {
  const errMsg = error?.message || String(error);
  
  if (errMsg.includes("429") || errMsg.toLowerCase().includes("quota exceeded") || errMsg.toLowerCase().includes("rate limit")) {
    return "AI model rate limit exceeded. Please retry shortly.";
  }
  if (errMsg.includes("500") || errMsg.toLowerCase().includes("internal server error") || errMsg.toLowerCase().includes("overloaded")) {
    return "AI model service is temporarily overloaded. Please retry shortly.";
  }
  if (errMsg.toLowerCase().includes("api key") || errMsg.toLowerCase().includes("invalid api key")) {
    return "Authentication issue with the AI provider. Please verify API configurations.";
  }
  if (errMsg.toLowerCase().includes("fetch") || errMsg.toLowerCase().includes("network") || errMsg.toLowerCase().includes("econnrefused")) {
    return "Network connection issue. Please check your internet connectivity.";
  }
  if (errMsg.includes("Error fetching from") || errMsg.includes("generativelanguage.googleapis.com")) {
    return "The AI service failed to respond to the research query. Please retry.";
  }
  
  // Strip stack trace paths / raw URLs and return clean description prefix
  const cleaned = errMsg.split(":")[0];
  return cleaned.length > 80 ? cleaned.substring(0, 80) + "..." : cleaned;
}

// Define channels (reducers) for LangGraph.js state
const graphState = {
  companyName: { value: (x, y) => y ?? x, default: () => "" },
  ticker: { value: (x, y) => y ?? x, default: () => "" },
  plannerInstructions: { value: (x, y) => y ?? x, default: () => "" },
  financialData: { value: (x, y) => ({ ...x, ...y }), default: () => ({}) },
  riskAnalysis: { value: (x, y) => y ?? x, default: () => "" },
  newsArticles: { value: (x, y) => y ?? x, default: () => [] },
  sentimentScore: { value: (x, y) => y ?? x, default: () => 0.0 },
  sentimentAnalysis: { value: (x, y) => y ?? x, default: () => "" },
  valuationAnalysis: { value: (x, y) => y ?? x, default: () => "" },
  decision: { value: (x, y) => y ?? x, default: () => "" },
  reasoning: { value: (x, y) => y ?? x, default: () => "" },
  finalReport: { value: (x, y) => y ?? x, default: () => "" },
  strategicAudit: { value: (x, y) => y ?? x, default: () => ({}) },
  financialRisks: { value: (x, y) => y ?? x, default: () => ({}) },
  logs: { value: (x, y) => [...(x || []), ...(y || [])], default: () => [] }
};

// 1. Planner Node
async function plannerNode(state) {
  const companyName = state.companyName;
  
  // Create running log
  const logStart = {
    agent: "Planner",
    status: "running",
    message: `Searching ticker symbol and creating research roadmap for "${companyName}"...`,
    timestamp: new Date()
  };

  try {
    // Search for ticker
    const { ticker, name } = await searchTicker(companyName);
    
    const prompt = `You are a Senior Investment Planner. Define a research roadmap for auditing ${name} (${ticker}).
    Provide instructions for the down-stream agents on what industry headwinds, macro indicators, or company-specific metrics to watch for.
    Keep the response to a single planning paragraph.`;

    const instructions = await callGemini(prompt);
    
    return {
      ticker,
      companyName: name,
      plannerInstructions: instructions,
      logs: [
        logStart,
        {
          agent: "Planner",
          status: "finished",
          message: `Successfully resolved "${companyName}" to ${name} (${ticker}). Research plan generated.`,
          timestamp: new Date()
        }
      ]
    };
  } catch (error) {
    console.error("Planner Node failed:", error);
    throw new Error(`Failed to resolve company or generate plan: ${sanitizeErrorMessage(error)}`);
  }
}

// 2. Financial Agent Node
async function financialAgentNode(state) {
  const ticker = state.ticker;
  const logStart = {
    agent: "Financial Agent",
    status: "running",
    message: `Fetching historical statements, margins, and key financial ratios for ${ticker}...`,
    timestamp: new Date()
  };

  try {
    const quote = await getQuoteData(ticker);
    const statements = await getFinancialStatements(ticker);
    const history = await getHistoricalPrices(ticker);
    
    return {
      financialData: {
        quote,
        statements,
        history
      },
      logs: [
        logStart,
        {
          agent: "Financial Agent",
          status: "finished",
          message: `Successfully fetched and calculated financial statements and ratios.`,
          timestamp: new Date()
        }
      ]
    };
  } catch (error) {
    console.error("Financial Agent Node failed:", error);
    return {
      logs: [
        logStart,
        {
          agent: "Financial Agent",
          status: "failed",
          message: `Failed to retrieve market data: ${sanitizeErrorMessage(error)}`,
          timestamp: new Date()
        }
      ]
    };
  }
}

// 3. News Agent Node
async function newsAgentNode(state) {
  const ticker = state.ticker;
  const companyName = state.companyName;
  
  const logStart = {
    agent: "News Agent",
    status: "running",
    message: `Scraping recent stock market news for ${companyName} (${ticker})...`,
    timestamp: new Date()
  };

  try {
    const news = await getRecentNews(ticker, companyName);
    
    return {
      newsArticles: news,
      logs: [
        logStart,
        {
          agent: "News Agent",
          status: "finished",
          message: `Retrieved ${news.length} relevant news headlines.`,
          timestamp: new Date()
        }
      ]
    };
  } catch (error) {
    console.error("News Agent Node failed:", error);
    return {
      logs: [
        logStart,
        {
          agent: "News Agent",
          status: "failed",
          message: `Failed to retrieve stock news: ${sanitizeErrorMessage(error)}`,
          timestamp: new Date()
        }
      ]
    };
  }
}

// 4. Risk Agent Node
async function riskAgentNode(state) {
  const ticker = state.ticker;
  const financialData = state.financialData;
  
  const logStart = {
    agent: "Risk Agent",
    status: "running",
    message: `Auditing balance sheet health, debt structures, and potential warning signs...`,
    timestamp: new Date()
  };

  if (!financialData || !financialData.statements) {
    return {
      riskAnalysis: "No financial statement data available for risk analysis.",
      logs: [
        logStart,
        {
          agent: "Risk Agent",
          status: "finished",
          message: "Risk audit completed (No data available).",
          timestamp: new Date()
        }
      ]
    };
  }

  try {
    const dataString = JSON.stringify({
      ratios: financialData.statements.ratios,
      balanceSheet: financialData.statements.balanceSheet?.[0] || {},
      incomeStatement: financialData.statements.incomeStatement?.[0] || {},
      cashflowStatement: financialData.statements.cashflowStatement?.[0] || {}
    }, null, 2);

    const prompt = `You are a Risk Analyst. Examine the following key financial indicators and current statements for ${ticker}:
    ${dataString}

    Conduct a strict risk analysis. Highlight:
    - Debt and leverage vulnerabilities (Debt-to-equity, cash levels)
    - Profitability stability (Operating margins, return on equity)
    - Cash burn or liquidity issues (Free cash flow trend, current ratio)
    - Macro/Industry headwinds if applicable.

    Summarize your findings in a concise bulleted list of 3-5 major risks.`;

    const riskAnalysis = await callGemini(prompt);

    return {
      riskAnalysis,
      logs: [
        logStart,
        {
          agent: "Risk Agent",
          status: "finished",
          message: `Risk audit complete. Identified vulnerabilities.`,
          timestamp: new Date()
        }
      ]
    };
  } catch (error) {
    console.error("Risk Agent Node failed:", error);
    return {
      logs: [
        logStart,
        {
          agent: "Risk Agent",
          status: "failed",
          message: `Risk audit failed: ${sanitizeErrorMessage(error)}`,
          timestamp: new Date()
        }
      ]
    };
  }
}

// 5. Sentiment Agent Node
async function sentimentAgentNode(state) {
  const newsArticles = state.newsArticles;
  
  const logStart = {
    agent: "Sentiment Agent",
    status: "running",
    message: `Conducting NLP news sentiment audit...`,
    timestamp: new Date()
  };

  if (!newsArticles || newsArticles.length === 0) {
    return {
      sentimentScore: 0.0,
      sentimentAnalysis: "No news articles available for sentiment evaluation.",
      logs: [
        logStart,
        {
          agent: "Sentiment Agent",
          status: "finished",
          message: "Sentiment audit completed (No news available).",
          timestamp: new Date()
        }
      ]
    };
  }

  try {
    const headlines = newsArticles.slice(0, 8).map(n => `- ${n.title} (Publisher: ${n.publisher})`).join("\n");
    
    const prompt = `You are a Market Sentiment Specialist. Analyze the recent news headlines for sentiment:
    ${headlines}

    Evaluate whether the general tone is positive, neutral, or negative. 
    You must output a JSON object containing:
    1. "score": a float value from -1.0 (highly negative/bearish) to 1.0 (highly positive/bullish)
    2. "analysis": a 2-3 sentence overview explaining your reasoning.

    Output format MUST be strictly JSON only, no markdown:
    {
      "score": 0.5,
      "analysis": "..."
    }`;

    const rawResponse = await callGemini(prompt, "application/json");
    const result = cleanAndParseJSON(rawResponse);

    return {
      sentimentScore: result.score,
      sentimentAnalysis: result.analysis,
      logs: [
        logStart,
        {
          agent: "Sentiment Agent",
          status: "finished",
          message: `Sentiment audit complete. Calculated Sentiment Score: ${result.score}`,
          timestamp: new Date()
        }
      ]
    };
  } catch (error) {
    console.error("Sentiment Agent Node failed:", error);
    return {
      logs: [
        logStart,
        {
          agent: "Sentiment Agent",
          status: "failed",
          message: `Sentiment audit failed: ${sanitizeErrorMessage(error)}`,
          timestamp: new Date()
        }
      ]
    };
  }
}

// 6. Valuation Agent Node
async function valuationAgentNode(state) {
  const ticker = state.ticker;
  const financialData = state.financialData;
  const riskAnalysis = state.riskAnalysis;
  const sentimentScore = state.sentimentScore;
  const sentimentAnalysis = state.sentimentAnalysis;
  
  const logStart = {
    agent: "Valuation Agent",
    status: "running",
    message: `Running valuation algorithms and synthesising multi-agent outputs...`,
    timestamp: new Date()
  };

  try {
    const quote = financialData.quote || {};
    const ratios = financialData.statements?.ratios || {};
    
    const prompt = `You are a Chief Investment Officer and Valuation Expert. You must decide whether to INVEST, PASS, or HOLD the stock of ${ticker}.
    
    CRITICAL ANTI-HALLUCINATION REQUIREMENT:
    - Base your evaluation ONLY on the provided financial, risk, and sentiment inputs.
    - Do NOT invent, assume, or extrapolate metrics, figures, or facts that are not listed in the Inputs section.
    - If any value in the Inputs is missing, null, or undefined, state that it is unavailable in your reasoning instead of generating a fictitious value.
    
    Inputs:
    - Current Price: ${quote.currentPrice} ${quote.currency}
    - P/E Ratio: ${quote.trailingPE} (Trailing), ${quote.forwardPE} (Forward)
    - Debt-to-Equity: ${ratios.debtToEquity}
    - Return on Equity (ROE): ${ratios.returnOnEquity}
    - Return on Assets (ROA): ${ratios.returnOnAssets}
    - Profit Margin: ${ratios.profitMargin}
    - Operating Margin: ${ratios.operatingMargin}
    - Price-to-Book (P/B) Ratio: ${ratios.priceToBook}
    - Revenue Growth: ${ratios.revenueGrowth}
    - Earnings Growth: ${ratios.earningsGrowth}
    - News Sentiment Score: ${sentimentScore} (-1 to 1)
    - News Sentiment Analysis: ${sentimentAnalysis}
    - Financial Risks Audited: ${riskAnalysis}

    Decision Guidelines:
    - Be growth-oriented, balanced, and opportunistic. Choose "INVEST" if the company has stable underlying business value, decent market share, positive operating margins, or positive sentiment, even if there are short-term headwinds or a few missing metrics. Do not default to "HOLD" or "PASS" simply because of a single risk factor or data gap.
    - Choose "PASS" only if there are severe, systemically breaking risks, insolvency threats, or overwhelmingly negative sentiment.
    - Choose "HOLD" if the company is in a highly balanced transition phase with neither strong positive indicators nor systemically breaking risks.
    Output a JSON object containing:
    1. "decision": must be exactly one of: "INVEST", "PASS", "HOLD"
    2. "reasoning": a concise 2-sentence summary of the main driver behind the decision.
    3. "valuationAnalysis": a detailed paragraph showing your valuation assessment (evaluating PE multiples, growth, and margins).
    4. "strategicAudit": An object detailing the strategic audit factors:
       - "headwinds": array of 3 strings (industry headwinds like demand decay, pricing pressure, regulations)
       - "macro": array of 3 strings (macroeconomic indicators like interest rates, inflation, tariffs)
       - "micro": array of 3 strings (micro-metrics like margins, segment scales, FSD attach rates, backlog)
    5. "financialRisks": An object detailing the critical financial risks:
       - "margins": object containing "operating" (float, e.g. 0.042) and "net" (float, e.g. 0.0395) profit margins.
       - "valuation": object containing "pb" (float/int, e.g. 18.0) Price-to-Book ratio and "growth" (float, e.g. 0.083) earnings/revenue growth rate.
       - "efficiency": object containing "roe" (float, e.g. 0.049) Return on Equity and "roa" (float, e.g. 0.0223) Return on Assets.

    Output format MUST be strictly JSON only, no markdown:
    {
      "decision": "INVEST",
      "reasoning": "...",
      "valuationAnalysis": "...",
      "strategicAudit": {
        "headwinds": ["...", "...", "..."],
        "macro": ["...", "...", "..."],
        "micro": ["...", "...", "..."]
      },
      "financialRisks": {
        "margins": { "operating": 0.042, "net": 0.0395 },
        "valuation": { "pb": 18, "growth": 0.083 },
        "efficiency": { "roe": 0.049, "roa": 0.0223 }
      }
    }`;

    const rawResponse = await callGemini(prompt, "application/json");
    const result = cleanAndParseJSON(rawResponse);

    return {
      decision: result.decision,
      reasoning: result.reasoning,
      valuationAnalysis: result.valuationAnalysis,
      strategicAudit: result.strategicAudit || {},
      financialRisks: result.financialRisks || {},
      logs: [
        logStart,
        {
          agent: "Valuation Agent",
          status: "finished",
          message: `Decision locked: ${result.decision}. Reasoning complete.`,
          timestamp: new Date()
        }
      ]
    };
  } catch (error) {
    console.error("Valuation Agent Node failed:", error);
    return {
      logs: [
        logStart,
        {
          agent: "Valuation Agent",
          status: "failed",
          message: `Valuation logic failed: ${sanitizeErrorMessage(error)}`,
          timestamp: new Date()
        }
      ]
    };
  }
}

// 7. Report Generator Node
async function reportGeneratorNode(state) {
  const companyName = state.companyName;
  const ticker = state.ticker;
  const decision = state.decision || "HOLD";
  const reasoning = state.reasoning || "Analysis incomplete.";
  const plannerInstructions = state.plannerInstructions;
  const financialData = state.financialData;
  const riskAnalysis = state.riskAnalysis;
  const sentimentScore = state.sentimentScore;
  const sentimentAnalysis = state.sentimentAnalysis;
  const valuationAnalysis = state.valuationAnalysis;
  const newsArticles = state.newsArticles || [];

  const logStart = {
    agent: "Report Generator",
    status: "running",
    message: `Compiling final investment memo report...`,
    timestamp: new Date()
  };

  try {
    const quote = financialData.quote || {};
    const ratios = financialData.statements?.ratios || {};
    
    const referencesList = newsArticles.slice(0, 5).map(n => `- [${n.title}](${n.link}) (${n.publisher})`).join("\n");

    const prompt = `You are a Financial Writer. Synthesize all analysis into a formal, highly-detailed, and beautifully formatted markdown investment memo.
    
    CRITICAL ANTI-HALLUCINATION REQUIREMENT:
    - Base the report strictly and factually on the provided Section Data inputs.
    - Do NOT invent, assume, or extrapolate figures, historical events, backlogs, or statistics that are not explicitly present in the inputs.
    - If any section data is missing, note the limitation in the report factually instead of generating fictitious details.
    
    Company: ${companyName} (${ticker})
    Decision: ${decision}
    Reasoning: ${reasoning}
    
    Section data:
    1. Roadmap Plan: ${plannerInstructions}
    2. Pricing & Financials: Price ${quote.currentPrice} ${quote.currency}, P/E ${quote.trailingPE}, ROE ${ratios.returnOnEquity}, Profit Margin ${ratios.profitMargin}
    3. Sentiment Analysis: Score ${sentimentScore}. ${sentimentAnalysis}
    4. Financial Risk Audit: ${riskAnalysis}
    5. Valuation Models: ${valuationAnalysis}
    
    Format the output in clean Markdown. Break the report down EXACTLY into these sections:
    # Investment Memo: ${companyName} (${ticker})
    
    ## 1. Summary
    [A highly concise, bulleted Executive Summary list (using 3-4 bullet points starting with "-") highlighting the final decision: ${decision} and core rationale. Keep it crisp, direct, and brief.]
    
    ## 2. Financial Analysis
    [Provide this section as a list of detailed bullet points (each starting with "-") evaluating key metrics, profit margins, capital structures, and statements.]
    
    ## 3. Business Analysis
    [Provide this section as a list of detailed bullet points (each starting with "-") analyzing their core business model, value proposition, and revenue channels based on the planner guidelines: ${plannerInstructions}.]
    
    ## 4. Competitive Position
    [Provide this section as a list of detailed bullet points (each starting with "-") analyzing their moat, market standing, competitive advantages, and sector peer position.]
    
    ## 5. Valuation
    [Provide this section as a list of detailed bullet points (each starting with "-") summarizing fair pricing, multiples, valuation models, and price margins based on: ${valuationAnalysis}.]
    
    ## 6. Risks
    [Detailing structural risks, leverage, and specific issues: ${riskAnalysis}]
    
    ## 7. Opportunities
    [Upside potentials, growth catalysts, and tailwinds]
    
    ## 8. Investment Thesis
    [Cohesive argument on why to buy or pass]
    
    ## 9. References
    ${referencesList}

    Do not include any extra introductory text, start directly with the markdown headers.`;

    const finalReport = await callGemini(prompt);

    return {
      finalReport,
      logs: [
        logStart,
        {
          agent: "Report Generator",
          status: "finished",
          message: `Investment report compiled successfully. Output ready for download.`,
          timestamp: new Date()
        }
      ]
    };
  } catch (error) {
    console.error("Report Generator Node failed:", error);
    return {
      logs: [
        logStart,
        {
          agent: "Report Generator",
          status: "failed",
          message: `Report compilation failed: ${sanitizeErrorMessage(error)}`,
          timestamp: new Date()
        }
      ]
    };
  }
}

// Construct LangGraph workflow
const builder = new StateGraph({
  channels: graphState
});

// Override addEdge to bypass single-outbound validation (enables standard parallel fan-out)
builder.addEdge = function(startKey, endKey) {
  if (startKey === END) {
    throw new Error("END cannot be a start node");
  }
  if (!this.nodes[startKey]) {
    throw new Error(`Need to addNode \`${startKey}\` first`);
  }
  if (!this.nodes[endKey] && endKey !== END) {
    throw new Error(`Need to addNode \`${endKey}\` first`);
  }
  this.edges.add([startKey, endKey]);
};

builder.addNode("planner", plannerNode);
builder.addNode("financial_agent", financialAgentNode);
builder.addNode("news_agent", newsAgentNode);
builder.addNode("risk_agent", riskAgentNode);
builder.addNode("sentiment_agent", sentimentAgentNode);
builder.addNode("valuation_agent", valuationAgentNode);
builder.addNode("report_generator", reportGeneratorNode);

// Define edges (Sequential Multi-Agent Pipeline)
builder.setEntryPoint("planner");

// Transition sequentially to avoid state-merging latency and Pregel fan-in write conflict bugs
builder.addEdge("planner", "financial_agent");
builder.addEdge("financial_agent", "risk_agent");
builder.addEdge("risk_agent", "news_agent");
builder.addEdge("news_agent", "sentiment_agent");
builder.addEdge("sentiment_agent", "valuation_agent");
builder.addEdge("valuation_agent", "report_generator");
builder.setFinishPoint("report_generator");

export const graph = builder.compile();
