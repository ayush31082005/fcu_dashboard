import { dbQuery } from '../../config/dbQuery';

export const getNotifications = async (fcuUserId: number, limit = 20) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const [rows]: any = await dbQuery(`SELECT * FROM (
    SELECT CONCAT('application-', a.id) AS id, 'NEW_APPLICATION' AS type,
      a.id AS applicationId, CONCAT('APP', LPAD(a.id, 7, '0')) AS applicationNumber,
      COALESCE(up.full_name, CONCAT('Customer ', a.user_id)) AS borrower,
      a.created_at AS createdAt, (nr.read_at IS NOT NULL) AS isRead,
      'New application received' AS title,
      CONCAT(COALESCE(up.full_name, CONCAT('Customer ', a.user_id)), ' applied for INR ', FORMAT(COALESCE(a.loan_amount, 0), 0)) AS message
    FROM applications a
    LEFT JOIN user_profiles up ON up.user_id = a.user_id
    LEFT JOIN fcu_notification_reads nr ON nr.application_id = a.id AND nr.fcu_user_id = ?
    WHERE (
      LOWER(TRIM(REPLACE(COALESCE(a.status, ''), '_', ' '))) IN ('send to fcu', 'sent to fcu')
      OR EXISTS (
        SELECT 1 FROM leads ld 
        WHERE (ld.user_id = a.user_id OR ld.lead_id = (SELECT lead_number FROM users WHERE id = a.user_id) OR ld.lead_id = (SELECT lead_reference_number FROM users WHERE id = a.user_id))
          AND LOWER(TRIM(REPLACE(COALESCE(ld.status, ''), '_', ' '))) IN ('send to fcu', 'sent to fcu')
      )
      OR EXISTS (
        SELECT 1 FROM application_logs al 
        WHERE al.user_id = a.user_id 
          AND UPPER(REPLACE(TRIM(COALESCE(al.status, '')), '_', ' ')) = 'SENT TO FCU'
      )
    )
    UNION ALL
    SELECT CONCAT('field-report-', fvr.id), 'FIELD_REPORT_SUBMITTED',
      a.id, CONCAT('APP', LPAD(a.id, 7, '0')),
      COALESCE(up.full_name, CONCAT('Customer ', a.user_id)),
      fvr.submitted_at, (frr.read_at IS NOT NULL),
      'Field verification report submitted',
      CONCAT('Field officer submitted ', COALESCE(fvr.outcome, 'verification'), ' report for ', COALESCE(up.full_name, CONCAT('Customer ', a.user_id)))
    FROM field_verification_reports fvr
    INNER JOIN applications a ON a.id = fvr.application_id
    LEFT JOIN user_profiles up ON up.user_id = a.user_id
    LEFT JOIN fcu_field_report_notification_reads frr ON frr.report_id = fvr.id AND frr.fcu_user_id = ?
  ) notification_rows ORDER BY createdAt DESC, applicationId DESC LIMIT ${safeLimit}`, [fcuUserId, fcuUserId]);
  return rows.map((row: any) => ({ ...row, applicationId: Number(row.applicationId), isRead: Boolean(row.isRead) }));
};

export const markNotificationRead = async (fcuUserId: number, applicationId: number) => {
  const [rows]: any = await dbQuery('SELECT id FROM applications WHERE id = ? LIMIT 1', [applicationId]);
  if (!rows.length) return false;
  await dbQuery(`INSERT INTO fcu_notification_reads (fcu_user_id, application_id, read_at)
    VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE read_at=NOW()`, [fcuUserId, applicationId]);
  await dbQuery(`INSERT INTO fcu_field_report_notification_reads (fcu_user_id, report_id, read_at)
    SELECT ?, id, NOW() FROM field_verification_reports WHERE application_id = ?
    ON DUPLICATE KEY UPDATE read_at=NOW()`, [fcuUserId, applicationId]);
  return true;
};

export const markAllNotificationsRead = async (fcuUserId: number) => {
  await dbQuery(`INSERT INTO fcu_notification_reads (fcu_user_id, application_id, read_at)
    SELECT ?, a.id, NOW() FROM applications a 
    WHERE (
      LOWER(TRIM(REPLACE(COALESCE(a.status, ''), '_', ' '))) IN ('send to fcu', 'sent to fcu')
      OR EXISTS (
        SELECT 1 FROM leads ld 
        WHERE (ld.user_id = a.user_id OR ld.lead_id = (SELECT lead_number FROM users WHERE id = a.user_id) OR ld.lead_id = (SELECT lead_reference_number FROM users WHERE id = a.user_id))
          AND LOWER(TRIM(REPLACE(COALESCE(ld.status, ''), '_', ' '))) IN ('send to fcu', 'sent to fcu')
      )
      OR EXISTS (
        SELECT 1 FROM application_logs al 
        WHERE al.user_id = a.user_id 
          AND UPPER(REPLACE(TRIM(COALESCE(al.status, '')), '_', ' ')) = 'SENT TO FCU'
      )
    )
    ON DUPLICATE KEY UPDATE read_at=NOW()`, [fcuUserId]);
  await dbQuery(`INSERT INTO fcu_field_report_notification_reads (fcu_user_id, report_id, read_at)
    SELECT ?, id, NOW() FROM field_verification_reports ON DUPLICATE KEY UPDATE read_at=NOW()`, [fcuUserId]);
};
