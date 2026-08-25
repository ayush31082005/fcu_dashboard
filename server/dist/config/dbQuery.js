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
    return values ? await db_1.default.query(sql, values) : await db_1.default.query(sql);
};
exports.dbQuery = dbQuery;
