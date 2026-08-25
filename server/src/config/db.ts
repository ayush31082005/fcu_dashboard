import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try loading .env from multiple probable locations on cPanel/Passenger
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '.env'),
];

for (const envFile of envCandidates) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
    break;
  }
}

// Database connection pool with auto-healing and keep-alive
const dbHost = process.env.DB_HOST || '193.203.184.216';
const dbUser = process.env.DB_USER || 'u368199755_crmpaday';
const dbPassword = process.env.DB_PASSWORD || 'Support@@12345@@';
const dbName = process.env.DB_NAME || 'u368199755_crmpaday';
const dbPort = Number(process.env.DB_PORT || 3306);

const createRawPool = (): mysql.Pool => {
  return mysql.createPool({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 2,
    idleTimeout: 10000,
    queueLimit: 0,
    connectTimeout: 20000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 3000,
  });
};

let rawPool = createRawPool();

const RETRYABLE_CODES = new Set([
  'ECONNRESET',
  'PROTOCOL_CONNECTION_LOST',
  'ETIMEDOUT',
  'EPIPE',
  'ECONNREFUSED',
  'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
]);

const executeWithRetry = async (fn: (p: mysql.Pool) => Promise<any>, maxRetries = 3): Promise<any> => {
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      return await fn(rawPool);
    } catch (err: any) {
      const code = String(err?.code || '');
      if (RETRYABLE_CODES.has(code) && attempt < maxRetries) {
        try {
          rawPool = createRawPool();
        } catch (_) {}
        await new Promise(resolve => setTimeout(resolve, 80 * attempt));
        continue;
      }
      throw err;
    }
  }
};

const pool = {
  query: (...args: any[]): Promise<any> => executeWithRetry(p => (p.query as any)(...args)),
  execute: (...args: any[]): Promise<any> => executeWithRetry(p => (p.execute as any)(...args)),
  getConnection: (): Promise<mysql.PoolConnection> => rawPool.getConnection(),
};

export default pool as unknown as mysql.Pool;
