import { StateGraph, START, END } from "@langchain/langgraph";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { searchTicker, getQuoteData, getFinancialStatements, getRecentNews, getHistoricalPrices } from "../utils/finance.js";

dotenv.config();

// Initialize API key rotation pool for agents
const apiKeys = [
  process.env.GEMINI_API_KEY,
  process.env.NOTIFICATIONS_GEMINI_KEY,
  process.env.NOTIFICATIONS_GEMINI_KEY_BACKUP_1,
  process.env.NOTIFICATIONS_GEMINI_KEY_BACKUP_2
].filter(key => !!key && key.trim() !== "");

let currentKeyIndex = 0;

// Initialize model fallback pool
const modelsPool = [
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro"
];
let currentModelIndex = 0;

/**
 * Helper to call Gemini model with automatic key rotation and model fallback on 429 rate limits.
 */
async function callGemini(prompt, responseMimeType = "text/plain") {
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
      const isRateLimit = errorMsg.includes("429") || 
                          errorMsg.toUpperCase().includes("RESOURCE_EXHAUSTED") ||
                          errorMsg.toUpperCase().includes("QUOTA") ||
                          (error.status && error.status === 429);

      if (isRateLimit) {
        console.warn(`[Agent LLM Client] Rate limit hit (429) using model ${modelToUse} at key index ${currentKeyIndex}. Attempting rotation...`);
        // Rotate key first
        currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
        
        // If we wrapped around keys, fallback to the next model in the pool
        if (currentKeyIndex === 0) {
          currentModelIndex = (currentModelIndex + 1) % modelsPool.length;
          console.warn(`[Agent LLM Client] All keys exhausted for ${modelToUse}. Falling back to next model: ${modelsPool[currentModelIndex]}`);
        }
      } else {
        // Non-rate limit errors fail immediately
        throw error;
      }
    }
  }

  throw lastError || new Error("AI rate limit retry loop failed.");
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
  return JSON.parse(cleaned.trim());
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
    return {
      logs: [
        logStart,
        {
          agent: "Planner",
          status: "failed",
          message: `Failed to resolve company or generate plan: ${sanitizeErrorMessage(error)}`,
          timestamp: new Date()
        }
      ]
    };
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
    
    Inputs:
    - Current Price: ${quote.currentPrice} ${quote.currency}
    - P/E Ratio: ${quote.trailingPE} (Trailing), ${quote.forwardPE} (Forward)
    - Debt-to-Equity: ${ratios.debtToEquity}
    - Return on Equity (ROE): ${ratios.returnOnEquity}
    - Profit Margin: ${ratios.profitMargin}
    - News Sentiment Score: ${sentimentScore} (-1 to 1)
    - News Sentiment Analysis: ${sentimentAnalysis}
    - Financial Risks Audited: ${riskAnalysis}

    Evaluate if the current pricing offers a margin of safety and potential upside.
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
    [A robust Executive Summary highlighting the final decision: ${decision} and core rationale]
    
    ## 2. Financial Analysis
    [Evaluation of key metrics, profit margins, capital structures, and statements]
    
    ## 3. Business Analysis
    [Analysis of their core business model and revenue channels based on the planner guidelines: ${plannerInstructions}]
    
    ## 4. Competitive Position
    [Analysis of their moat, market standing, and sector peer position]
    
    ## 5. Valuation
    [Summary of fair pricing, multiples, and price margins]
    
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

builder.addNode("planner", plannerNode);
builder.addNode("financial_agent", financialAgentNode);
builder.addNode("news_agent", newsAgentNode);
builder.addNode("risk_agent", riskAgentNode);
builder.addNode("sentiment_agent", sentimentAgentNode);
builder.addNode("valuation_agent", valuationAgentNode);
builder.addNode("report_generator", reportGeneratorNode);

// Define edges
builder.setEntryPoint("planner");
builder.addEdge("planner", "financial_agent");
builder.addEdge("financial_agent", "risk_agent");
builder.addEdge("risk_agent", "news_agent");
builder.addEdge("news_agent", "sentiment_agent");
builder.addEdge("sentiment_agent", "valuation_agent");
builder.addEdge("valuation_agent", "report_generator");
builder.setFinishPoint("report_generator");

export const graph = builder.compile();
