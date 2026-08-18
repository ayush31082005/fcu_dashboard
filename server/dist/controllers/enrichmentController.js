"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCibil = exports.verifyUan = exports.verifyAadhaar = exports.verifyPan = void 0;
const db_1 = __importDefault(require("../config/db"));
const bifrost_1 = require("../utils/bifrost");
const verifyPan = async (req, res) => {
    try {
        const { panNumber, userId } = req.body;
        const token = process.env.BIFROST_API_KEY;
        if (!token) {
            res.status(500).json({ status: 'error', message: 'Bifrost API key is not configured' });
            return;
        }
        if (!panNumber || !userId) {
            res.status(400).json({ status: 'error', message: 'panNumber and userId are required' });
            return;
        }
        // Call external API
        const apiResponse = await (0, bifrost_1.fetchPanDetails)(panNumber, token);
        // Save response to DB
        const query = `
      INSERT INTO pan_card_details (user_id, pan_number, pan_name, is_verified, api_response)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        pan_name = VALUES(pan_name),
        is_verified = VALUES(is_verified),
        api_response = VALUES(api_response),
        updated_at = CURRENT_TIMESTAMP
    `;
        // Adjust these depending on the exact structure of apiResponse
        const panName = apiResponse?.data?.result?.full_name || apiResponse?.data?.full_name || apiResponse?.full_name || '';
        if (apiResponse?.data?.errorMessage || !panName) {
            const errMsg = apiResponse?.data?.errorMessage || 'Invalid PAN number or unable to fetch details.';
            res.status(400).json({ status: 'error', message: errMsg });
            return;
        }
        const isVerified = true;
        await db_1.default.query(query, [userId, panNumber, panName, isVerified, JSON.stringify(apiResponse)]);
        res.status(200).json({ status: 'success', data: apiResponse });
    }
    catch (error) {
        console.error('verifyPan error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to verify PAN details', error: error?.message });
    }
};
exports.verifyPan = verifyPan;
const verifyAadhaar = async (req, res) => {
    try {
        const { aadhaarNumber, userId, apiResponse } = req.body; // Assuming verification is done elsewhere or we pass dummy data for now
        if (!aadhaarNumber || !userId) {
            res.status(400).json({ status: 'error', message: 'aadhaarNumber and userId are required' });
            return;
        }
        const query = `
      INSERT INTO aadhaar_card_details (user_id, aadhaar_number, is_verified, api_response)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        is_verified = VALUES(is_verified),
        api_response = VALUES(api_response),
        updated_at = CURRENT_TIMESTAMP
    `;
        await db_1.default.query(query, [userId, aadhaarNumber, true, JSON.stringify(apiResponse || {})]);
        res.status(200).json({ status: 'success', message: 'Aadhaar saved successfully' });
    }
    catch (error) {
        console.error('verifyAadhaar error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to save Aadhaar details', error: error?.message });
    }
};
exports.verifyAadhaar = verifyAadhaar;
const verifyUan = async (req, res) => {
    try {
        const { mobileNumber, userId } = req.body;
        const token = process.env.BIFROST_API_KEY;
        if (!token) {
            res.status(500).json({ status: 'error', message: 'Bifrost API key is not configured' });
            return;
        }
        if (!mobileNumber || !userId) {
            res.status(400).json({ status: 'error', message: 'mobileNumber and userId are required' });
            return;
        }
        // Call external API
        const apiResponse = await (0, bifrost_1.fetchUanDetails)(mobileNumber, token);
        // Save response to DB
        const query = `
      INSERT INTO uan_details (user_id, uan, employer_name, is_verified, api_response)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        employer_name = VALUES(employer_name),
        is_verified = VALUES(is_verified),
        api_response = VALUES(api_response),
        updated_at = CURRENT_TIMESTAMP
    `;
        // Adjust these depending on the exact structure of apiResponse
        const uan = apiResponse?.data?.result?.uanNumber || apiResponse?.data?.uan || apiResponse?.uan || '';
        const employerName = apiResponse?.data?.result?.employerName || apiResponse?.data?.employer_name || apiResponse?.employer_name || '';
        const isVerified = !apiResponse?.error && !!uan;
        await db_1.default.query(query, [userId, uan, employerName, isVerified, JSON.stringify(apiResponse)]);
        res.status(200).json({ status: 'success', data: apiResponse });
    }
    catch (error) {
        console.error('verifyUan error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to verify UAN details', error: error?.message });
    }
};
exports.verifyUan = verifyUan;
const verifyCibil = async (req, res) => {
    try {
        const { panNumber, mobileNumber, fullName, userId } = req.body;
        const token = process.env.BIFROST_API_KEY;
        if (!token) {
            res.status(500).json({ status: 'error', message: 'Bifrost API key is not configured' });
            return;
        }
        if (!panNumber || !mobileNumber || !fullName || !userId) {
            res.status(400).json({ status: 'error', message: 'panNumber, mobileNumber, fullName, and userId are required' });
            return;
        }
        // Call external API
        const apiResponse = await (0, bifrost_1.fetchCibilReport)(panNumber, mobileNumber, fullName, token);
        // Save response to DB
        const query = `
      INSERT INTO credit_report_details (user_id, cibil_score, total_accounts, active_accounts, api_response)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        cibil_score = VALUES(cibil_score),
        total_accounts = VALUES(total_accounts),
        active_accounts = VALUES(active_accounts),
        api_response = VALUES(api_response),
        updated_at = CURRENT_TIMESTAMP
    `;
        // Adjust these depending on the exact structure of apiResponse
        const cibilScore = apiResponse?.data?.score || apiResponse?.score || null;
        const totalAccounts = apiResponse?.data?.total_accounts || null;
        const activeAccounts = apiResponse?.data?.active_accounts || null;
        await db_1.default.query(query, [userId, cibilScore, totalAccounts, activeAccounts, JSON.stringify(apiResponse)]);
        res.status(200).json({ status: 'success', data: apiResponse });
    }
    catch (error) {
        console.error('verifyCibil error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch CIBIL report', error: error?.message });
    }
};
exports.verifyCibil = verifyCibil;
