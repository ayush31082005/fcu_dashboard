"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Try loading .env from multiple probable locations on cPanel/Passenger
const envCandidates = [
    path_1.default.resolve(process.cwd(), '.env'),
    path_1.default.resolve(__dirname, '../../.env'),
    path_1.default.resolve(__dirname, '../.env'),
    path_1.default.resolve(__dirname, '.env'),
];
for (const envFile of envCandidates) {
    if (fs_1.default.existsSync(envFile)) {
        dotenv_1.default.config({ path: envFile });
        break;
    }
}
// Database connection pool with auto-healing and keep-alive
const dbHost = process.env.DB_HOST || '193.203.184.216';
const dbUser = process.env.DB_USER || 'u368199755_crmpaday';
const dbPassword = process.env.DB_PASSWORD || 'Support@@12345@@';
const dbName = process.env.DB_NAME || 'u368199755_crmpaday';
const dbPort = Number(process.env.DB_PORT || 3306);
const createRawPool = () => {
    return promise_1.default.createPool({
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
const executeWithRetry = async (fn, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
        try {
            return await fn(rawPool);
        }
        catch (err) {
            const code = String(err?.code || '');
            if (RETRYABLE_CODES.has(code) && attempt < maxRetries) {
                try {
                    rawPool = createRawPool();
                }
                catch (_) { }
                await new Promise(resolve => setTimeout(resolve, 80 * attempt));
                continue;
            }
            throw err;
        }
    }
};
const pool = {
    query: (...args) => executeWithRetry(p => p.query(...args)),
    execute: (...args) => executeWithRetry(p => p.execute(...args)),
    getConnection: () => rawPool.getConnection(),
};
exports.default = pool;
