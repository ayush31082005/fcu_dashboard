import { Request, Response } from 'express';
import { resolveMx } from 'dns/promises';
import pool from '../../config/db';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const verifyCorporateEmail = async (req: Request, res: Response): Promise<void> => {
  const applicationId = Number(req.params.caseId);
  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    res.status(400).json({ status: 'error', message: 'Invalid application ID' }); return;
  }

  try {
    const [rows]: any = await pool.query(`
      SELECT a.user_id, ed.official_email
      FROM applications a
      LEFT JOIN employment_details ed ON ed.user_id = a.user_id
      WHERE a.id = ? LIMIT 1
    `, [applicationId]);
    if (!rows.length) { res.status(404).json({ status: 'error', message: 'Application not found' }); return; }

    const email = String(rows[0].official_email || '').trim().toLowerCase();
    let isVerified = false;
    let reason = 'Corporate email is missing';
    let domain = '';

    if (emailPattern.test(email)) {
      domain = email.split('@')[1];
      try {
        const records = await resolveMx(domain);
        isVerified = records.some(record => Boolean(record.exchange));
        reason = isVerified ? 'Email format and corporate mail domain are valid' : 'No mail server was found for this domain';
      } catch {
        reason = 'Corporate email domain does not have a reachable mail server';
      }
    } else if (email) {
      reason = 'Corporate email format is invalid';
    }

    await pool.query(`
      INSERT INTO fcu_corporate_email_verifications
        (application_id, user_id, email, domain, is_verified, verification_reason, verified_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE email=VALUES(email), domain=VALUES(domain),
        is_verified=VALUES(is_verified), verification_reason=VALUES(verification_reason), verified_at=NOW()
    `, [applicationId, rows[0].user_id, email, domain, isVerified ? 1 : 0, reason]);

    res.json({ status: 'success', data: { email, isVerified, reason, verifiedAt: new Date().toISOString() } });
  } catch (error: any) {
    console.error('FCU corporate email verification error:', error);
    res.status(500).json({ status: 'error', message: 'Unable to verify corporate email' });
  }
};
