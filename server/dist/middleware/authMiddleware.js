"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMiddleware = (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            res.status(401).json({ status: 'error', message: 'Unauthorized - No token provided' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'GeetPaySuperSecureSecretKey2026!');
        req.user = decoded;
        // Inject userId into body and params for backward compatibility with existing controllers
        if (req.user && req.user.userId) {
            if (!req.body)
                req.body = {};
            req.body.userId = req.user.userId;
            if (!req.params)
                req.params = {};
            req.params.userId = req.user.userId.toString();
        }
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ status: 'error', message: 'Unauthorized - Invalid or expired token' });
    }
};
exports.authMiddleware = authMiddleware;
