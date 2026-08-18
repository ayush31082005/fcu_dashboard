import pool from '../../config/db';

export const findMobileForUpiLookup = async (applicationId: number) => {
  const [rows]: any = await pool.query(`
    SELECT a.id AS application_id, a.user_id, u.mobile_number
    FROM applications a
    INNER JOIN users u ON u.id = a.user_id
    WHERE a.id = ?
    LIMIT 1
  `, [applicationId]);
  return rows[0] || null;
};

export const saveMobileUpiDetails = async (data: {
  applicationId: number; userId: number; mobileNumber: string;
  httpResponseCode: number | null; clientRefNum: string | null;
  requestId: string | null; resultCode: number | null;
  mobileLinkedName: string | null; vpa: string | null; apiResponse: unknown;
}) => {
  await pool.query(`
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
