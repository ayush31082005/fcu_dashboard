import pool from '../../config/db';

export const findCaseForCkycSearch = async (applicationId: number) => {
  const [rows]: any = await pool.query(`
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

export const saveCkycSearch = async (data: {
  applicationId: number; userId: number; panNumber: string; ckycNumber: string | null;
  ckycStatus: string | null; registeredOn: string | null; issuer: string | null;
  proofType: string | null; matchingStatus: string | null; requestId: string | null;
  message: string | null; apiResponse: unknown;
}) => pool.query(`
  INSERT INTO fcu_ckyc_searches
    (application_id,user_id,pan_number,ckyc_number,ckyc_status,registered_on,
     issuer,proof_type,matching_status,request_id,message,api_response)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  ON DUPLICATE KEY UPDATE user_id=VALUES(user_id),pan_number=VALUES(pan_number),
    ckyc_number=VALUES(ckyc_number),ckyc_status=VALUES(ckyc_status),registered_on=VALUES(registered_on),
    issuer=VALUES(issuer),proof_type=VALUES(proof_type),matching_status=VALUES(matching_status),
    request_id=VALUES(request_id),message=VALUES(message),api_response=VALUES(api_response),updated_at=CURRENT_TIMESTAMP
`, [data.applicationId,data.userId,data.panNumber,data.ckycNumber,data.ckycStatus,
  data.registeredOn,data.issuer,data.proofType,data.matchingStatus,data.requestId,
  data.message,JSON.stringify(data.apiResponse)]);
