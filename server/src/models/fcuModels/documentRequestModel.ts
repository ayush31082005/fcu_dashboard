import pool from '../../config/db';
import { dbQuery } from '../../config/dbQuery';

export const findDocumentRequestRecipient = async (applicationId: number) => {
  const [rows]: any = await dbQuery(`
    SELECT u.mobile_number AS mobile, COALESCE(up.full_name, 'Customer') AS name
    FROM applications a
    INNER JOIN users u ON u.id = a.user_id
    LEFT JOIN user_profiles up ON up.user_id = u.id
    WHERE a.id = ? LIMIT 1
  `, [applicationId]);
  return rows[0] || null;
};

export const findDocumentRequestByApplication = async (applicationId: number) => {
  const [rows]: any = await dbQuery(`
    SELECT r.id, r.application_id, r.token, r.status, r.expires_at, r.created_at,
      (r.expires_at <= NOW()) AS is_expired,
      JSON_ARRAYAGG(JSON_OBJECT('id', d.id, 'documentName', d.document_name, 'status', d.status,
        'fileName', d.file_name, 'filePath', d.file_path, 'uploadedAt', d.uploaded_at)) AS documents
    FROM fcu_document_requests r
    LEFT JOIN fcu_requested_documents d ON d.request_id = r.id
    WHERE r.application_id = ?
    GROUP BY r.id
    ORDER BY r.id DESC LIMIT 1
  `, [applicationId]);
  return rows[0] || null;
};

export const findDocumentRequestByToken = async (token: string) => {
  const [rows]: any = await dbQuery(`
    SELECT r.id, r.application_id, r.token, r.status, r.expires_at, r.created_at,
      COALESCE(NULLIF(u.lead_number, ''), CONCAT('GP-LEAD-', LPAD(a.id, 4, '0'))) AS leadId,
      COALESCE(NULLIF(up.full_name, ''), 'Customer') AS customerName,
      (r.expires_at <= NOW()) AS is_expired,
      JSON_ARRAYAGG(JSON_OBJECT('id', d.id, 'documentName', d.document_name, 'status', d.status,
        'fileName', d.file_name, 'filePath', d.file_path, 'uploadedAt', d.uploaded_at)) AS documents
    FROM fcu_document_requests r
    INNER JOIN applications a ON a.id = r.application_id
    INNER JOIN users u ON u.id = a.user_id
    LEFT JOIN user_profiles up ON up.user_id = u.id
    LEFT JOIN fcu_requested_documents d ON d.request_id = r.id
    WHERE r.token = ?
    GROUP BY r.id, u.lead_number, up.full_name LIMIT 1
  `, [token]);
  return rows[0] || null;
};

export const hasIncompleteDocumentRequest = async (applicationId: number) => {
  const [rows]: any = await dbQuery(`
    SELECT r.status,
      SUM(CASE WHEN d.status = 'PENDING' THEN 1 ELSE 0 END) AS pending_count,
      COUNT(d.id) AS total_count
    FROM fcu_document_requests r
    LEFT JOIN fcu_requested_documents d ON d.request_id = r.id
    WHERE r.application_id = ?
    GROUP BY r.id
    ORDER BY r.id DESC LIMIT 1
  `, [applicationId]);
  // A decision is blocked until a document request exists and every requested
  // document has been uploaded. "No request" is not treated as completion.
  if (!rows.length || Number(rows[0].total_count) === 0) return true;
  return rows[0].status !== 'COMPLETED' || Number(rows[0].pending_count) > 0;
};

export const createDocumentRequestRecord = async (applicationId: number, token: string, userId: number, documents: string[]) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [applications]: any = await connection.query('SELECT id FROM applications WHERE id = ? FOR UPDATE', [applicationId]);
    if (!applications.length) {
      const error: any = new Error('Application no longer exists in the database. Refresh the Applications page.');
      error.code = 'APPLICATION_NOT_FOUND';
      throw error;
    }
    await connection.query("UPDATE fcu_document_requests SET status='CLOSED' WHERE application_id=? AND status='ACTIVE'", [applicationId]);
    const [result]: any = await connection.query(`
      INSERT INTO fcu_document_requests (application_id, token, status, expires_at, created_by)
      VALUES (?, ?, 'ACTIVE', DATE_ADD(NOW(), INTERVAL 7 DAY), ?)
    `, [applicationId, token, userId]);
    for (const documentName of documents) {
      await connection.query('INSERT INTO fcu_requested_documents (request_id, document_name) VALUES (?, ?)', [result.insertId, documentName]);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const saveRequestedDocumentUpload = async (token: string, documentId: number, fileName: string, filePath: string) => {
  const [result]: any = await dbQuery(`
    UPDATE fcu_requested_documents d
    INNER JOIN fcu_document_requests r ON r.id=d.request_id
    SET d.status='UPLOADED', d.file_name=?, d.file_path=?, d.uploaded_at=NOW()
    WHERE d.id=? AND r.token=? AND r.status='ACTIVE' AND r.expires_at > NOW()
  `, [fileName, filePath, documentId, token]);
  if (!result.affectedRows) return false;
  await dbQuery(`
    UPDATE fcu_document_requests r SET r.status='COMPLETED'
    WHERE r.token=? AND NOT EXISTS (
      SELECT 1 FROM fcu_requested_documents d WHERE d.request_id=r.id AND d.status='PENDING'
    )
  `, [token]);
  return true;
};
