import { Request, Response } from 'express';
import pool from '../../config/db';
import { addCaseHistory } from '../../models/fcuModels/casesModel';

const parseApplicationId = (value: string | string[]) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const numericId = Number(String(raw).replace(/^APP0*/i, ''));
  return Number.isInteger(numericId) && numericId > 0 ? numericId : null;
};

export const updateBankDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationId = parseApplicationId(req.params.caseId);
    if (!applicationId) {
      res.status(400).json({ status: 'error', message: 'Invalid application ID' });
      return;
    }

    const [appRows]: any = await pool.query('SELECT id, user_id FROM applications WHERE id = ? LIMIT 1', [applicationId]);
    const app = appRows[0];
    if (!app) {
      res.status(404).json({ status: 'error', message: 'Application not found' });
      return;
    }

    const userId = app.user_id;
    const {
      accountHolderName = '',
      bankName = '',
      accountNumber = '',
      ifscCode = '',
      branchName = '',
      accountType = 'savings',
      salaryAccount = 'No',
      verificationStatus = 'Verified',
    } = req.body || {};

    const isSalaryAccount = salaryAccount === 'Yes' || salaryAccount === true || salaryAccount === 1 ? 1 : 0;
    const verifiedVal = String(verificationStatus).toLowerCase() === 'verified' ? 'Verified' : 'Not verified';

    await pool.query(`
      INSERT INTO bank_details (
        user_id, account_holder_name, bank_name, account_number, ifsc_code, branch_name, account_type, is_salary_account, is_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        account_holder_name = VALUES(account_holder_name),
        bank_name = VALUES(bank_name),
        account_number = VALUES(account_number),
        ifsc_code = VALUES(ifsc_code),
        branch_name = VALUES(branch_name),
        account_type = VALUES(account_type),
        is_salary_account = VALUES(is_salary_account),
        is_verified = VALUES(is_verified)
    `, [
      userId,
      String(accountHolderName).trim(),
      String(bankName).trim(),
      String(accountNumber).trim().replace(/\s/g, ''),
      String(ifscCode).trim().toUpperCase(),
      String(branchName).trim(),
      String(accountType).trim(),
      isSalaryAccount,
      verifiedVal
    ]);

    const reviewerId = Number((req as any).fcuUser?.id) || undefined;
    await addCaseHistory(
      applicationId,
      'EKYC_REVIEW',
      'Bank Account Details Updated',
      `Bank details updated (Holder: ${accountHolderName || 'N/A'}, Bank: ${bankName || 'N/A'}, Acc: ${accountNumber || 'N/A'}, Status: ${verifiedVal})`,
      reviewerId
    );

    const updatedBank = {
      accountHolderName: String(accountHolderName).trim() || 'N/A',
      bankName: String(bankName).trim() || 'N/A',
      accountNumber: String(accountNumber).trim().replace(/\s/g, '') || 'N/A',
      ifscCode: String(ifscCode).trim().toUpperCase() || 'N/A',
      branchName: String(branchName).trim() || 'N/A',
      accountType: String(accountType).trim() || 'savings',
      salaryAccount: isSalaryAccount ? 'Yes' : 'No',
      status: accountNumber ? 'Available' : 'Not available',
      verificationStatus: verifiedVal,
    };

    res.json({
      status: 'success',
      message: 'Bank account details updated successfully',
      data: updatedBank,
    });
  } catch (error: any) {
    console.error('FCU update bank details error:', error);
    res.status(500).json({ status: 'error', message: error?.message || 'Unable to update bank details' });
  }
};
