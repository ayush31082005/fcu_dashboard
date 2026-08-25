"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveBankPennyVerification = exports.findBankForPennyVerification = void 0;
const db_1 = __importDefault(require("../../config/db"));
const findBankForPennyVerification = async (applicationId) => {
    const [rows] = await db_1.default.query(`
    SELECT a.id AS application_id, a.user_id, u.mobile_number,
           bd.account_number, bd.ifsc_code, bd.account_holder_name
    FROM applications a
    INNER JOIN users u ON u.id = a.user_id
    LEFT JOIN bank_details bd ON bd.user_id = a.user_id
    WHERE a.id = ?
    ORDER BY bd.id DESC
    LIMIT 1
  `, [applicationId]);
    return rows[0] || null;
};
exports.findBankForPennyVerification = findBankForPennyVerification;
const saveBankPennyVerification = async (data) => {
    await db_1.default.query(`
    INSERT INTO fcu_bank_penny_verifications
      (application_id, user_id, account_number, ifsc_code, http_response_code,
       request_id, result_code, account_exists, name_at_bank, utr,
       amount_deposited, message, api_response)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      user_id=VALUES(user_id), account_number=VALUES(account_number), ifsc_code=VALUES(ifsc_code),
      http_response_code=VALUES(http_response_code), request_id=VALUES(request_id),
      result_code=VALUES(result_code), account_exists=VALUES(account_exists),
      name_at_bank=VALUES(name_at_bank), utr=VALUES(utr), amount_deposited=VALUES(amount_deposited),
      message=VALUES(message), api_response=VALUES(api_response), updated_at=CURRENT_TIMESTAMP
  `, [data.applicationId, data.userId, data.accountNumber, data.ifscCode,
        data.httpResponseCode, data.requestId, data.resultCode, data.accountExists,
        data.nameAtBank, data.utr, data.amountDeposited, data.message,
        JSON.stringify(data.apiResponse)]);
};
exports.saveBankPennyVerification = saveBankPennyVerification;
