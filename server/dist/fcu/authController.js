"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.me = exports.login = exports.register = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../config/db"));
const COOKIE_NAME = 'fcu_token';
const JWT_SECRET = process.env.JWT_SECRET || 'GeetPaySuperSecureSecretKey2026!';
const hashPassword = (password, salt = crypto_1.default.randomBytes(16).toString('hex')) => {
    const hash = crypto_1.default.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
};
const verifyPassword = (password, storedHash) => {
    const [salt, savedHash] = storedHash.split(':');
    if (!salt || !savedHash)
        return false;
    const candidate = crypto_1.default.scryptSync(password, salt, 64);
    const saved = Buffer.from(savedHash, 'hex');
    return candidate.length === saved.length && crypto_1.default.timingSafeEqual(candidate, saved);
};
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,
};
const register = async (req, res) => {
    try {
        const { name, email, password, role = 'FCU Officer' } = req.body;
        if (!name || !email || !password) {
            res.status(400).json({ status: 'error', message: 'name, email and password are required' });
            return;
        }
        if (String(password).length < 8) {
            res.status(400).json({ status: 'error', message: 'Password must be at least 8 characters' });
            return;
        }
        const normalizedEmail = String(email).trim().toLowerCase();
        await db_1.default.query('INSERT INTO fcu_users (name, email, password, role) VALUES (?, ?, ?, ?)', [String(name).trim(), normalizedEmail, hashPassword(String(password)), String(role).trim()]);
        res.status(201).json({ status: 'success', message: 'FCU user registered successfully' });
    }
    catch (error) {
        if (error?.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ status: 'error', message: 'Email is already registered' });
            return;
        }
        console.error('FCU register error:', error);
        res.status(500).json({ status: 'error', message: 'Unable to register FCU user' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ status: 'error', message: 'Email and password are required' });
            return;
        }
        const [rows] = await db_1.default.query('SELECT id, name, email, password, role, status FROM fcu_users WHERE email = ? LIMIT 1', [String(email).trim().toLowerCase()]);
        const user = rows[0];
        if (!user || user.status !== 'active' || !verifyPassword(String(password), user.password)) {
            res.status(401).json({ status: 'error', message: 'Invalid email or password' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, name: user.name, email: user.email, role: user.role, type: 'fcu' }, JWT_SECRET, { expiresIn: '8h' });
        res.cookie(COOKIE_NAME, token, cookieOptions);
        await db_1.default.query('UPDATE fcu_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
        res.json({
            status: 'success',
            message: 'Login successful',
            data: { id: user.id, name: user.name, email: user.email, role: user.role },
        });
    }
    catch (error) {
        console.error('FCU login error:', error);
        res.status(500).json({ status: 'error', message: 'Unable to login' });
    }
};
exports.login = login;
const me = async (req, res) => {
    const user = req.fcuUser;
    res.json({ status: 'success', data: user });
};
exports.me = me;
const logout = async (_req, res) => {
    res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
    res.json({ status: 'success', message: 'Logged out successfully' });
};
exports.logout = logout;
