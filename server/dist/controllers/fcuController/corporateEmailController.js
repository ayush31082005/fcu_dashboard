"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCorporateEmail = void 0;
const promises_1 = require("dns/promises");
const db_1 = __importDefault(require("../../config/db"));
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const verifyCorporateEmail = async (req, res) => {
    const applicationId = Number(req.params.caseId);
    if (!Number.isInteger(applicationId) || applicationId <= 0) {
        res.status(400).json({ status: 'error', message: 'Invalid application ID' });
        return;
    }
    try {
        const [rows] = await db_1.default.query(`
      SELECT a.user_id, ed.official_email
      FROM applications a
      LEFT JOIN employment_details ed ON ed.user_id = a.user_id
      WHERE a.id = ? LIMIT 1
    `, [applicationId]);
        if (!rows.length) {
            res.status(404).json({ status: 'error', message: 'Application not found' });
            return;
        }
        const email = String(rows[0].official_email || '').trim().toLowerCase();
        let isVerified = false;
        let reason = 'Corporate email is missing';
        let domain = '';
        if (emailPattern.test(email)) {
            domain = email.split('@')[1];
            try {
                const records = await (0, promises_1.resolveMx)(domain);
                isVerified = records.some(record => Boolean(record.exchange));
                reason = isVerified ? 'Email format and corporate mail domain are valid' : 'No mail server was found for this domain';
            }
            catch {
                reason = 'Corporate email domain does not have a reachable mail server';
            }
        }
        else if (email) {
            reason = 'Corporate email format is invalid';
        }
        await db_1.default.query(`
      INSERT INTO fcu_corporate_email_verifications
        (application_id, user_id, email, domain, is_verified, verification_reason, verified_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE email=VALUES(email), domain=VALUES(domain),
        is_verified=VALUES(is_verified), verification_reason=VALUES(verification_reason), verified_at=NOW()
    `, [applicationId, rows[0].user_id, email, domain, isVerified ? 1 : 0, reason]);
        res.json({ status: 'success', data: { email, isVerified, reason, verifiedAt: new Date().toISOString() } });
    }
    catch (error) {
        console.error('FCU corporate email verification error:', error);
        res.status(500).json({ status: 'error', message: 'Unable to verify corporate email' });
    }
};
exports.verifyCorporateEmail = verifyCorporateEmail;
