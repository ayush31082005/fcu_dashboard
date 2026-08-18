"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireTelecallerAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const requireTelecallerAuth = (req, res, next) => {
    try {
        const token = req.cookies.telecaller_token || req.headers.authorization?.split(' ')[1];
        if (!token) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'GeetPaySuperSecureSecretKey2026!');
        if (decoded.role !== 'telecaller') {
            res.status(403).json({ status: 'error', message: 'Access denied: Telecaller only' });
            return;
        }
        // Attach telecaller to request object
        req.telecaller = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
    }
};
exports.requireTelecallerAuth = requireTelecallerAuth;
