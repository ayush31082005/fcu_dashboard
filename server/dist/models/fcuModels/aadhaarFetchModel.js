"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveAadhaarRelation = exports.saveAadhaarFetch = exports.findCaseForAadhaarFetch = void 0;
const db_1 = __importDefault(require("../../config/db"));
const findCaseForAadhaarFetch = async (applicationId) => {
    const [rows] = await db_1.default.query(`
    SELECT a.id AS application_id, a.user_id
    FROM applications a
    WHERE a.id = ? LIMIT 1
  `, [applicationId]);
    return rows[0] || null;
};
exports.findCaseForAadhaarFetch = findCaseForAadhaarFetch;
const saveAadhaarFetch = async (data) => {
    await db_1.default.query(`
    INSERT INTO fcu_aadhaar_fetches
      (application_id,user_id,aadhaar_number,pan_number,full_name,first_name,middle_name,last_name,dob,gender,address,address_line_2,
       city,state,pincode,country,linked_mobile,verification_status,request_id,photo,api_response)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE user_id=VALUES(user_id),aadhaar_number=VALUES(aadhaar_number),pan_number=VALUES(pan_number),
      full_name=VALUES(full_name),first_name=VALUES(first_name),middle_name=VALUES(middle_name),last_name=VALUES(last_name),
      dob=VALUES(dob),gender=VALUES(gender),address=VALUES(address),
      address_line_2=VALUES(address_line_2),city=VALUES(city),state=VALUES(state),
      pincode=VALUES(pincode),country=VALUES(country),linked_mobile=VALUES(linked_mobile),
      verification_status=VALUES(verification_status),request_id=VALUES(request_id),
      photo=VALUES(photo),api_response=VALUES(api_response),updated_at=CURRENT_TIMESTAMP
  `, [data.applicationId, data.userId, data.aadhaarNumber, data.panNumber, data.fullName, data.firstName, data.middleName, data.lastName, data.dob, data.gender,
        data.address, data.addressLine2, data.city, data.state, data.pincode, data.country,
        data.linkedMobile, data.status, data.requestId, data.photo, JSON.stringify(data.apiResponse)]);
};
exports.saveAadhaarFetch = saveAadhaarFetch;
const saveAadhaarRelation = async (applicationId, relation) => {
    const [result] = await db_1.default.query(`
    UPDATE fcu_aadhaar_fetches SET relation = ?, updated_at = CURRENT_TIMESTAMP
    WHERE application_id = ?
  `, [relation, applicationId]);
    return result.affectedRows > 0;
};
exports.saveAadhaarRelation = saveAadhaarRelation;
