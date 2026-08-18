"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireFcuAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const requireFcuAuth = (req, res, next) => {
    try {
        const token = req.cookies.fcu_token;
        if (!token) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'GeetPaySuperSecureSecretKey2026!');
        if (decoded.type !== 'fcu') {
            res.status(403).json({ status: 'error', message: 'FCU access required' });
            return;
        }
        req.fcuUser = { id: decoded.id, name: decoded.name, email: decoded.email, role: decoded.role, issuedAt: decoded.iat };
        next();
    }
    catch {
        res.status(401).json({ status: 'error', message: 'Invalid or expired session' });
    }
};
exports.requireFcuAuth = requireFcuAuth;
