import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// 1. GET /api/bookmarks - Get all bookmarks for the logged-in user
router.get('/bookmarks', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await query(
      `SELECT ticker, company_name as "companyName", created_at as "createdAt"
       FROM bookmarked_companies 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ error: 'Server error retrieving bookmarks.' });
  }
});

// 2. POST /api/bookmarks - Add a bookmarked company
router.post('/bookmarks', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { ticker, companyName } = req.body;

  if (!ticker || !companyName) {
    return res.status(400).json({ error: 'Ticker and companyName are required.' });
  }

  try {
    // Insert using ON CONFLICT DO NOTHING to ensure idempotence
    await query(
      `INSERT INTO bookmarked_companies (user_id, ticker, company_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, ticker) DO NOTHING`,
      [userId, ticker.toUpperCase().trim(), companyName.trim()]
    );

    res.status(201).json({ message: 'Company bookmarked successfully.', ticker });
  } catch (error) {
    console.error('Error adding bookmark:', error);
    res.status(500).json({ error: 'Server error saving bookmark.' });
  }
});

// 3. DELETE /api/bookmarks/:ticker - Remove a bookmarked company
router.delete('/bookmarks/:ticker', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { ticker } = req.params;

  if (!ticker) {
    return res.status(400).json({ error: 'Ticker is required.' });
  }

  try {
    const result = await query(
      `DELETE FROM bookmarked_companies 
       WHERE user_id = $1 AND ticker = $2
       RETURNING ticker`,
      [userId, ticker.toUpperCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bookmark not found.' });
    }

    res.json({ message: 'Company removed from bookmarks.', ticker });
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    res.status(500).json({ error: 'Server error removing bookmark.' });
  }
});

export default router;
