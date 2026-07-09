import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './core/db.js';
import authRouter from './routes/auth.js';
import researchRouter from './services/auditor/routes/research.js';
import bookmarksRouter from './services/auditor/routes/bookmarks.js';
import notificationsRouter from './services/auditor/routes/notifications.js';
import chatRouter from './services/chat/routes/chat.js';
import { startNotificationScheduler } from './services/auditor/utils/notificationScheduler.js';

dotenv.config();

// Globally bypass self-signed SSL issues (common in proxy/development environments)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api', researchRouter);
app.use('/api', bookmarksRouter);
app.use('/api', notificationsRouter);
app.use('/api', chatRouter);

// Finnhub Real-time quotes proxy endpoint to bypass client-side SSL issues
app.get('/api/tickers/quotes', async (req, res) => {
  const apiKey = process.env.VITE_FINNHUB_API_KEY;
  console.log(apiKey);
  const symbols = ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'AMD', 'AMZN', 'GOOGL'];
  try {
    const quotes = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
          if (response.ok) {
            const data = await response.json();
            if (data.c) {
              const price = data.c.toFixed(2);
              const dp = data.dp || 0;
              const change = `${dp >= 0 ? '+' : ''}${dp.toFixed(2)}%`;
              const isUp = dp >= 0;
              return { ticker: symbol, price, change, isUp };
            }
          }
        } catch (e) {
          console.error(`Error fetching Finnhub quote for ${symbol} on backend:`, e.cause?.message || e.cause || e.message || e);
        }
        return null;
      })
    );
    res.json(quotes.filter(Boolean));
  } catch (error) {
    console.error('Error fetching quotes from Finnhub:', error);
    res.status(500).json({ error: 'Failed to fetch quotes.' });
  }
});

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI Investment Research API is healthy' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize PostgreSQL tables
    await initDb();

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      // Start background news polling scheduler
      startNotificationScheduler();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
