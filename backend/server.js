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
