import express from 'express';
import { authenticateToken } from './auth.js';
import notificationQueue from '../utils/notificationQueue.js';
import { pollBookmarkedCompaniesNow } from '../utils/notificationScheduler.js';

const router = express.Router();

// 1. GET /api/notifications - Fetch all active notifications for the logged-in user
router.get('/notifications', authenticateToken, (req, res) => {
  const userId = req.user.id;
  try {
    const activeNotifications = notificationQueue.getAll(userId);
    res.json(activeNotifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Server error retrieving notifications.' });
  }
});

// 2. POST /api/notifications/poll-now - Force trigger polling cycle (debug helper)
router.post('/notifications/poll-now', authenticateToken, async (req, res) => {
  try {
    // Run async to avoid blocking HTTP response
    pollBookmarkedCompaniesNow();
    res.json({ message: 'Crawl and summarization polling job triggered successfully.' });
  } catch (error) {
    console.error('Error triggering manual poll:', error);
    res.status(500).json({ error: 'Server error starting poll job.' });
  }
});

export default router;
