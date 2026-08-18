"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbQuery = void 0;
const db_1 = __importDefault(require("./db"));
const RETRYABLE_DB_ERRORS = new Set([
    'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST',
]);
const dbQuery = async (sql, values) => {
    let lastError;
    for (let attempt = 1; attempt <= 5; attempt += 1) {
        try {
            return values ? await db_1.default.query(sql, values) : await db_1.default.query(sql);
        }
        catch (error) {
            lastError = error;
            const code = String(error?.code || error?.errorno || '');
            if (!RETRYABLE_DB_ERRORS.has(code) || attempt === 5)
                throw error;
            const delayMs = Math.min(300 * (2 ** (attempt - 1)), 2500);
            console.warn(`Database connection interrupted (${code}); retry ${attempt}/5 in ${delayMs}ms.`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    throw lastError;
};
exports.dbQuery = dbQuery;
