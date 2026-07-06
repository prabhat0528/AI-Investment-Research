import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const router = express.Router();

// JWT Secret Key from .env
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

// Middleware to authenticate JWT
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Access token required.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
};

// Signup Endpoint
router.post('/signup', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    // Check if user exists
    const checkUser = await query('SELECT * FROM users WHERE username = $1', [username]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user
    const result = await query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
      [username, hashedPassword]
    );

    const user = result.rows[0];
    
    // Create JWT
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: '7d'
    });

    res.status(201).json({
      message: 'User registered successfully.',
      token,
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Login Endpoint
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    // Fetch user
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    const user = result.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    // Create JWT
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: '7d'
    });

    res.json({
      message: 'Login successful.',
      token,
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

export default router;
