"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveMobileUpiDetails = exports.findMobileForUpiLookup = void 0;
const db_1 = __importDefault(require("../../config/db"));
const findMobileForUpiLookup = async (applicationId) => {
    const [rows] = await db_1.default.query(`
    SELECT a.id AS application_id, a.user_id, u.mobile_number
    FROM applications a
    INNER JOIN users u ON u.id = a.user_id
    WHERE a.id = ?
    LIMIT 1
  `, [applicationId]);
    return rows[0] || null;
};
exports.findMobileForUpiLookup = findMobileForUpiLookup;
const saveMobileUpiDetails = async (data) => {
    await db_1.default.query(`
    INSERT INTO fcu_mobile_upi_details
      (application_id, user_id, mobile_number, http_response_code, client_ref_num,
       request_id, result_code, mobile_linked_name, vpa, api_response)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      user_id=VALUES(user_id), mobile_number=VALUES(mobile_number),
      http_response_code=VALUES(http_response_code), client_ref_num=VALUES(client_ref_num),
      request_id=VALUES(request_id), result_code=VALUES(result_code),
      mobile_linked_name=VALUES(mobile_linked_name), vpa=VALUES(vpa),
      api_response=VALUES(api_response), updated_at=CURRENT_TIMESTAMP
  `, [data.applicationId, data.userId, data.mobileNumber, data.httpResponseCode,
        data.clientRefNum, data.requestId, data.resultCode, data.mobileLinkedName,
        data.vpa, JSON.stringify(data.apiResponse)]);
};
exports.saveMobileUpiDetails = saveMobileUpiDetails;
