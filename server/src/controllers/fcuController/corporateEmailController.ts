import { Request, Response } from 'express';
import dns from 'dns';
import net from 'net';
import pool from '../../config/db';

// Reliable DNS servers (Google + Cloudflare)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {
  // fallback to system default
}

export interface EmailVerificationResult {
  email: string;
  status: 'VALID' | 'INVALID' | 'CATCH_ALL' | 'UNKNOWN';
  syntaxValid: boolean;
  mxValid: boolean;
  smtpStatus: 'VALID' | 'INVALID' | 'CATCH_ALL' | 'UNKNOWN';
  mxHost?: string;
  smtpCode?: number;
  smtpMessage?: string;
  reason?: string;
}

// 1. Resolve MX Records for domain
const resolveMx = (domain: string): Promise<dns.MxRecord[]> => {
  return new Promise((resolve) => {
    dns.resolveMx(domain, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        resolve([]);
      } else {
        resolve(addresses.sort((a, b) => a.priority - b.priority));
      }
    });
  });
};

// 2. SMTP Real-Time Probe
const checkSmtp = (email: string, mxHost: string, domain: string): Promise<Partial<EmailVerificationResult>> => {
  return new Promise((resolve) => {
    const socket = net.createConnection(25, mxHost);
    socket.setEncoding('utf8');
    socket.setTimeout(10000); // 10s timeout

    let buffer = '';
    let state: 'CONNECT' | 'EHLO' | 'MAIL_FROM' | 'RCPT_REAL' | 'RCPT_FAKE' | 'QUIT' = 'CONNECT';
    const fakeEmail = `verify_probe_${Date.now()}_chk@${domain}`;
    let isResolved = false;

    const safeResolve = (res: Partial<EmailVerificationResult>) => {
      if (!isResolved) {
        isResolved = true;
        try {
          socket.write('QUIT\r\n');
          socket.destroy();
        } catch {}
        resolve(res);
      }
    };

    const send = (cmd: string) => {
      try {
        socket.write(cmd);
      } catch {}
    };

    socket.on('data', (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split('\r\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        const code = parseInt(line.substring(0, 3), 10);
        // Multi-line SMTP: '-' at index 3 means more lines coming, ' ' means final line
        const isFinalLine = line.length >= 4 ? line.charAt(3) === ' ' : true;
        if (!isFinalLine) continue;

        if (state === 'CONNECT' && code === 220) {
          state = 'EHLO';
          send(`EHLO geetpay.in\r\n`);
        } else if (state === 'EHLO') {
          if (code >= 200 && code < 300) {
            state = 'MAIL_FROM';
            send(`MAIL FROM:<verifier@geetpay.in>\r\n`);
          } else {
            safeResolve({
              smtpStatus: 'UNKNOWN',
              smtpCode: code,
              smtpMessage: line,
              status: 'UNKNOWN',
              reason: `EHLO rejected (${line})`
            });
          }
        } else if (state === 'MAIL_FROM') {
          if (code >= 200 && code < 300) {
            state = 'RCPT_REAL';
            send(`RCPT TO:<${email}>\r\n`);
          } else {
            safeResolve({
              smtpStatus: 'UNKNOWN',
              smtpCode: code,
              smtpMessage: line,
              status: 'UNKNOWN',
              reason: `MAIL FROM rejected (${line})`
            });
          }
        } else if (state === 'RCPT_REAL') {
          if (code >= 200 && code < 300) {
            // Real email accepted -> probe fake email to test for Catch-All
            state = 'RCPT_FAKE';
            send(`RCPT TO:<${fakeEmail}>\r\n`);
          } else if (code >= 500 && code < 600) {
            const lowerLine = line.toLowerCase();
            // Check if rejection is actually about IP reputation / SPF / policy rather than mailbox missing
            const isSpamPolicyBlock = lowerLine.includes('block') || 
                                     lowerLine.includes('spam') || 
                                     lowerLine.includes('policy') || 
                                     lowerLine.includes('reputation') || 
                                     lowerLine.includes('ptr') ||
                                     lowerLine.includes('access denied');
            if (isSpamPolicyBlock) {
              safeResolve({
                smtpStatus: 'UNKNOWN',
                smtpCode: code,
                smtpMessage: line,
                status: 'UNKNOWN',
                reason: 'Mail server blocked verification probe (Security Policy)'
              });
            } else {
              // Truly non-existent mailbox (e.g. 550 5.1.1 User unknown / Mailbox not found)
              safeResolve({
                smtpStatus: 'INVALID',
                smtpCode: code,
                smtpMessage: line,
                status: 'INVALID',
                reason: line.replace(/^\d{3}\s*/, '').trim() || 'User mailbox does not exist'
              });
            }
          } else {
            safeResolve({
              smtpStatus: 'UNKNOWN',
              smtpCode: code,
              smtpMessage: line,
              status: 'UNKNOWN',
              reason: line
            });
          }
        } else if (state === 'RCPT_FAKE') {
          if (code >= 200 && code < 300) {
            // Fake email was also accepted => Catch-All Domain
            safeResolve({
              smtpStatus: 'CATCH_ALL',
              smtpCode: 250,
              smtpMessage: 'Domain accepts all emails (Catch-All)',
              status: 'CATCH_ALL',
              reason: 'Catch-All enabled on domain'
            });
          } else {
            // Fake rejected, real accepted => 100% Valid Mailbox
            safeResolve({
              smtpStatus: 'VALID',
              smtpCode: 250,
              smtpMessage: 'Mailbox exists and verified',
              status: 'VALID',
              reason: 'Mailbox verified'
            });
          }
        } else if (code >= 400) {
          safeResolve({
            smtpStatus: 'UNKNOWN',
            smtpCode: code,
            smtpMessage: line,
            status: 'UNKNOWN',
            reason: line
          });
        }
      }
    });

    socket.on('error', (err) => {
      safeResolve({
        smtpStatus: 'UNKNOWN',
        status: 'UNKNOWN',
        reason: 'SMTP connection failed (Port 25 blocked or host unreachable): ' + err.message
      });
    });

    socket.on('timeout', () => {
      safeResolve({
        smtpStatus: 'UNKNOWN',
        status: 'UNKNOWN',
        reason: 'SMTP connection timeout'
      });
    });
  });
};

