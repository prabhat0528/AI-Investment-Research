import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Neon and hosted Postgres
  }
});

// Prevent unhandled pg-pool connection crashes on transient network drops
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message || err);
});

// Helper function to run a query
export const query = (text, params) => pool.query(text, params);

// Initialize DB tables
export const initDb = async () => {
  const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createReportsTableQuery = `
    CREATE TABLE IF NOT EXISTS research_reports (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      company_name VARCHAR(255) NOT NULL,
      ticker VARCHAR(20) NOT NULL,
      decision VARCHAR(10) NOT NULL CHECK (decision IN ('INVEST', 'PASS', 'HOLD')),
      reasoning TEXT NOT NULL,
      report_sections JSONB NOT NULL,
      logs JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createBookmarksTableQuery = `
    CREATE TABLE IF NOT EXISTS bookmarked_companies (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      ticker VARCHAR(20) NOT NULL,
      company_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, ticker)
    );
  `;

  try {
    console.log('Connecting to PostgreSQL database...');
    // Test connection
    const client = await pool.connect();
    console.log('PostgreSQL connected successfully.');
    
    console.log('Initializing tables...');
    await client.query(createUsersTableQuery);
    await client.query(createReportsTableQuery);
    await client.query(createBookmarksTableQuery);
    console.log('Database tables verified/created successfully.');
    
    client.release();
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

export default pool;
