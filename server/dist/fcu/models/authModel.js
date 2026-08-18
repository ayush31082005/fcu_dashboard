"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLastLogin = exports.findFcuUserByEmail = exports.createFcuUser = void 0;
const db_1 = __importDefault(require("../../config/db"));
const createFcuUser = async (name, email, password, role) => {
    return db_1.default.query('INSERT INTO fcu_users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, password, role]);
};
exports.createFcuUser = createFcuUser;
const findFcuUserByEmail = async (email) => {
    const [rows] = await db_1.default.query('SELECT id, name, email, password, role, status FROM fcu_users WHERE email = ? LIMIT 1', [email]);
    return rows[0] || null;
};
exports.findFcuUserByEmail = findFcuUserByEmail;
const updateLastLogin = async (userId) => {
    return db_1.default.query('UPDATE fcu_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
};
exports.updateLastLogin = updateLastLogin;