// 3. Main Exported Function
export const verifyCorporateEmailLogic = async (email: string): Promise<EmailVerificationResult> => {
  const cleanEmail = (email || '').trim().toLowerCase();
  const result: EmailVerificationResult = {
    email: cleanEmail,
    status: 'UNKNOWN',
    syntaxValid: false,
    mxValid: false,
    smtpStatus: 'UNKNOWN'
  };

  // Step 1: Syntax Validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    result.status = 'INVALID';
    result.smtpStatus = 'INVALID';
    result.reason = 'Invalid email syntax format';
    return result;
  }
  result.syntaxValid = true;

  const domain = cleanEmail.split('@')[1];

  // Step 2: MX Record Check
  try {
    const mxRecords = await resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      result.status = 'INVALID';
      result.smtpStatus = 'INVALID';
      result.reason = 'No active mail server (MX records) found for domain';
      return result;
    }
    result.mxValid = true;
    result.mxHost = mxRecords[0].exchange;
  } catch (err: any) {
    result.status = 'INVALID';
    result.smtpStatus = 'INVALID';
    result.reason = 'Failed to resolve MX records: ' + err.message;
    return result;
  }

  // Step 3: SMTP Probe
  const smtpResult = await checkSmtp(cleanEmail, result.mxHost, domain);
  return { ...result, ...smtpResult };
};

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
    if (!email) {
      res.status(400).json({ status: 'error', message: 'Corporate email is missing in employment details' });
      return;
    }

    const verification = await verifyCorporateEmailLogic(email);
    const domain = email.split('@')[1] || '';
    const isVerified = verification.status === 'VALID';
    const reason = verification.reason || (isVerified ? 'Mailbox verified' : 'Email verification completed');

    await pool.query(`
      INSERT INTO fcu_corporate_email_verifications
        (application_id, user_id, email, domain, is_verified, verification_reason, verified_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE email=VALUES(email), domain=VALUES(domain),
        is_verified=VALUES(is_verified), verification_reason=VALUES(verification_reason), verified_at=NOW()
    `, [applicationId, rows[0].user_id, email, domain, isVerified ? 1 : 0, reason]);

    res.json({
      status: 'success',
      data: {
        email,
        isVerified,
        status: verification.status,
        reason,
        details: verification,
        verifiedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('FCU corporate email verification error:', error);
    res.status(500).json({ status: 'error', message: 'Unable to verify corporate email' });
  }
};
