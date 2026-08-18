"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAllCases = void 0;
const db_1 = __importDefault(require("../../config/db"));
const normalizeStatus = (value) => {
    const status = String(value || 'pending').trim().toUpperCase().replace(/[\s-]+/g, '_');
    const aliases = {
        DRAFT: 'PENDING',
        IN_REVIEW: 'UNDER_REVIEW',
        LOAN_REJECT: 'REJECTED',
        DOCUMENT_PENDING: 'DOCUMENT_PENDING',
    };
    return aliases[status] || status;
};
const initialsFor = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'NA';
const findAllCases = async () => {
    try {
        const [rows] = await db_1.default.query(`
      SELECT
        a.id AS application_id,
        a.user_id,
        a.loan_amount,
        a.loan_purpose,
        a.existing_loan,
        a.status AS application_status,
        DATE_FORMAT(a.created_at, '%d %b %Y') AS applied_on,
        DATE_FORMAT(a.updated_at, '%d %b %Y') AS updated_on,
        u.lead_number,
        u.mobile_number,
        up.full_name,
        up.personal_email,
        DATE_FORMAT(up.dob, '%d %b %Y') AS dob,
        up.gender,
        up.marital_status,
        up.religion,
        up.address_type,
        up.address,
        up.city,
        up.state,
        up.pincode,
        ed.employment_type,
        ed.company_name,
        ed.role,
        ed.monthly_income,
        ed.official_email,
        ed.work_address,
        ed.work_city,
        ed.work_state,
        pc.pan_number,
        pc.is_verified AS pan_verified,
        ac.aadhaar_number,
        ac.is_verified AS aadhaar_verified,
        cr.cibil_score,
        bd.bank_name,
        bd.account_number,
        kd.selfie_path,
        tc.name AS assigned_to,
        (SELECT bi.device_model FROM browser_info bi WHERE bi.user_id = u.id ORDER BY bi.id DESC LIMIT 1) AS device_model,
        (SELECT bi.device_type FROM browser_info bi WHERE bi.user_id = u.id ORDER BY bi.id DESC LIMIT 1) AS device_type,
        (SELECT bi.browser_info FROM browser_info bi WHERE bi.user_id = u.id ORDER BY bi.id DESC LIMIT 1) AS browser_info,
        (SELECT bi.ip_address FROM browser_info bi WHERE bi.user_id = u.id ORDER BY bi.id DESC LIMIT 1) AS ip_address,
        (SELECT bi.latitude FROM browser_info bi WHERE bi.user_id = u.id ORDER BY bi.id DESC LIMIT 1) AS latitude,
        (SELECT bi.longitude FROM browser_info bi WHERE bi.user_id = u.id ORDER BY bi.id DESC LIMIT 1) AS longitude,
        (SELECT JSON_ARRAYAGG(JSON_OBJECT(
          'name', rd.reference_name,
          'relation', rd.relationship,
          'mobile', rd.mobile_number
        )) FROM references_details rd WHERE rd.user_id = u.id) AS reference_data
      FROM applications a
      INNER JOIN users u ON u.id = a.user_id
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN employment_details ed ON ed.user_id = u.id
      LEFT JOIN pan_card_details pc ON pc.user_id = u.id
      LEFT JOIN aadhaar_card_details ac ON ac.user_id = u.id
      LEFT JOIN credit_report_details cr ON cr.user_id = u.id
      LEFT JOIN bank_details bd ON bd.user_id = u.id
      LEFT JOIN kyc_documents kd ON kd.id = (
        SELECT kd2.id FROM kyc_documents kd2 WHERE kd2.user_id = u.id ORDER BY kd2.id DESC LIMIT 1
      )
      LEFT JOIN telecallers tc ON tc.id = u.telecaller_id
      ORDER BY a.created_at DESC, a.id DESC
    `);
        const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#4f46e5', '#db2777'];
        const cases = rows.map((row, index) => {
            const status = normalizeStatus(row.application_status);
            const borrower = row.full_name || `Customer ${row.user_id}`;
            const amount = Number(row.loan_amount || 0);
            const income = Number(row.monthly_income || 0);
            const lti = income > 0 ? `${Math.round((amount / income) * 100)}%` : 'N/A';
            const aadhaar = row.aadhaar_number ? `XXXX-XXXX-${String(row.aadhaar_number).slice(-4)}` : 'Not available';
            const references = row.reference_data
                ? (typeof row.reference_data === 'string' ? JSON.parse(row.reference_data) : row.reference_data)
                : [];
            const docs = [
                { id: 'aadhaar', name: 'Aadhaar Card', type: 'Identity', exists: Boolean(row.aadhaar_number), approved: Boolean(row.aadhaar_verified) },
                { id: 'pan', name: 'PAN Card', type: 'Identity', exists: Boolean(row.pan_number), approved: Boolean(row.pan_verified) },
                { id: 'bank', name: 'Bank Details', type: 'Banking', exists: Boolean(row.account_number), approved: Boolean(row.account_number) },
                { id: 'selfie', name: 'Customer Selfie', type: 'Photo', exists: Boolean(row.selfie_path), approved: Boolean(row.selfie_path) },
            ].map(doc => ({
                id: doc.id,
                name: doc.name,
                type: doc.type,
                uploaded: doc.exists ? row.updated_on : 'Not uploaded',
                status: doc.approved ? 'APPROVED' : 'PENDING',
            }));
            return {
                id: `APP${String(row.application_id).padStart(7, '0')}`,
                ref: row.lead_number || `USR-${row.user_id}`,
                loanLeadId: row.lead_number || `USR-${row.user_id}`,
                borrower,
                initials: initialsFor(borrower),
                avatar: colors[index % colors.length],
                mobile: row.mobile_number || 'N/A',
                email: row.personal_email || 'N/A',
                loan: `₹${amount.toLocaleString('en-IN')}`,
                loanRaw: amount,
                purpose: String(row.loan_purpose || 'Personal').toUpperCase(),
                lti,
                branch: row.work_city ? `${row.work_city}${row.work_state ? `, ${row.work_state}` : ''}`.toUpperCase() : (row.city || 'UNASSIGNED').toUpperCase(),
                rm: row.assigned_to || 'Unassigned',
                owner: row.assigned_to || 'Unassigned',
                website: 'DATABASE',
                loanSource: 'Database',
                status,
                applied: row.applied_on || 'N/A',
                disburse: status === 'DISBURSED' ? row.updated_on : '—',
                flags: status === 'REJECTED' ? ['REJECTED'] : status === 'DOCUMENT_PENDING' ? ['DOCUMENT PENDING'] : [],
                dob: row.dob || 'N/A',
                gender: row.gender || 'N/A',
                pan: row.pan_number || 'Not available',
                aadhar: aadhaar,
                address: row.address || 'Not available',
                residenceAddressLine1: row.address || 'Not available',
                residenceType: row.address_type || 'N/A',
                city: row.city || 'N/A',
                state: row.state || 'N/A',
                pincode: row.pincode || 'N/A',
                employer: row.company_name || row.employment_type || 'N/A',
                emailOffice: row.official_email || 'N/A',
                contactOffice: row.work_address || 'N/A',
                income: income ? `₹${income.toLocaleString('en-IN')}/mo` : 'N/A',
                tenure: 'N/A',
                cibil: row.cibil_score ? String(row.cibil_score) : 'N/A',
                religion: row.religion || 'N/A',
                maritalStatus: row.marital_status || 'N/A',
                obligations: row.existing_loan ? 'Existing loan declared' : 'No existing loan declared',
                deviceModel: row.device_model || 'N/A',
                deviceType: row.device_type || 'N/A',
                browserInfo: row.browser_info || 'N/A',
                ipAddress: row.ip_address || 'N/A',
                locationLat: row.latitude ? String(row.latitude) : 'N/A',
                locationLng: row.longitude ? String(row.longitude) : 'N/A',
                docs,
                checks: [
                    { id: 'identity', label: 'Identity Verification', status: row.pan_verified && row.aadhaar_verified ? 'PASS' : 'PENDING', note: 'PAN and Aadhaar verification from database' },
                    { id: 'credit', label: 'CIBIL Score Check', status: row.cibil_score ? (Number(row.cibil_score) >= 650 ? 'PASS' : 'FAIL') : 'PENDING', note: row.cibil_score ? `Score ${row.cibil_score}` : 'Credit report pending' },
                    { id: 'bank', label: 'Bank Details Review', status: row.account_number ? 'PASS' : 'PENDING', note: row.bank_name || 'Bank details pending' },
                ],
                remarks: [],
                references: references.map((reference, referenceIndex) => ({
                    srNo: referenceIndex + 1,
                    name: reference.name || 'N/A',
                    relation: reference.relation || 'N/A',
                    mobile: reference.mobile || 'N/A',
                    loanLeadId: 'N/A',
                })),
            };
        });
        return cases;
    }
    catch (error) {
        throw error;
    }
};
exports.findAllCases = findAllCases;
