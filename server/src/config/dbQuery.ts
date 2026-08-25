import pool from './db';

const RETRYABLE_DB_ERRORS = new Set([
  'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST',
]);

export const dbQuery = async (sql: string, values?: any[]) => {
  return values ? await pool.query(sql, values) : await pool.query(sql);
};
