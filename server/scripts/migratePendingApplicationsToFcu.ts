import 'dotenv/config';
import pool from '../src/config/db';

const run = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows]: any = await connection.query(`
      SELECT a.id, a.parameter, a.status, w.stage, w.case_status
      FROM applications a
      LEFT JOIN fcu_case_workflows w ON w.application_id = a.id
      WHERE a.id IN (1, 2)
        AND LOWER(TRIM(a.status)) IN ('sent to fcu', 'sent_to_fcu')
      ORDER BY a.id
      FOR UPDATE
    `);
    console.table(rows);
    if (rows.length) {
      const ids = rows.map((row: any) => Number(row.id));
      await connection.query('UPDATE applications SET parameter = 2, updated_at = CURRENT_TIMESTAMP WHERE id IN (?)', [ids]);
      await connection.query(`
        UPDATE fcu_case_workflows w
        INNER JOIN applications a ON a.id = w.application_id
        SET w.stage = 'DOCUMENT_REVIEW', w.case_status = 'PENDING', w.reviewed_by = NULL,
            w.field_assigned_to = NULL, w.field_assigned_at = NULL, w.updated_at = CURRENT_TIMESTAMP
        WHERE a.id = 1 AND LOWER(TRIM(a.status)) IN ('sent to fcu', 'sent_to_fcu')
      `);
      console.log(`Migrated application IDs to parameter 2: ${ids.join(', ')}`);
    } else {
      console.log('No pending parameter-1 applications require migration.');
    }
    await connection.query('ALTER TABLE applications ALTER COLUMN parameter SET DEFAULT 2');
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
};

run().catch(error => { console.error(error); process.exit(1); });
