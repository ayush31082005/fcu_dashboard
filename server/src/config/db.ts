import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'geetpay',
  waitForConnections: true,
  // Avoid overwhelming the remote shared-host MySQL server during UI polling.
  connectionLimit: 5,
  maxIdle: 5,
  idleTimeout: 60000,
  queueLimit: 0,
  connectTimeout: 15000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Test connection
pool.getConnection()
  .then((connection) => {
    console.log('Database connected successfully.');
    connection.release();
  })
  .catch((err: any) => {
    console.error('Error connecting to the database:', {
      code: err?.code || 'UNKNOWN_DB_ERROR',
      errno: err?.errno,
      message: err?.message || String(err),
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'geetpay',
    });
  });

export default pool;
