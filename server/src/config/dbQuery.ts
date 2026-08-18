import pool from './db';

const RETRYABLE_DB_ERRORS = new Set([
  'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST',
]);

export const dbQuery = async (sql: string, values?: any[]) => {
  let lastError: any;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      return values ? await pool.query(sql, values) : await pool.query(sql);
    } catch (error: any) {
      lastError = error;
      const code = String(error?.code || error?.errorno || '');
      if (!RETRYABLE_DB_ERRORS.has(code) || attempt === 5) throw error;
      const delayMs = Math.min(300 * (2 ** (attempt - 1)), 2500);
      console.warn(`Database connection interrupted (${code}); retry ${attempt}/5 in ${delayMs}ms.`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
};
