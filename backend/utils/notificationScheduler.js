import { GoogleGenerativeAI } from "@google/generative-ai";
import { query } from "../db.js";
import { getRecentNews } from "./finance.js";
import notificationQueue from "./notificationQueue.js";

// Initialize Gemini with the notifications-specific API Key
const apiKey = process.env.NOTIFICATIONS_GEMINI_KEY || process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);
const modelName = "gemini-3.5-flash"; 

/**
 * Helper to call Gemini model for notifications.
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

  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error(`Gemini Notification Summarizer failed for ${ticker}:`, error);
    return null;
  }
}

/**
 * Triggers a polling cycle across all uniquely bookmarked companies.
 */
export async function pollBookmarkedCompaniesNow() {
  console.log('[Notification Poller] Starting background crawl of bookmarked tickers...');
  
  try {
    // 1. Fetch all distinct bookmarked companies
    const bookmarksRes = await query(
      `SELECT DISTINCT ticker, company_name as "companyName" FROM bookmarked_companies`
    );

    const bookmarks = bookmarksRes.rows;
    console.log(`[Notification Poller] Found ${bookmarks.length} unique bookmarked tickers to scan.`);

    for (const bookmark of bookmarks) {
      const { ticker, companyName } = bookmark;
      console.log(`[Notification Poller] Scanning news for ${companyName} (${ticker})...`);

      // 2. Fetch recent news
      const news = await getRecentNews(ticker, companyName);
      
      // 3. Generate summary using the notification Gemini Key
      const summaryText = await generateSummary(ticker, companyName, news);
      
      if (!summaryText) {
        console.warn(`[Notification Poller] Skipped alert for ${ticker} due to Gemini summary generation failure.`);
        continue;
      }
      
      // 4. Fetch all users who bookmarked this company
      const usersRes = await query(
        `SELECT user_id FROM bookmarked_companies WHERE ticker = $1`,
        [ticker]
      );

      // 5. Push summary notification into their Redis-like queue
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
  // 4 hours in milliseconds = 14,400,000 ms
  const intervalMs = 4 * 60 * 60 * 1000;
  
  console.log(`[Notification Poller] Initializing background polling worker (Scanning every 4 hours)...`);
  
  // Run polling immediately on startup
  setTimeout(() => {
    pollBookmarkedCompaniesNow();
  }, 5000); // 5 seconds grace period after DB initialization
  
  setInterval(() => {
    pollBookmarkedCompaniesNow();
  }, intervalMs);
}
