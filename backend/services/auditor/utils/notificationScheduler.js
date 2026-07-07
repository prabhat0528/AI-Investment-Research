import { GoogleGenerativeAI } from "@google/generative-ai";
import { query } from "../../../core/db.js";
import { getRecentNews } from "../../../core/finance.js";
import notificationQueue from "./notificationQueue.js";

// Initialize API key rotation pool for notifications
const apiKeys = [
  process.env.NOTIFICATIONS_GEMINI_KEY,
  process.env.NOTIFICATIONS_GEMINI_KEY_BACKUP_1,
  process.env.NOTIFICATIONS_GEMINI_KEY_BACKUP_2,
  process.env.GEMINI_API_KEY
].filter(key => !!key && key.trim() !== "");

let currentKeyIndex = 0;
const modelName = "gemini-3.5-flash"; 

/**
 * Helper to call Gemini model for notifications. Supports fallback key rotation on 429 quota errors.
 */
async function generateSummary(ticker, companyName, headlines) {
  if (!headlines || headlines.length === 0) {
    return `No recent news articles were found for ${companyName} (${ticker}) in the last 4 hours. Market indicators remain unchanged.`;
  }

  const headlinesList = headlines.slice(0, 5).map(h => `- ${h.title} (${h.publisher})`).join("\n");
  const prompt = `You are a Stock Market Intelligence Assistant.
  You are given the following recent news headlines for ${companyName} (${ticker}):
  ${headlinesList}

  Synthesize these headlines into a concise, 2-sentence summary highlighting the most critical recent events, sentiments, or risks affecting the company.
  Output only the 2-sentence summary. Do not add intro/outro headers. Keep it professional, crisp, and direct.`;

  if (apiKeys.length === 0) {
    console.error("[Notification Poller] No Gemini API Keys configured in pool!");
    return null;
  }

  const maxRetries = apiKeys.length;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const keyToUse = apiKeys[currentKeyIndex];
    
    try {
      const client = new GoogleGenerativeAI(keyToUse);
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      const errorMsg = String(error.message || error);
      const isRateLimit = errorMsg.includes("429") || 
                          errorMsg.toUpperCase().includes("RESOURCE_EXHAUSTED") ||
                          errorMsg.toUpperCase().includes("QUOTA") ||
                          (error.status && error.status === 429);

      if (isRateLimit && apiKeys.length > 1) {
        console.warn(`[Notification Poller] Gemini API key index ${currentKeyIndex} hit a rate limit (429). Attempting failover to backup key...`);
        currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
        console.log(`[Notification Poller] Rotated to API key index ${currentKeyIndex}. Retrying request...`);
      } else {
        console.error(`Gemini Notification Summarizer failed for ${ticker}:`, error);
        return null;
      }
    }
  }

  return null;
}

/**
 * Triggers a polling cycle across all uniquely bookmarked companies.
 */
export async function pollBookmarkedCompaniesNow() {
  console.log('[Notification Poller] Starting background crawl of bookmarked tickers...');
  
  try {
    const bookmarksRes = await query(
      `SELECT DISTINCT ticker, company_name as "companyName" FROM bookmarked_companies`
    );

    const bookmarks = bookmarksRes.rows;
    console.log(`[Notification Poller] Found ${bookmarks.length} unique bookmarked tickers to scan.`);

    for (const bookmark of bookmarks) {
      const { ticker, companyName } = bookmark;
      console.log(`[Notification Poller] Scanning news for ${companyName} (${ticker})...`);

      const news = await getRecentNews(ticker, companyName);
      const summaryText = await generateSummary(ticker, companyName, news);
      
      if (!summaryText) {
        console.warn(`[Notification Poller] Skipped alert for ${ticker} due to Gemini summary generation failure.`);
        continue;
      }
      
      const usersRes = await query(
        `SELECT user_id FROM bookmarked_companies WHERE ticker = $1`,
        [ticker]
      );

      usersRes.rows.forEach(row => {
        notificationQueue.push(row.user_id, {
          ticker,
          companyName,
          title: `Market Summary: ${ticker}`,
          message: summaryText
        });
      });

      console.log(`[Notification Poller] Dispatched alert for ${ticker} to ${usersRes.rows.length} user queues.`);
    }

    console.log('[Notification Poller] Background crawl cycle complete.');
  } catch (error) {
    console.error('[Notification Poller] Critical failure in polling loop:', error);
  }
}

/**
 * Starts the 4-hour background scheduler.
 */
export function startNotificationScheduler() {
  const intervalMs = 4 * 60 * 60 * 1000;
  
  console.log(`[Notification Poller] Initializing background polling worker (Scanning every 4 hours)...`);
  
  setTimeout(() => {
    pollBookmarkedCompaniesNow();
  }, 5000); // 5 seconds grace period after DB initialization
  
  setInterval(() => {
    pollBookmarkedCompaniesNow();
  }, intervalMs);
}
