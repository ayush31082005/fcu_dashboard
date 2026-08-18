"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.register = exports.login = void 0;
const db_1 = __importDefault(require("../config/db"));
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const hashString = (str) => {
    return crypto_1.default.createHash('sha256').update(str).digest('hex');
};
const login = async (req, res) => {
    try {
        const { email, password, secure_pin } = req.body;
        if (!email || !password || !secure_pin) {
            res.status(400).json({ status: 'error', message: 'email, password, and secure_pin are required' });
            return;
        }
        const hashedPassword = hashString(password);
        const hashedPin = hashString(secure_pin);
        const [rows] = await db_1.default.query('SELECT * FROM telecallers WHERE email = ? AND password = ? AND secure_pin = ? AND status = "active"', [email, hashedPassword, hashedPin]);
        if (rows.length === 0) {
            res.status(401).json({ status: 'error', message: 'Invalid credentials or inactive account' });
            return;
        }
        const telecaller = rows[0];
        const token = jsonwebtoken_1.default.sign({ id: telecaller.id, email: telecaller.email, role: 'telecaller' }, process.env.JWT_SECRET || 'GeetPaySuperSecureSecretKey2026!', { expiresIn: '8h' });
        res.cookie('telecaller_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 8 * 60 * 60 * 1000 // 8 hours
        });
        // Log the login event
        await db_1.default.query('INSERT INTO telecaller_logs (telecaller_id, action) VALUES (?, "login")', [telecaller.id]);
        res.status(200).json({
            status: 'success',
            message: 'Logged in successfully',
            data: {
                id: telecaller.id,
                name: telecaller.name,
                email: telecaller.email
            }
        });
    }
    catch (error) {
        console.error('Telecaller login error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to login' });
    }
};
exports.login = login;
const register = async (req, res) => {
    try {
        const { email, password, secure_pin, name } = req.body;
        if (!email || !password || !secure_pin || !name) {
            res.status(400).json({ status: 'error', message: 'All fields are required' });
            return;
        }
        const hashedPassword = hashString(password);
        const hashedPin = hashString(secure_pin);
        await db_1.default.query('INSERT INTO telecallers (email, password, secure_pin, name) VALUES (?, ?, ?, ?)', [email, hashedPassword, hashedPin, name]);
        res.status(201).json({
            status: 'success',
            message: 'Telecaller account created successfully'
        });
    }
    catch (error) {
        console.error('Telecaller register error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ status: 'error', message: 'Email already exists' });
        }
        else {
            res.status(500).json({ status: 'error', message: 'Failed to create telecaller' });
        }
    }
};
exports.register = register;
const logout = async (req, res) => {
    try {
        const telecallerId = req.telecaller?.id;
        if (telecallerId) {
            await db_1.default.query('INSERT INTO telecaller_logs (telecaller_id, action) VALUES (?, "logout")', [telecallerId]);
        }
        res.clearCookie('telecaller_token');
        res.status(200).json({ status: 'success', message: 'Logged out successfully' });
    }
    catch (error) {
        console.error('Telecaller logout error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to logout' });
    }
};
exports.logout = logout;
