"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCustomerBankMatch = exports.saveMobileBankDetails = exports.findMobileForBankLookup = void 0;
const db_1 = __importDefault(require("../../config/db"));
const findMobileForBankLookup = async (applicationId) => {
    const [rows] = await db_1.default.query(`
    SELECT a.id AS application_id, a.user_id, u.mobile_number
    FROM applications a
    INNER JOIN users u ON u.id = a.user_id
    WHERE a.id = ?
    LIMIT 1
  `, [applicationId]);
    return rows[0] || null;
};
exports.findMobileForBankLookup = findMobileForBankLookup;
const saveMobileBankDetails = async (data) => {
    await db_1.default.query(`
    INSERT INTO fcu_mobile_bank_details
      (application_id, user_id, mobile_number, http_response_code, request_id,
       result_code, message, bank_account_data, api_response)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      user_id=VALUES(user_id), mobile_number=VALUES(mobile_number),
      http_response_code=VALUES(http_response_code), request_id=VALUES(request_id),
      result_code=VALUES(result_code), message=VALUES(message),
      bank_account_data=VALUES(bank_account_data), api_response=VALUES(api_response),
      updated_at=CURRENT_TIMESTAMP
  `, [data.applicationId, data.userId, data.mobileNumber, data.httpResponseCode,
        data.requestId, data.resultCode, data.message,
        JSON.stringify(data.bankAccountData), JSON.stringify(data.apiResponse)]);
};
exports.saveMobileBankDetails = saveMobileBankDetails;
const normalizeText = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const verifyCustomerBankMatch = async (userId, provider) => {
    const [rows] = await db_1.default.query(`SELECT account_holder_name, account_number, ifsc_code, bank_name
    FROM bank_details WHERE user_id = ? ORDER BY id DESC LIMIT 1`, [userId]);
    const bank = rows[0];
    if (!bank)
        return { verified: false, reason: 'Customer bank details not found', matches: {} };
    const matches = {
        accountHolderName: Boolean(normalizeText(bank.account_holder_name)) && normalizeText(bank.account_holder_name) === normalizeText(provider.name),
    };
    const verified = matches.accountHolderName;
    await db_1.default.query('UPDATE bank_details SET is_verified = ? WHERE user_id = ?', [verified ? 'Verified' : 'Not verified', userId]);
    return { verified, reason: verified ? 'Account holder name matched' : 'Account holder name did not match', matches };
};
exports.verifyCustomerBankMatch = verifyCustomerBankMatch;
