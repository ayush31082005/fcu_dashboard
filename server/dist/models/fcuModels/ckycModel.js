"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveCkycSearch = exports.findCaseForCkycSearch = void 0;
const db_1 = __importDefault(require("../../config/db"));
const findCaseForCkycSearch = async (applicationId) => {
    const [rows] = await db_1.default.query(`
    SELECT a.id AS application_id, a.user_id, u.mobile_number, pc.pan_number,
           up.dob, up.full_name
    FROM applications a
    INNER JOIN users u ON u.id = a.user_id
    LEFT JOIN pan_card_details pc ON pc.user_id = a.user_id
    LEFT JOIN user_profiles up ON up.user_id = a.user_id
    WHERE a.id = ? LIMIT 1
  `, [applicationId]);
    return rows[0] || null;
};
exports.findCaseForCkycSearch = findCaseForCkycSearch;
const saveCkycSearch = async (data) => db_1.default.query(`
  INSERT INTO fcu_ckyc_searches
    (application_id,user_id,pan_number,ckyc_number,ckyc_status,registered_on,
     issuer,proof_type,matching_status,request_id,message,api_response)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  ON DUPLICATE KEY UPDATE user_id=VALUES(user_id),pan_number=VALUES(pan_number),
    ckyc_number=VALUES(ckyc_number),ckyc_status=VALUES(ckyc_status),registered_on=VALUES(registered_on),
    issuer=VALUES(issuer),proof_type=VALUES(proof_type),matching_status=VALUES(matching_status),
    request_id=VALUES(request_id),message=VALUES(message),api_response=VALUES(api_response),updated_at=CURRENT_TIMESTAMP
`, [data.applicationId, data.userId, data.panNumber, data.ckycNumber, data.ckycStatus,
    data.registeredOn, data.issuer, data.proofType, data.matchingStatus, data.requestId,
    data.message, JSON.stringify(data.apiResponse)]);
exports.saveCkycSearch = saveCkycSearch;
