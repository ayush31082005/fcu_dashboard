import pool from '../../config/db';

export const findBankForPennyVerification = async (applicationId: number) => {
  const [rows]: any = await pool.query(`
    SELECT a.id AS application_id, a.user_id, u.mobile_number,
           bd.account_number, bd.ifsc_code, bd.account_holder_name
    FROM applications a
    INNER JOIN users u ON u.id = a.user_id
    LEFT JOIN bank_details bd ON bd.user_id = a.user_id
    WHERE a.id = ?
    LIMIT 1
  `, [applicationId]);
  return rows[0] || null;
};

export const saveBankPennyVerification = async (data: {
  applicationId: number; userId: number; accountNumber: string; ifscCode: string;
  httpResponseCode: number | null; requestId: string | null; resultCode: number | null;
  accountExists: boolean | null; nameAtBank: string | null; utr: string | null;
  amountDeposited: number | null; message: string | null; apiResponse: unknown;
}) => {
  await pool.query(`
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
