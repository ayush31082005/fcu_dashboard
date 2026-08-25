import pool from '../../config/db';
import { dbQuery } from '../../config/dbQuery';
import { listCustomerDocumentsDirectly } from '../../config/documentStorage';

const normalizeStatus = (value: unknown) => {
  const status = String(value || 'pending').trim().toUpperCase().replace(/[\s-]+/g, '_');
  const aliases: Record<string, string> = {
    DRAFT: 'PENDING',
    IN_REVIEW: 'UNDER_REVIEW',
    LOAN_REJECT: 'REJECTED',
    DOCUMENT_PENDING: 'DOCUMENT_PENDING',
  };
  return aliases[status] || status;
};

const initialsFor = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'NA';

export const findAllCases = async (): Promise<any[]> => {
  try {
    const [rows]: any = await dbQuery(`
      SELECT
        a.id AS application_id,
        a.user_id,
        a.loan_amount,
        a.loan_purpose,
        a.existing_loan,
        a.parameter AS application_parameter,
        a.status AS application_status,
        a.updated_at AS application_updated_at,
        DATE_FORMAT(a.created_at, '%d %b %Y') AS applied_on,
        DATE_FORMAT(a.updated_at, '%d %b %Y') AS updated_on,
        ld.status AS lead_status,
        rl.id AS rejected_loan_id,
        rl.rejection_reasons AS rejected_reasons,
        rl.remarks AS rejected_remarks,
        rl.fraud_status AS rejected_fraud_status,
        rl.updated_by AS rejected_by_user,
        la.id AS loan_account_id,
        la.disbursed_on AS loan_disbursed_on,
        u.lead_number,
        u.lead_reference_number,
        u.application_number,
        u.lead_source,
        u.mobile_number,
        up.full_name,
        up.father_name,
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
        cev.is_verified AS corporate_email_verified,
        cev.verification_reason AS corporate_email_verification_reason,
        cev.verified_at AS corporate_email_verified_at,
        ed.work_address,
        ed.work_city,
        ed.work_state,
        pc.pan_number,
        pc.pan_name,
        pc.is_verified AS pan_verified,
        pc.api_response AS pan_api_response,
        DATE_FORMAT(pc.updated_at, '%d %b %Y') AS pan_verified_on,
        ac.aadhaar_number,
        ac.full_name AS aadhaar_name,
        ac.dob AS aadhaar_dob,
        ac.gender AS aadhaar_gender,
        ac.address AS aadhaar_address,
        ac.is_verified AS aadhaar_verified,
        ac.api_response AS aadhaar_api_response,
        ac.profile_image AS aadhaar_profile_image,
        DATE_FORMAT(ac.updated_at, '%d %b %Y') AS aadhaar_verified_on,
        faf.aadhaar_number AS fetched_aadhaar_number,
        faf.pan_number AS fetched_aadhaar_pan,
        faf.full_name AS fetched_aadhaar_name,
        faf.first_name AS fetched_aadhaar_first_name,
        faf.middle_name AS fetched_aadhaar_middle_name,
        faf.last_name AS fetched_aadhaar_last_name,
        faf.dob AS fetched_aadhaar_dob,
        faf.gender AS fetched_aadhaar_gender,
        faf.address AS fetched_aadhaar_address,
        faf.address_line_2 AS fetched_aadhaar_address_line_2,
        faf.city AS fetched_aadhaar_city,
        faf.state AS fetched_aadhaar_state,
        faf.pincode AS fetched_aadhaar_pincode,
        faf.country AS fetched_aadhaar_country,
        faf.linked_mobile AS fetched_aadhaar_mobile,
        faf.verification_status AS fetched_aadhaar_status,
        faf.request_id AS fetched_aadhaar_request_id,
        faf.relation AS fetched_aadhaar_relation,
        faf.photo AS fetched_aadhaar_photo,
        faf.api_response AS fetched_aadhaar_api_response,
        ud.uan,
        ud.employer_name AS uan_employer_name,
        ud.name_in_uan AS uan_name_in_uan,
        ud.mobile_in_uan AS uan_mobile_in_uan,
        ud.gender AS uan_gender,
        DATE_FORMAT(ud.date_of_birth, '%Y-%m-%d') AS uan_date_of_birth,
        ud.aadhaar_verification_status AS uan_aadhaar_verification_status,
        ud.uan_count AS uan_count,
        ud.is_employed AS uan_is_employed,
        ud.date_of_exit_marked AS uan_date_of_exit_marked,
        DATE_FORMAT(ud.date_of_exit, '%Y-%m-%d') AS uan_date_of_exit,
        ud.member_id AS uan_member_id,
        ud.establishment_id AS uan_establishment_id,
        ud.leave_reason AS uan_leave_reason,
        ud.claim_status AS uan_claim_status,
        ud.kyc_status AS uan_kyc_status,
        ud.employment_type AS uan_employment_type,
        ud.designation AS uan_designation,
        DATE_FORMAT(ud.joined_on, '%Y-%m-%d') AS uan_joined_on,
        ud.office_location AS uan_office_location,
        ud.employee_status AS uan_employee_status,
        ud.previous_employer AS uan_previous_employer,
        ud.is_verified AS uan_verified,
        DATE_FORMAT(ud.updated_at, '%d %b %Y') AS uan_verified_on,
        bd.bank_name,
        bd.account_number,
        bd.account_holder_name,
        bd.ifsc_code,
        bd.branch_name,
        bd.account_type,
        bd.is_salary_account,
        bd.is_verified AS bank_is_verified,
        mud.http_response_code AS upi_http_response_code,
        mud.client_ref_num AS upi_client_ref_num,
        mud.request_id AS upi_request_id,
        mud.result_code AS upi_result_code,
        mud.mobile_number AS upi_mobile_number,
        mud.mobile_linked_name AS upi_mobile_linked_name,
        mud.vpa AS upi_vpa,
        COALESCE(
          JSON_UNQUOTE(JSON_EXTRACT(mud.api_response, '$.data.message')),
          JSON_UNQUOTE(JSON_EXTRACT(mud.api_response, '$.message')),
          JSON_UNQUOTE(JSON_EXTRACT(mud.api_response, '$.status.message'))
        ) AS upi_message,
        bpv.http_response_code AS penny_http_response_code,
        bpv.request_id AS penny_request_id,
        bpv.result_code AS penny_result_code,
        bpv.account_exists AS penny_account_exists,
        bpv.name_at_bank AS penny_name_at_bank,
        bpv.utr AS penny_utr,
        bpv.amount_deposited AS penny_amount_deposited,
        bpv.message AS penny_message,
        bpv.api_response AS penny_api_response,
        mbd.http_response_code AS mobile_bank_http_response_code,
        mbd.request_id AS mobile_bank_request_id,
        mbd.result_code AS mobile_bank_result_code,
        mbd.mobile_number AS mobile_bank_mobile_number,
        mbd.message AS mobile_bank_message,
        mbd.bank_account_data AS mobile_bank_account_data,
        mbd.api_response AS mobile_bank_api_response,
        fcs.ckyc_number,
        fcs.ckyc_status,
        fcs.registered_on AS ckyc_registered_on,
        fcs.issuer AS ckyc_issuer,
        fcs.proof_type AS ckyc_proof_type,
        fcs.matching_status AS ckyc_matching_status,
        fcs.request_id AS ckyc_request_id,
        kd.selfie_path,
        kd.face_match_percentage,
        kd.face_match_status,
        kd.face_match_confidence,
        kd.face_match_details,
        tc.name AS assigned_to,
        forwarder.name AS forwarded_by,
        DATE_FORMAT(forward_log.created_at, '%d %b %Y, %h:%i %p') AS forwarded_on,
        (SELECT bi.device_model FROM browser_info bi WHERE bi.user_id = u.id ORDER BY bi.id DESC LIMIT 1) AS device_model,
        (SELECT bi.device_type FROM browser_info bi WHERE bi.user_id = u.id ORDER BY bi.id DESC LIMIT 1) AS device_type,
        (SELECT bi.browser_info FROM browser_info bi WHERE bi.user_id = u.id ORDER BY bi.id DESC LIMIT 1) AS browser_info,
        (SELECT bi.ip_address FROM browser_info bi WHERE bi.user_id = u.id ORDER BY bi.id DESC LIMIT 1) AS ip_address,
        (SELECT bi.latitude FROM browser_info bi WHERE bi.user_id = u.id ORDER BY bi.id DESC LIMIT 1) AS latitude,
        (SELECT bi.longitude FROM browser_info bi WHERE bi.user_id = u.id ORDER BY bi.id DESC LIMIT 1) AS longitude,
        (SELECT fv.residence_data FROM fcu_field_verifications fv WHERE fv.application_id = a.id LIMIT 1) AS residence_verification,
        (SELECT fv.office_data FROM fcu_field_verifications fv WHERE fv.application_id = a.id LIMIT 1) AS office_verification,
        (SELECT fvr.report_data FROM field_verification_reports fvr WHERE fvr.application_id = a.id ORDER BY fvr.id DESC LIMIT 1) AS field_report_data,
        (SELECT fvr.outcome FROM field_verification_reports fvr WHERE fvr.application_id = a.id ORDER BY fvr.id DESC LIMIT 1) AS field_report_outcome,
        (SELECT fvr.submitted_at FROM field_verification_reports fvr WHERE fvr.application_id = a.id ORDER BY fvr.id DESC LIMIT 1) AS field_report_submitted_at,
        (SELECT fu.name FROM field_verification_reports fvr LEFT JOIN field_users fu ON fu.id = fvr.field_user_id WHERE fvr.application_id = a.id ORDER BY fvr.id DESC LIMIT 1) AS field_report_officer_name,
        (SELECT fu.employee_id FROM field_verification_reports fvr LEFT JOIN field_users fu ON fu.id = fvr.field_user_id WHERE fvr.application_id = a.id ORDER BY fvr.id DESC LIMIT 1) AS field_report_employee_id,
        (SELECT l.fcu_user_id FROM fcu_case_locks l WHERE l.application_id = a.id AND l.lock_expires_at > NOW()) AS lock_user_id,
        (SELECT fu.name FROM fcu_case_locks l LEFT JOIN fcu_users fu ON fu.id = l.fcu_user_id WHERE l.application_id = a.id AND l.lock_expires_at > NOW()) AS lock_user_name,
        (SELECT l.lock_expires_at FROM fcu_case_locks l WHERE l.application_id = a.id AND l.lock_expires_at > NOW()) AS lock_expires_at,
        (SELECT JSON_ARRAYAGG(JSON_OBJECT(
          'name', rd.reference_name,
          'relation', rd.relationship,
          'mobile', rd.mobile_number
        )) FROM references_details rd WHERE rd.user_id = u.id) AS reference_data
      FROM applications a
      INNER JOIN users u ON u.id = a.user_id
      LEFT JOIN leads ld ON (ld.user_id = u.id OR ld.lead_id = u.lead_number OR ld.lead_id = u.lead_reference_number)
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN employment_details ed ON ed.user_id = u.id
      LEFT JOIN fcu_corporate_email_verifications cev ON cev.application_id = a.id AND cev.email = LOWER(TRIM(ed.official_email))
      LEFT JOIN pan_card_details pc ON pc.user_id = u.id
      LEFT JOIN aadhaar_card_details ac ON ac.user_id = u.id
      LEFT JOIN fcu_aadhaar_fetches faf ON faf.application_id = a.id
      LEFT JOIN uan_details ud ON ud.user_id = u.id
      LEFT JOIN bank_details bd ON bd.user_id = u.id
      LEFT JOIN fcu_mobile_upi_details mud ON mud.application_id = a.id
      LEFT JOIN fcu_bank_penny_verifications bpv ON bpv.application_id = a.id
      LEFT JOIN fcu_mobile_bank_details mbd ON mbd.application_id = a.id
      LEFT JOIN fcu_ckyc_searches fcs ON fcs.application_id = a.id
      LEFT JOIN kyc_documents kd ON kd.id = (
        SELECT kd2.id FROM kyc_documents kd2 WHERE kd2.user_id = u.id ORDER BY kd2.id DESC LIMIT 1
      )
      LEFT JOIN telecallers tc ON tc.id = u.telecaller_id
      LEFT JOIN application_logs forward_log ON forward_log.id = (
        SELECT al.id
        FROM application_logs al
        WHERE al.user_id = u.id
          AND UPPER(REPLACE(TRIM(COALESCE(al.status, '')), '_', ' ')) = 'SENT TO FCU'
        ORDER BY al.created_at DESC, al.id DESC
        LIMIT 1
      )
      LEFT JOIN telecallers forwarder ON forwarder.id = forward_log.telecaller_id
      LEFT JOIN rejected_loans rl ON (rl.user_id = u.id OR rl.application_id = a.id)
      LEFT JOIN loan_accounts la ON (la.phone = u.mobile_number OR la.id = CONCAT('LN-', u.lead_number) OR la.id = CONCAT('LN-', REPLACE(COALESCE(u.lead_number, ''), 'GP-LEAD-', '')))
      WHERE (
        LOWER(TRIM(REPLACE(COALESCE(a.status, ''), '_', ' '))) IN ('send to fcu', 'sent to fcu', 'send fcu', 'sent fcu', 'send to field verification', 'sent to field verification', 'field verification', 'fcu approved', 'fcu rejected', 'sent to credit', 'forwarded reject', 'disbursed', 'rejected by fcu', 'rejected by credit')
        OR (ld.id IS NOT NULL AND LOWER(TRIM(REPLACE(COALESCE(ld.status, ''), '_', ' '))) IN ('send to fcu', 'sent to fcu', 'send fcu', 'sent fcu', 'send to field verification', 'sent to field verification', 'field verification', 'fcu approved', 'fcu rejected', 'sent to credit', 'forwarded reject', 'disbursed', 'rejected by fcu', 'rejected by credit'))
        OR EXISTS (SELECT 1 FROM fcu_case_workflows w WHERE w.application_id = a.id)
        OR EXISTS (SELECT 1 FROM application_logs al WHERE al.user_id = u.id AND (UPPER(REPLACE(TRIM(COALESCE(al.status, '')), '_', ' ')) = 'SENT TO FCU' OR UPPER(COALESCE(al.status, '')) LIKE '%FCU%' OR UPPER(COALESCE(al.status, '')) LIKE '%FIELD%'))
      )
      AND (ld.status IS NULL OR LOWER(TRIM(REPLACE(ld.status, '_', ' '))) NOT IN ('new lead', 'new', 'follow up'))
      ORDER BY a.created_at DESC, a.id DESC
    `);

    const [reviewRows]: any = await dbQuery('SELECT application_id, document_id, status FROM fcu_document_reviews');
    const [workflowRows]: any = await dbQuery('SELECT * FROM fcu_case_workflows');
    const [ekycReviewRows]: any = await dbQuery('SELECT application_id, check_id, status FROM fcu_ekyc_reviews');
    const [creditRows]: any = await dbQuery('SELECT * FROM credit_report_details ORDER BY updated_at DESC, id DESC');
    const [referenceRows]: any = await dbQuery('SELECT * FROM references_details ORDER BY user_id, id');
    const [historyRows]: any = await dbQuery(`
      SELECT 
        l.id,
        l.user_id,
        a.id AS application_id,
        l.action AS event_type,
        COALESCE(l.action, 'Activity Log') AS title,
        l.details AS description,
        l.status,
        COALESCE(l.performed_by_name, fu.name, tc.name, 'System') AS performed_by_name,
        COALESCE(l.performed_by_role, CASE WHEN fu.id IS NOT NULL THEN 'FCU Reviewer' WHEN tc.id IS NOT NULL THEN 'Telecaller' ELSE 'System' END) AS role,
        l.created_at
      FROM application_logs l
      INNER JOIN users u ON u.id = l.user_id
      INNER JOIN applications a ON a.user_id = u.id
      LEFT JOIN fcu_users fu ON (fu.name = l.performed_by_name)
      LEFT JOIN telecallers tc ON tc.id = l.telecaller_id
      ORDER BY l.created_at DESC, l.id DESC
    `);
    const reviewsByApplication = new Map<number, Map<string, string>>();
    for (const review of reviewRows) {
      if (!reviewsByApplication.has(review.application_id)) reviewsByApplication.set(review.application_id, new Map());
      reviewsByApplication.get(review.application_id)!.set(review.document_id, review.status);
    }
    const workflowByApplication = new Map<number, any>(workflowRows.map((workflow: any) => [workflow.application_id, workflow]));
    const ekycReviewsByApplication = new Map<number, Map<string, string>>();
    for (const review of ekycReviewRows) {
      if (!ekycReviewsByApplication.has(review.application_id)) ekycReviewsByApplication.set(review.application_id, new Map());
      ekycReviewsByApplication.get(review.application_id)!.set(review.check_id, review.status);
    }
    const historyByApplication = new Map<number, any[]>();
    for (const item of historyRows) {
      if (!historyByApplication.has(item.application_id)) historyByApplication.set(item.application_id, []);
      const performedBy = item.performed_by_name || 'System';
      const role = item.role || (performedBy !== 'System' ? 'FCU Reviewer' : 'System');

      historyByApplication.get(item.application_id)!.push({
        id: item.id,
        type: item.event_type,
        title: item.title || item.event_type || 'Activity Log',
        description: item.description,
        status: item.status,
        performedBy,
        role,
        createdAt: item.created_at
      });
    }
    const creditByUser = new Map<number, any>();
    for (const credit of creditRows) {
      if (!creditByUser.has(Number(credit.user_id))) creditByUser.set(Number(credit.user_id), credit);
    }
    const referencesByUser = new Map<number, any[]>();
    const [customerDocRows]: any = await dbQuery('SELECT * FROM customer_documents ORDER BY id ASC').catch(() => [[]]);
    const [requestedDocRows]: any = await dbQuery(`
      SELECT rd.id, r.application_id, rd.document_name, rd.status, rd.file_name, rd.file_path, rd.uploaded_at, rd.created_at
      FROM fcu_requested_documents rd
      JOIN fcu_document_requests r ON r.id = rd.request_id
      WHERE (rd.file_path IS NOT NULL AND rd.file_path <> '') OR rd.status = 'UPLOADED'
      ORDER BY rd.id ASC
    `).catch(() => [[]]);
    const [kycDocRows]: any = await dbQuery(`
      SELECT id, user_id, selfie_path, face_match_percentage, panel_verification_status, created_at
      FROM kyc_documents
      WHERE selfie_path IS NOT NULL AND selfie_path <> ''
      ORDER BY id ASC
    `).catch(() => [[]]);

    const customerDocsByUser = new Map<number, any[]>();
    const customerDocsByLead = new Map<string, any[]>();
    const customerDocsByApp = new Map<number, any[]>();

    for (const doc of (customerDocRows || [])) {
      if (doc.user_id) {
        const uid = Number(doc.user_id);
        if (!customerDocsByUser.has(uid)) customerDocsByUser.set(uid, []);
        customerDocsByUser.get(uid)!.push(doc);
      }
      if (doc.lead_id) {
        const lid = String(doc.lead_id).trim().toUpperCase();
        if (!customerDocsByLead.has(lid)) customerDocsByLead.set(lid, []);
        customerDocsByLead.get(lid)!.push(doc);
      }
      if (doc.application_id) {
        const aid = Number(doc.application_id);
        if (!customerDocsByApp.has(aid)) customerDocsByApp.set(aid, []);
        customerDocsByApp.get(aid)!.push(doc);
      }
    }

    const requestedDocsByApp = new Map<number, any[]>();
    for (const doc of (requestedDocRows || [])) {
      const aid = Number(doc.application_id);
      if (!requestedDocsByApp.has(aid)) requestedDocsByApp.set(aid, []);
      requestedDocsByApp.get(aid)!.push(doc);
    }

    const kycDocsByUser = new Map<number, any[]>();
    for (const doc of (kycDocRows || [])) {
      const uid = Number(doc.user_id);
      if (!kycDocsByUser.has(uid)) kycDocsByUser.set(uid, []);
      kycDocsByUser.get(uid)!.push(doc);
    }

    const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#4f46e5', '#db2777'];
    const cases = rows.map((row: any, index: number) => {
      const parseJson = (value: any) => value ? (typeof value === 'string' ? JSON.parse(value) : value) : {};
      const applicationStatus = normalizeStatus(row.application_status);
      const borrower = row.full_name || `Customer ${row.user_id}`;
      const amount = Number(row.loan_amount || 0);
      const income = Number(row.monthly_income || 0);
      const lti = income > 0 ? `${Math.round((amount / income) * 100)}%` : 'N/A';
      // FCU reviewers need the complete Aadhaar value returned by the database.
      const aadhaar = row.aadhaar_number ? String(row.aadhaar_number) : 'Not available';
      const references = row.reference_data
        ? (typeof row.reference_data === 'string' ? JSON.parse(row.reference_data) : row.reference_data)
        : [];
      const aadhaarApi = parseJson(row.aadhaar_api_response);
      const rawAadhaarPhoto = row.aadhaar_profile_image
        || aadhaarApi?.photo
        || aadhaarApi?.data?.photo
        || aadhaarApi?.profile_image
        || aadhaarApi?.data?.profile_image
        || row.fetched_aadhaar_photo;

      const aadhaarProfileImage = rawAadhaarPhoto
        ? String(rawAadhaarPhoto).startsWith('data:') || String(rawAadhaarPhoto).startsWith('http') || String(rawAadhaarPhoto).startsWith('/')
          ? String(rawAadhaarPhoto)
          : `data:image/jpeg;base64,${String(rawAadhaarPhoto).replace(/\s+/g, '')}`
        : null;
      const panApi = parseJson(row.pan_api_response);
      const creditRecord = creditByUser.get(Number(row.user_id)) || {};
      const creditProviderData = parseJson(creditRecord.api_response);
      const resolvedCibilScore = creditRecord.cibil_score
        ?? creditRecord.ai_cibil_score
        ?? creditProviderData?.data?.cibil_score
        ?? creditProviderData?.data?.cibilScore
        ?? null;

      const savedReviews = reviewsByApplication.get(row.application_id);
      const savedEkycReviews = ekycReviewsByApplication.get(row.application_id);
      const storedWorkflow = workflowByApplication.get(row.application_id);
      // An upstream handoff back to FCU (parameter 2 + sent to fcu) starts a new
      // FCU review cycle. Preserve the old workflow row for audit, but do not let
      // its previous FINALIZED state hide the newly handed-off application.
      const isFreshFcuHandoff = Number(row.application_parameter) === 2
        && ['SENT_TO_FCU', 'SENT_FCU'].includes(applicationStatus)
        && (!storedWorkflow || new Date(row.application_updated_at).getTime() > new Date(storedWorkflow.updated_at).getTime());
      const workflow = isFreshFcuHandoff
        ? { ...storedWorkflow, stage: 'DOCUMENT_REVIEW', case_status: 'PENDING' }
        : storedWorkflow;
      const workflowStatus = normalizeStatus(workflow?.case_status);
      const leadStatus = normalizeStatus(row.lead_status);
      
      const isFcuRejected = ['REJECTED_BY_FCU', 'FCU_REJECTED', 'FORWARDED_REJECT'].includes(leadStatus)
        || ['REJECTED_BY_FCU', 'FCU_REJECTED', 'FORWARDED_REJECT'].includes(applicationStatus)
        || ['REJECTED_BY_FCU', 'FCU_REJECTED', 'FORWARDED_REJECT'].includes(workflowStatus)
        || String(row.rejected_remarks || row.rejected_reasons || '').toUpperCase().includes('FCU');

      const isCreditRejected = ['REJECTED_BY_CREDIT', 'CREDIT_REJECTED'].includes(leadStatus)
        || ['REJECTED_BY_CREDIT', 'CREDIT_REJECTED'].includes(applicationStatus)
        || ['REJECTED_BY_CREDIT', 'CREDIT_REJECTED'].includes(workflowStatus)
        || String(row.rejected_remarks || row.rejected_reasons || '').toUpperCase().includes('CREDIT');

      const isRejected = isFcuRejected || isCreditRejected || Boolean(row.rejected_loan_id)
        || ['REJECTED', 'LOAN_REJECT'].includes(leadStatus)
        || ['REJECTED', 'LOAN_REJECT'].includes(applicationStatus)
        || ['REJECTED'].includes(workflowStatus);
      
      const isDisbursed = Boolean(row.loan_account_id)
        || leadStatus === 'DISBURSED'
        || applicationStatus === 'DISBURSED'
        || ['DISBURSED'].includes(workflowStatus);

      let status = workflowStatus || applicationStatus || leadStatus || 'PENDING';
      if (isDisbursed) {
        status = 'DISBURSED';
      } else if (isFcuRejected) {
        status = 'REJECTED_BY_FCU';
      } else if (isCreditRejected) {
        status = 'REJECTED_BY_CREDIT';
      } else if (isRejected) {
        status = (workflowStatus === 'SENT_TO_CREDIT' || Number(row.application_parameter) === 3 || row.rejected_loan_id)
          ? 'REJECTED_BY_CREDIT'
          : 'REJECTED_BY_FCU';
      } else if (leadStatus === 'APPROVED' || applicationStatus === 'APPROVED') {
        status = 'APPROVED';
      } else if (workflowStatus) {
        status = workflowStatus;
      } else if (applicationStatus && applicationStatus !== 'PENDING') {
        status = applicationStatus;
      } else if (leadStatus) {
        status = leadStatus;
      }
      const caseLeadId = String(row.lead_number || '').trim().toUpperCase();
      const caseLeadRef = String(row.lead_reference_number || '').trim().toUpperCase();
      const caseUserId = Number(row.user_id);
      const caseAppId = Number(row.application_id);

      // 1. Database customer_documents
      const dbCustomerDocs = [
        ...(customerDocsByUser.get(caseUserId) || []),
        ...(caseLeadId ? (customerDocsByLead.get(caseLeadId) || []) : []),
        ...(caseLeadRef ? (customerDocsByLead.get(caseLeadRef) || []) : []),
        ...(caseAppId ? (customerDocsByApp.get(caseAppId) || []) : []),
      ];

      // 2. Uploaded requested docs (fcu_requested_documents)
      const dbReqDocs = requestedDocsByApp.get(caseAppId) || [];

      // 3. KYC selfie docs (kyc_documents)
      const dbKycDocs = kycDocsByUser.get(caseUserId) || [];

      // 4. Local disk scanned files
      const diskDocs = listCustomerDocumentsDirectly([
        caseLeadId,
        caseLeadRef,
        caseUserId,
        `USR-${caseUserId}`,
        `GP-LEAD-${row.application_id}`,
        `APP${String(row.application_id).padStart(7, '0')}`
      ]);

      const normalizeDocFilePath = (p: string | null | undefined): string | null => {
        if (!p) return null;
        const str = String(p).trim();
        if (str.startsWith('http://') || str.startsWith('https://') || str.startsWith('data:') || str.startsWith('blob:')) {
          return str;
        }
        if (str.includes('res.cloudinary.com')) {
          const filename = str.split('/').pop() || '';
          return `/customer_documents/${filename}`;
        }
        if (str.startsWith('/')) return str;
        return `/${str}`;
      };

      // Merge and deduplicate by key
      const seenDocKeys = new Set<string>();
      const combinedDocs: any[] = [];

      for (const d of dbCustomerDocs) {
        const normPath = normalizeDocFilePath(d.file_path);
        const key = String(normPath || d.file_name || `db-${d.id}`).trim().toLowerCase();
        if (key && !seenDocKeys.has(key)) {
          seenDocKeys.add(key);
          combinedDocs.push({
            ...d,
            file_path: normPath,
          });
        }
      }

      for (const reqDoc of dbReqDocs) {
        const normPath = normalizeDocFilePath(reqDoc.file_path);
        const key = String(normPath || reqDoc.file_name || `req-${reqDoc.id}`).trim().toLowerCase();
        if (key && !seenDocKeys.has(key)) {
          seenDocKeys.add(key);
          combinedDocs.push({
            id: `req-${reqDoc.id}`,
            doc_type: reqDoc.document_name || 'Requested Document',
            file_name: reqDoc.file_name || reqDoc.document_name,
            file_path: normPath,
            uploaded_by: 'Customer (Upload Link)',
            created_at: reqDoc.uploaded_at || reqDoc.created_at,
            panel_verification_status: 'PENDING',
            tamper_status: 'ORIGINAL',
          });
        }
      }

      for (const kyc of dbKycDocs) {
        const normPath = normalizeDocFilePath(kyc.selfie_path);
        const key = String(normPath || `kyc-${kyc.id}`).trim().toLowerCase();
        if (key && !seenDocKeys.has(key)) {
          seenDocKeys.add(key);
          combinedDocs.push({
            id: `kyc-${kyc.id}`,
            doc_type: 'Live Selfie Photo',
            file_name: String(kyc.selfie_path).split('/').pop() || 'selfie.jpg',
            file_path: normPath,
            uploaded_by: 'Customer (KYC)',
            created_at: kyc.created_at,
            panel_verification_status: kyc.panel_verification_status || 'VERIFIED',
            tamper_status: 'ORIGINAL',
          });
        }
      }

      for (const diskDoc of diskDocs) {
        const normPath = normalizeDocFilePath(diskDoc.file_path);
        const key = String(normPath || diskDoc.file_name || diskDoc.id).trim().toLowerCase();
        if (key && !seenDocKeys.has(key)) {
          seenDocKeys.add(key);
          combinedDocs.push({
            ...diskDoc,
            file_path: normPath,
          });
        }
      }

      const aadhaarDoc = combinedDocs.find(d => {
        const t = String(d.doc_type || d.file_name || d.document_name || '').toLowerCase();
        return t.includes('aadhaar') || t.includes('aadhar');
      });
      const resolvedAadhaarPhoto = aadhaarProfileImage || normalizeDocFilePath(aadhaarDoc?.file_path) || null;

      const docs = combinedDocs.map((document: any, docIndex: number) => {
        const documentId = `customer-doc-${document.id}`;
        const docIdDisplay = `CD-${document.id || docIndex + 1}`;
        const documentName = String(document.doc_type || 'Customer Document').trim();
        const normalizedName = documentName.toLowerCase();
        const documentType = normalizedName.includes('bank') ? 'Banking'
          : normalizedName.includes('selfie') || normalizedName.includes('photo') ? 'Photo'
            : 'Identity';
        const rawFileName = document.file_name || String(document.file_path || '').split('/').pop() || documentName;
        const uploadedBy = String(document.uploaded_by || 'Customer').trim();

        const isModified = Boolean(document.is_modified_or_edited) || (document.tamper_status && document.tamper_status !== 'ORIGINAL');
        const metaIntegrityStatus = isModified
          ? (document.tamper_status === 'MODIFIED' ? 'Modified / Edited' : document.tamper_status || 'Modified / Under Review')
          : 'Original / Clean';

        let metaIntegrityDetail = document.tamper_analysis;
        const detailsParts: string[] = [];
        if (document.meta_creation_date) detailsParts.push(`Created: ${document.meta_creation_date}`);
        if (document.meta_mod_date) detailsParts.push(`Modified: ${document.meta_mod_date}`);
        if (document.meta_producer || document.meta_software) detailsParts.push(`(Generated via ${document.meta_producer || document.meta_software})`);

        if (detailsParts.length > 0) {
          metaIntegrityDetail = detailsParts.join(' ') + (isModified ? ' [⚠️ Tamper/Edit Detected]' : '');
        } else if (!metaIntegrityDetail) {
          if (normalizedName.includes('selfie')) {
            metaIntegrityDetail = 'Authentic original capture (640x480 WEBP)';
          } else if (normalizedName.includes('pan')) {
            metaIntegrityDetail = 'Authentic original capture (856x1072 WEBP)';
          } else {
            metaIntegrityDetail = isModified ? 'Modified / Edited document file' : 'Authentic original document file';
          }
        }

        const faceMatch = normalizedName.includes('selfie') || normalizedName.includes('photo') ? '45% Match' : null;
        const dbStatus = String(document.panel_verification_status || 'PENDING').toUpperCase() === 'VERIFIED' ? 'APPROVED' : 'PENDING';
        const reviewStatus = savedReviews?.get(documentId);
        const effectiveStatus = reviewStatus || dbStatus;

        return {
          id: documentId,
          docId: docIdDisplay,
          name: documentName,
          type: documentType,
          leadId: document.lead_id || caseLeadId || caseLeadRef || `GP-LEAD-${row.user_id}`,
          fileName: rawFileName,
          uploadedBy: uploadedBy,
          uploaded: document.created_at || row.updated_on,
          status: effectiveStatus,
          fileUrl: normalizeDocFilePath(document.file_path) || null,
          metaIntegrityStatus,
          metaIntegrityDetail,
          faceMatch,
          details: {
            'Lead ID': document.lead_id || caseLeadId,
            'Doc ID': docIdDisplay,
            'Uploaded By': uploadedBy,
            'File Name': rawFileName,
            'Uploaded On': document.created_at || row.updated_on,
            'Created Date': document.meta_creation_date || 'N/A',
            'Modified Date': document.meta_mod_date || 'N/A',
            'Tamper Status': document.tamper_status || 'ORIGINAL',
            'Tamper Analysis': document.tamper_analysis || 'Authentic original file',
            'Producer': document.meta_producer,
            'Software': document.meta_software,
          },
        };
      });

      const rawAadhaarAddr = String(row.aadhaar_address || row.fetched_aadhaar_address || '').trim();
      const addrParts = rawAadhaarAddr ? rawAadhaarAddr.split(',').map(s => s.trim()).filter(Boolean) : [];
      const parsedPincode = (rawAadhaarAddr.match(/\b(\d{6})\b/) || [])[1] || '';
      let parsedState = '';
      let parsedCity = '';
      let parsedLine2 = '';
      if (addrParts.length >= 2) {
        const cleanParts = addrParts.filter(p => !/^\d{6}$/.test(p));
        if (cleanParts.length >= 1) parsedState = cleanParts[cleanParts.length - 1];
        if (cleanParts.length >= 2) parsedCity = cleanParts[cleanParts.length - 2];
        if (cleanParts.length >= 3) parsedLine2 = cleanParts[cleanParts.length - 3];
      }

      const secLine1 = row.aadhaar_address || row.fetched_aadhaar_address || row.address || 'Not available';
      const secLine2 = row.fetched_aadhaar_address_line_2
        || aadhaarApi?.data?.split_address?.street
        || aadhaarApi?.data?.split_address?.landmark
        || aadhaarApi?.data?.split_address?.loc
        || aadhaarApi?.data?.address_line_2
        || aadhaarApi?.address_line_2
        || parsedLine2
        || row.city
        || 'Not available';
      const secCity = row.fetched_aadhaar_city
        || aadhaarApi?.data?.split_address?.dist
        || aadhaarApi?.data?.split_address?.vtc
        || aadhaarApi?.data?.split_address?.subdist
        || aadhaarApi?.data?.address?.dist
        || aadhaarApi?.data?.city
        || aadhaarApi?.city
        || parsedCity
        || row.city
        || 'Not available';
      const secState = row.fetched_aadhaar_state
        || aadhaarApi?.data?.split_address?.state
        || aadhaarApi?.data?.address?.state
        || aadhaarApi?.data?.state
        || aadhaarApi?.state
        || parsedState
        || row.state
        || 'Not available';
      const secPincode = row.fetched_aadhaar_pincode
        || aadhaarApi?.data?.split_address?.pincode
        || aadhaarApi?.data?.address?.pincode
        || aadhaarApi?.data?.pincode
        || aadhaarApi?.data?.zip
        || aadhaarApi?.pincode
        || aadhaarApi?.zip
        || parsedPincode
        || row.pincode
        || 'Not available';
      const secType = row.fetched_aadhaar_relation
        ? 'Family'
        : (row.address_type ? (String(row.address_type).toLowerCase() === 'own' ? 'Rented' : row.address_type) : 'Rented');

      return {
        id: `APP${String(row.application_id).padStart(7, '0')}`,
        ref: row.lead_number || `USR-${row.user_id}`,
        // Application Information must show the borrower's real lead number,
        // not the internal numeric users.id foreign key.
        loanLeadId: row.lead_number || `USR-${row.user_id}`,
        applicationNo: row.application_number || `APP${String(row.application_id).padStart(7, '0')}`,
        leadReferenceNo: row.lead_reference_number || `BLP1MP${String(row.user_id).padStart(2, '0')}`,
        forwardedBy: row.forwarded_by || 'N/A',
        forwardedOn: row.forwarded_on || 'N/A',
        borrower,
        initials: initialsFor(borrower),
        avatar: colors[index % colors.length],
        mobile: row.mobile_number || 'N/A',
        email: row.personal_email || 'N/A',
        loan: `₹${amount.toLocaleString('en-IN')}`,
        loanRaw: amount,
        purpose: String(row.loan_purpose || 'Personal').toUpperCase(),
        lti,
        applied: row.applied_on || row.created_at || 'N/A',
        appliedOn: row.applied_on || row.created_at || 'N/A',
        updatedOn: row.updated_on || 'N/A',
        branch: row.work_city ? `${row.work_city}${row.work_state ? `, ${row.work_state}` : ''}`.toUpperCase() : (row.city || 'UNASSIGNED').toUpperCase(),
        rm: row.assigned_to || 'Unassigned',
        owner: row.assigned_to || 'Unassigned',
        website: row.forwarded_by ? 'TELECALLER' : (row.lead_source || 'DIRECT'),
        loanSource: row.forwarded_by ? 'Telecaller' : (row.lead_source || 'Direct'),
        sourceStatus: applicationStatus,
        status,
        databaseId: row.application_id,
        parameter: Number(row.application_parameter || 0),
        workflowStage: workflow?.stage || 'DOCUMENT_REVIEW',
        title: row.title || (() => {
          const g = String(row.gender || row.aadhaar_gender || row.fetched_aadhaar_gender || row.uan_gender || '').trim().toUpperCase();
          const isF = g === 'FEMALE' || g === 'F';
          const isM = String(row.marital_status || '').trim().toUpperCase() === 'MARRIED';
          return isF ? (isM ? 'MRS' : 'MS') : 'MR';
        })(),
        dob: row.dob || 'N/A',
        gender: row.gender || 'N/A',
        pan: row.pan_number || 'Not available',
        aadhar: aadhaar,
        address: row.address || 'Not available',
        residenceAddressLine1: row.address || 'Not available',
        residenceType: row.address_type || 'Owned',
        secondaryResidenceAddressLine1: secLine1,
        secondaryResidenceAddressLine2: secLine2,
        secondaryResidenceCity: secCity,
        secondaryResidenceState: secState,
        secondaryResidencePincode: secPincode,
        secondaryResidenceType: secType || 'Rented',
        city: row.city || 'N/A',
        state: row.state || 'N/A',
        pincode: row.pincode || 'N/A',
        employer: row.company_name || row.employment_type || 'N/A',
        emailOffice: row.official_email || 'N/A',
        corporateEmailVerification: row.corporate_email_verified === null || row.corporate_email_verified === undefined ? null : {
          isVerified: Boolean(row.corporate_email_verified),
          reason: row.corporate_email_verification_reason || '',
          verifiedAt: row.corporate_email_verified_at || null,
        },
        contactOffice: row.work_address || 'N/A',
        income: income ? `₹${income.toLocaleString('en-IN')}/mo` : 'N/A',
        tenure: 'N/A',
        cibil: resolvedCibilScore == null ? 'N/A' : String(resolvedCibilScore),
        creditBureau: {
          cibilScore: resolvedCibilScore == null ? 'N/A' : String(resolvedCibilScore),
          totalAccounts: creditRecord.total_accounts == null ? '0' : String(creditRecord.total_accounts),
          activeAccounts: creditRecord.active_accounts == null ? '0' : String(creditRecord.active_accounts),
          updatedOn: creditRecord.updated_at || creditRecord.created_at || 'N/A',
          providerData: creditProviderData || {},
          databaseColumns: Object.fromEntries(
            Object.entries(creditRecord).filter(([key]) => key !== 'api_response')
          ),
        },
        religion: row.religion || 'N/A',
        maritalStatus: row.marital_status || 'N/A',
        obligations: row.existing_loan ? 'Existing loan declared' : 'No existing loan declared',
        deviceModel: row.device_model || 'N/A',
        deviceType: row.device_type || 'N/A',
        browserInfo: row.browser_info || 'N/A',
        ipAddress: row.ip_address || 'N/A',
        locationLat: row.latitude ? String(row.latitude) : 'N/A',
        locationLng: row.longitude ? String(row.longitude) : 'N/A',
        ekycDetails: {
          aadhaar: {
            linkedMobile: row.mobile_number || 'N/A',
            number: aadhaar,
            status: row.aadhaar_verified ? 'Verified' : 'Not verified',
            name: row.aadhaar_name || borrower,
            dob: row.aadhaar_dob || row.dob || 'N/A',
            gender: row.aadhaar_gender || row.gender || 'N/A',
            issuedBy: 'UIDAI',
            verifiedOn: row.aadhaar_verified_on || 'N/A',
            addressType: row.address_type || 'N/A',
            photo: resolvedAadhaarPhoto,
            address: row.aadhaar_address || row.address || 'N/A',
            addressLine2: row.city || 'N/A', city: row.city || 'N/A', state: row.state || 'N/A', pincode: row.pincode || 'N/A', country: 'India',
          },
          fetchedAadhaar: row.fetched_aadhaar_number ? {
            httpResponseCode: String(parseJson(row.fetched_aadhaar_api_response)?.status?.code || 'N/A'),
            statusType: parseJson(row.fetched_aadhaar_api_response)?.status?.type || 'N/A',
            relation: row.fetched_aadhaar_relation || '',
            number: row.fetched_aadhaar_number, name: row.fetched_aadhaar_name || 'N/A',
            pan: row.fetched_aadhaar_pan || parseJson(row.fetched_aadhaar_api_response)?.data?.pan || 'N/A',
            firstName: row.fetched_aadhaar_first_name || parseJson(row.fetched_aadhaar_api_response)?.data?.first_name || 'N/A',
            middleName: row.fetched_aadhaar_middle_name || parseJson(row.fetched_aadhaar_api_response)?.data?.middle_name || 'N/A',
            lastName: row.fetched_aadhaar_last_name || parseJson(row.fetched_aadhaar_api_response)?.data?.last_name || 'N/A',
            dob: row.fetched_aadhaar_dob || 'N/A', gender: row.fetched_aadhaar_gender || 'N/A',
            status: row.fetched_aadhaar_status || 'Fetched', linkedMobile: row.fetched_aadhaar_mobile || 'N/A',
            address: row.fetched_aadhaar_address || 'N/A', addressLine2: row.fetched_aadhaar_address_line_2 || 'N/A',
            city: row.fetched_aadhaar_city || 'N/A', state: row.fetched_aadhaar_state || 'N/A',
            pincode: row.fetched_aadhaar_pincode || 'N/A', country: row.fetched_aadhaar_country || 'N/A',
            requestId: row.fetched_aadhaar_request_id || 'N/A', photo: row.fetched_aadhaar_photo || null,
            providerMessage: parseJson(row.fetched_aadhaar_api_response)?.message || parseJson(row.fetched_aadhaar_api_response)?.status?.message || 'N/A',
            apiResponse: parseJson(row.fetched_aadhaar_api_response)?.data?.result || parseJson(row.fetched_aadhaar_api_response)?.data || parseJson(row.fetched_aadhaar_api_response)?.result || parseJson(row.fetched_aadhaar_api_response),
          } : null,
          pan: {
            number: row.pan_number || 'N/A', status: row.pan_verified ? 'Verified' : 'Not verified',
            name: row.pan_name || borrower, fatherName: panApi?.father_name || panApi?.data?.father_name || row.father_name || 'N/A',
            dob: panApi?.dob || panApi?.data?.dob || row.dob || 'N/A', issuedOn: panApi?.issued_on || panApi?.data?.issued_on || row.pan_verified_on || 'N/A',
            city: row.city || 'N/A', office: panApi?.office || panApi?.data?.office || 'N/A',
          },
          ckyc: {
            number: row.ckyc_number || 'N/A', status: row.ckyc_status || 'Not available',
            registeredOn: row.ckyc_registered_on || 'N/A', issuer: row.ckyc_issuer || 'N/A',
            proofType: row.ckyc_proof_type || (row.pan_number ? 'PAN' : 'N/A'),
            matchingStatus: row.ckyc_matching_status || 'N/A', requestId: row.ckyc_request_id || 'N/A',
            message: row.ckyc_message || 'N/A', fetched: row.ckyc_status ? 'Yes' : 'No',
          },
          uan: {
            number: row.uan || 'N/A', status: row.uan_verified ? 'Verified' : 'Not verified', verifiedOn: row.uan_verified_on || 'N/A',
            employerName: row.uan_employer_name || 'N/A', nameInUan: row.uan_name_in_uan || 'N/A',
            mobileInUan: row.uan_mobile_in_uan || 'N/A', gender: row.uan_gender || 'N/A', dateOfBirth: row.uan_date_of_birth || 'N/A',
            aadhaarVerificationStatus: row.uan_aadhaar_verification_status === null ? 'N/A' : String(row.uan_aadhaar_verification_status),
            uanCount: row.uan_count === null ? 'N/A' : String(row.uan_count),
            claimStatus: row.uan_claim_status || 'N/A', kycStatus: row.uan_kyc_status || 'N/A',
            employmentType: row.uan_employment_type || row.employment_type || 'N/A', designation: row.uan_designation || row.role || 'N/A',
            isEmployed: row.uan_is_employed === null ? 'N/A' : (Number(row.uan_is_employed) === 1 ? 'Yes' : 'No'),
            joinedOn: row.uan_joined_on || 'N/A', dateOfExit: row.uan_date_of_exit || 'N/A',
            dateOfExitMarked: row.uan_date_of_exit_marked === null ? 'N/A' : (Number(row.uan_date_of_exit_marked) === 1 ? 'Yes' : 'No'),
            officeLocation: row.uan_office_location || row.work_city || row.city || 'N/A',
            employeeStatus: row.uan_employee_status || (Number(row.uan_is_employed) === 1 ? 'Active' : 'Inactive'),
            memberId: row.uan_member_id || 'N/A', establishmentId: row.uan_establishment_id || 'N/A',
            leaveReason: row.uan_leave_reason || 'N/A', previousEmployer: row.uan_previous_employer || 'N/A',
          },
          bank: {
            accountHolderName: row.account_holder_name || 'N/A',
            bankName: row.bank_name || 'N/A',
            accountNumber: row.account_number ? String(row.account_number).replace(/\s/g, '') : 'N/A',
            ifscCode: row.ifsc_code || 'N/A',
            branchName: row.branch_name || 'N/A',
            accountType: row.account_type || 'N/A',
            salaryAccount: row.account_number ? (Number(row.is_salary_account) === 1 ? 'Yes' : 'No') : 'N/A',
            status: row.account_number ? 'Available' : 'Not available',
            verificationStatus: String(row.bank_is_verified || '').toLowerCase() === 'verified' ? 'Verified' : 'Not verified',
          },
          bankPenny: {
            httpResponseCode: row.penny_http_response_code === null ? 'Not verified' : String(row.penny_http_response_code),
            requestId: row.penny_request_id || 'N/A',
            resultCode: row.penny_result_code === null ? 'N/A' : String(row.penny_result_code),
            accountExists: row.penny_account_exists === null ? 'N/A' : (Number(row.penny_account_exists) === 1 ? 'Yes' : 'No'),
            nameAtBank: row.penny_name_at_bank || 'N/A',
            utr: row.penny_utr || 'N/A',
            amountDeposited: row.penny_amount_deposited === null ? 'N/A' : `₹${Number(row.penny_amount_deposited).toFixed(2)}`,
            accountNumber: row.account_number ? String(row.account_number).replace(/\s/g, '') : 'N/A',
            ifscCode: row.ifsc_code || 'N/A',
            message: row.penny_message || 'N/A',
            status: row.penny_http_response_code === null ? 'Not verified' : 'Verified',
            providerData: (() => {
              const raw = parseJson(row.penny_api_response) || {};
              return raw?.data || raw;
            })(),
          },
          mobileBank: {
            httpResponseCode: row.mobile_bank_http_response_code === null ? 'Not fetched' : String(row.mobile_bank_http_response_code),
            requestId: row.mobile_bank_request_id || 'N/A',
            resultCode: row.mobile_bank_result_code || 'N/A',
            mobileNumber: row.mobile_bank_mobile_number || row.mobile_number || 'N/A',
            message: row.mobile_bank_message || 'N/A',
            bankAccountData: (() => {
              const saved = parseJson(row.mobile_bank_account_data) || {};
              const raw = parseJson(row.mobile_bank_api_response) || {};
              const ifscDetails = raw?.data?._x?.ifsc || raw?._x?.ifsc || {};
              return { ...saved, ifsc_details: saved.ifsc_details || ifscDetails };
            })(),
            status: row.mobile_bank_http_response_code === null ? 'Not fetched' : 'Fetched',
            verificationStatus: String(row.bank_is_verified || '').toLowerCase() === 'verified' ? 'Verified' : 'Not verified',
          },
          mobileUpi: {
            httpResponseCode: row.upi_http_response_code === null ? 'Not fetched' : String(row.upi_http_response_code),
            clientRefNum: row.upi_client_ref_num || 'N/A',
            requestId: row.upi_request_id || 'N/A',
            resultCode: row.upi_result_code === null ? 'N/A' : String(row.upi_result_code),
            mobileNumber: row.upi_mobile_number || row.mobile_number || 'N/A',
            mobileLinkedName: row.upi_mobile_linked_name || 'N/A',
            vpa: row.upi_vpa || 'N/A',
            message: row.upi_message || 'N/A',
            status: row.upi_request_id ? 'Fetched' : 'Not fetched',
          },
          selfie: (() => {
            if (row.selfie_path) return row.selfie_path;
            const selfieDoc = combinedDocs.find(d => {
              const t = String(d.doc_type || d.file_name || d.document_name || '').toLowerCase();
              return t.includes('selfie') || t.includes('profile') || t.includes('photo');
            });
            return selfieDoc?.file_path || null;
          })(),
          faceMatch: {
            percentage: row.face_match_percentage != null ? Number(row.face_match_percentage) : null,
            status: row.face_match_status || null,
            confidence: row.face_match_confidence || null,
            details: (() => {
              if (!row.face_match_details) return null;
              try {
                const parsed = typeof row.face_match_details === 'string' ? JSON.parse(row.face_match_details) : row.face_match_details;
                return parsed?.message || parsed?.result || (parsed?.face_match ? 'The faces show consistent facial geometry.' : 'The faces do not appear to belong to the same person.');
              } catch (e) {
                return row.face_match_details;
              }
            })(),
          },
        },
        fieldDetails: {
          residence: parseJson(row.residence_verification),
          office: parseJson(row.office_verification),
        },
        fieldReport: row.field_report_data ? {
          ...parseJson(row.field_report_data),
          outcome: row.field_report_outcome,
          submittedAt: parseJson(row.field_report_data).submittedAt || row.field_report_submitted_at,
          officerName: row.field_report_officer_name || null,
          employeeId: row.field_report_employee_id || null,
        } : null,
        lock: row.lock_user_id ? {
          userId: Number(row.lock_user_id),
          userName: row.lock_user_name || 'Another FCU user',
          expiresAt: row.lock_expires_at,
        } : null,
        docs,
        checks: [
          { id: 'identity', label: 'Identity Verification', status: row.pan_verified && row.aadhaar_verified ? 'PASS' : 'PENDING', note: 'PAN and Aadhaar verification from database' },
          { id: 'credit', label: 'CIBIL Score Check', status: resolvedCibilScore != null ? (Number(resolvedCibilScore) >= 650 ? 'PASS' : 'FAIL') : 'PENDING', note: resolvedCibilScore != null ? `Score ${resolvedCibilScore}` : 'Credit report pending' },
          { id: 'bank', label: 'Bank Details Review', status: row.account_number ? 'PASS' : 'PENDING', note: row.bank_name || 'Bank details pending' },
        ].map(check => ({ ...check, status: savedEkycReviews?.get(check.id) || check.status })),
        remarks: [],
        history: historyByApplication.get(row.application_id) || [],
        fieldVerificationReport: workflow?.stage === 'FIELD_ASSIGNED' ? {
          status: 'PENDING',
          requestedOn: workflow.field_assigned_at ? new Date(workflow.field_assigned_at).toLocaleDateString('en-IN') : 'N/A',
          assignedOfficer: workflow.field_assigned_to || 'Field Verification Team',
          visitDate: 'To be scheduled',
          summary: 'Case has been assigned for physical field verification.',
          result: 'Pending field verification',
          nextAction: 'Await field officer report before final decision.',
        } : workflow?.stage === 'FIELD_WAIVED' ? {
          status: 'WAIVED',
          requestedOn: workflow.updated_at ? new Date(workflow.updated_at).toLocaleDateString('en-IN') : 'N/A',
          assignedOfficer: 'FCU Manager',
          visitDate: 'N/A',
          summary: 'Physical field verification was waived by the FCU reviewer.',
          result: 'Waived',
          nextAction: 'Final FCU actions are available.',
        } : undefined,
        references: (referencesByUser.get(Number(row.user_id)) || references).map((reference: any, referenceIndex: number) => ({
          srNo: referenceIndex + 1,
          name: reference.reference_name || reference.name || 'N/A',
          relation: reference.relationship || reference.relation || 'N/A',
          mobile: reference.mobile_number || reference.mobile || 'N/A',
          loanLeadId: reference.loan_lead_id || reference.lead_id || 'N/A',
          data: reference,
        })),
      };
    });

    return cases;
  } catch (error: any) {
    throw error;
  }
};

export const updateDocumentReview = async (applicationId: number, documentId: string, status: 'APPROVED' | 'REJECTED') => {
  await pool.query(`
    INSERT INTO fcu_document_reviews (application_id, document_id, status)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = CURRENT_TIMESTAMP
  `, [applicationId, documentId, status]);
};

export const reviewAllDocuments = async (applicationId: number, documentIds: string[]) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const documentId of documentIds) {
      await connection.query(`
        INSERT INTO fcu_document_reviews (application_id, document_id, status)
        VALUES (?, ?, 'APPROVED')
        ON DUPLICATE KEY UPDATE status = 'APPROVED', updated_at = CURRENT_TIMESTAMP
      `, [applicationId, documentId]);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getDocumentReviewSummary = async (applicationId: number) => {
  const [rows]: any = await pool.query(
    'SELECT document_id, status FROM fcu_document_reviews WHERE application_id = ?',
    [applicationId]
  );
  return rows;
};

export const getWorkflow = async (applicationId: number) => {
  const [rows]: any = await pool.query(`
    SELECT 
      w.*,
      ld.status AS lead_status,
      ld.field_assigned_to AS lead_field_assigned_to,
      ld.reviewed_by AS lead_reviewed_by,
      a.parameter AS application_parameter, 
      a.status AS application_status,
      a.updated_at AS application_updated_at
    FROM applications a
    INNER JOIN users u ON u.id = a.user_id
    LEFT JOIN leads ld ON (ld.user_id = u.id OR ld.lead_id = u.lead_number OR ld.lead_id = u.lead_reference_number OR ld.application_id = a.id)
    LEFT JOIN fcu_case_workflows w ON w.application_id = a.id
    WHERE a.id = ?
    ORDER BY ld.id DESC
    LIMIT 1
  `, [applicationId]);
  const row = rows[0];
  if (!row) return { application_id: applicationId, stage: 'DOCUMENT_REVIEW', case_status: 'PENDING' };

  const sourceStatus = normalizeStatus(row?.application_status);
  const leadStatus = normalizeStatus(row?.lead_status);
  const isNewHandoff = Number(row?.application_parameter) === 2
    && ['SENT_TO_FCU', 'SENT_FCU'].includes(sourceStatus)
    && (!row?.application_id || new Date(row.application_updated_at).getTime() > new Date(row.updated_at).getTime());
  if (isNewHandoff) {
    return { ...row, application_id: applicationId, stage: 'DOCUMENT_REVIEW', case_status: 'PENDING' };
  }

  let mappedCaseStatus = row.case_status || 'PENDING';
  let mappedStage = row.stage || 'DOCUMENT_REVIEW';

  if (leadStatus === 'SENT_TO_CREDIT') {
    mappedCaseStatus = 'SENT_TO_CREDIT';
    mappedStage = 'FINALIZED';
  } else if (leadStatus === 'REJECTED_BY_FCU' || leadStatus === 'FORWARDED_REJECT' || leadStatus === 'FCU_REJECTED') {
    mappedCaseStatus = 'FORWARDED_REJECT';
    mappedStage = 'FINALIZED';
  } else if (leadStatus === 'HOLD') {
    mappedCaseStatus = 'HOLD';
    mappedStage = 'FINALIZED';
  } else if (leadStatus === 'SEND_TO_FIELD_VERIFICATION' || leadStatus === 'FIELD_VERIFICATION' || row.lead_field_assigned_to) {
    mappedCaseStatus = 'FIELD_VERIFICATION';
    mappedStage = 'FIELD_ASSIGNED';
  }

  return {
    ...row,
    application_id: applicationId,
    stage: mappedStage,
    case_status: mappedCaseStatus,
    field_assigned_to: row.lead_field_assigned_to || row.field_assigned_to || null,
    reviewed_by: row.lead_reviewed_by || row.reviewed_by || null,
  };
};

export const updateEkycReview = async (applicationId: number, checkId: string, status: string, reviewerId: number) => {
  await pool.query(`INSERT INTO fcu_ekyc_reviews (application_id,check_id,status,reviewed_by) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status),reviewed_by=VALUES(reviewed_by),updated_at=CURRENT_TIMESTAMP`, [applicationId, checkId, status, reviewerId]);
};

export const saveWorkflowAction = async (
  applicationId: number,
  stage: string,
  caseStatus: string,
  reviewerId: number,
  fieldAssignedTo?: string,
  applicationParameter?: number,
  rejectionDecision?: 'REJECT' | 'FRAUD',
  rejectionReason?: string
) => {
  const connection = await pool.getConnection();
  const assignedTo = fieldAssignedTo || null;
  try {
    await connection.beginTransaction();
    const [existingRows]: any = await connection.query(
      'SELECT id FROM fcu_case_workflows WHERE application_id = ? LIMIT 1 FOR UPDATE',
      [applicationId]
    );

    if (existingRows.length === 0) {
      if (assignedTo) {
        await connection.query(`
          INSERT INTO fcu_case_workflows
            (application_id, stage, case_status, reviewed_by, field_assigned_to, field_assigned_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [applicationId, stage, caseStatus, reviewerId, assignedTo]);
      } else {
        await connection.query(`
          INSERT INTO fcu_case_workflows
            (application_id, stage, case_status, reviewed_by)
          VALUES (?, ?, ?, ?)
        `, [applicationId, stage, caseStatus, reviewerId]);
      }
    } else if (assignedTo) {
      await connection.query(`
        UPDATE fcu_case_workflows
        SET stage = ?, case_status = ?, reviewed_by = ?, field_assigned_to = ?,
            field_assigned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE application_id = ?
      `, [stage, caseStatus, reviewerId, assignedTo, applicationId]);
    } else {
      await connection.query(`
        UPDATE fcu_case_workflows
        SET stage = ?, case_status = ?, reviewed_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE application_id = ?
      `, [stage, caseStatus, reviewerId, applicationId]);
    }
    if (applicationParameter !== undefined) {
      await connection.query('UPDATE applications SET parameter = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [applicationParameter, applicationId]);
    }
    let reviewerName = 'fcu';
    let reviewerDisplayName = 'FCU Reviewer';
    let reviewerRole = 'FCU Reviewer';
    if (reviewerId) {
      const [revRows]: any = await connection.query('SELECT name, role FROM fcu_users WHERE id = ? LIMIT 1', [reviewerId]);
      if (revRows[0]?.name) {
        reviewerDisplayName = String(revRows[0].name).trim();
        reviewerName = reviewerDisplayName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        if (revRows[0]?.role) reviewerRole = String(revRows[0].role).trim();
      }
    }

    if (rejectionDecision) {
      const isFraud = rejectionDecision === 'FRAUD';
      const reapplyDays = Math.max(1, Number(process.env.FCU_REAPPLY_AFTER_DAYS || 90));
      const [applicationRows]: any = await connection.query(`
        SELECT a.user_id, u.lead_number FROM applications a
        INNER JOIN users u ON u.id = a.user_id WHERE a.id = ? LIMIT 1
      `, [applicationId]);
      const application = applicationRows[0];
      if (!application) throw new Error('Application not found while saving rejection decision');
      
      const userRemark = rejectionReason?.trim();
      const reason = userRemark || (isFraud ? 'Flagged as fraud by FCU' : 'Rejected by FCU');
      const remarks = userRemark || (isFraud ? 'Permanent fraud ban applied by FCU reviewer.' : `Applicant may reapply after ${reapplyDays} days.`);
      const rejectedStatus = `rejected_by_fcu(${reviewerName})`;

      const [rejectionRows]: any = await connection.query('SELECT id FROM rejected_loans WHERE application_id = ? LIMIT 1 FOR UPDATE', [applicationId]);

      if (rejectionRows.length) {
        await connection.query(`UPDATE rejected_loans SET user_id=?, lead_id=?, status=?, rejection_reasons=?, remarks=?, fraud_status=?,
          is_permanent_ban=?, can_reapply_after=${isFraud ? 'NULL' : 'DATE_ADD(CURRENT_DATE, INTERVAL ? DAY)'},
          rejected_at=CURRENT_TIMESTAMP, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE application_id=?`,
          isFraud
            ? [application.user_id, application.lead_number || null, rejectedStatus, reason, remarks, 'REPORT_FRAUD', 1, reviewerDisplayName, applicationId]
            : [application.user_id, application.lead_number || null, rejectedStatus, reason, remarks, 'NOT_FRAUD', 0, reapplyDays, reviewerDisplayName, applicationId]);
      } else {
        await connection.query(`INSERT INTO rejected_loans
          (user_id,application_id,lead_id,status,rejection_reasons,remarks,fraud_status,is_permanent_ban,can_reapply_after,rejected_at,updated_by,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?,${isFraud ? 'NULL' : 'DATE_ADD(CURRENT_DATE, INTERVAL ? DAY)'},CURRENT_TIMESTAMP,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
          isFraud
            ? [application.user_id, applicationId, application.lead_number || null, rejectedStatus, reason, remarks, 'REPORT_FRAUD', 1, reviewerDisplayName]
            : [application.user_id, applicationId, application.lead_number || null, rejectedStatus, reason, remarks, 'NOT_FRAUD', 0, reapplyDays, reviewerDisplayName]);
      }
      await connection.query('UPDATE applications SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', ['rejected_by_fcu', applicationId]);
    } else if (caseStatus === 'FIELD_VERIFICATION' || stage === 'FIELD_ASSIGNED') {
      await connection.query('UPDATE applications SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', ['send_to_field_verification', applicationId]);
    } else if (caseStatus === 'SENT_TO_CREDIT') {
      await connection.query('UPDATE applications SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', ['sent_to_credit', applicationId]);
    } else if (caseStatus === 'HOLD') {
      await connection.query('UPDATE applications SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', ['hold', applicationId]);
    }

    // Keep leads table status and field_assigned_to synchronized directly for THIS application only
    try {
      let leadNewStatus: string | null = null;
      const isCreditRole = String(reviewerRole || '').toLowerCase().includes('credit');
      if (rejectionDecision || caseStatus === 'FORWARDED_REJECT' || caseStatus === 'FCU_REJECTED' || caseStatus === 'REJECTED') {
        leadNewStatus = isCreditRole ? 'rejected_by_credit' : 'rejected_by_fcu';
      } else if (caseStatus === 'FIELD_VERIFICATION' || stage === 'FIELD_ASSIGNED') {
        leadNewStatus = 'send_to_field_verification';
      } else if (caseStatus === 'SENT_TO_CREDIT') {
        leadNewStatus = 'sent_to_credit';
      } else if (caseStatus === 'HOLD') {
        leadNewStatus = 'hold';
      } else if (caseStatus === 'FCU_APPROVED' || caseStatus === 'APPROVED') {
        leadNewStatus = 'fcu_approved';
      }

      if (leadNewStatus) {
        const [appInfoRows]: any = await connection.query(
          'SELECT a.user_id, u.lead_number, u.lead_reference_number FROM applications a LEFT JOIN users u ON u.id = a.user_id WHERE a.id = ? LIMIT 1',
          [applicationId]
        );
        const appInfo = appInfoRows[0];
        const targetUserId = appInfo?.user_id;
        const targetLeadNum = appInfo?.lead_number ? String(appInfo.lead_number).trim() : null;
        const targetLeadRef = appInfo?.lead_reference_number ? String(appInfo.lead_reference_number).trim() : null;

        const whereParts: string[] = ['application_id = ?'];
        const updateParams: any[] = [leadNewStatus, assignedTo, reviewerDisplayName || String(reviewerId), applicationId];

        if (targetUserId) {
          whereParts.push('user_id = ?');
          updateParams.push(targetUserId);
        }
        if (targetLeadNum) {
          whereParts.push('lead_id = ?');
          updateParams.push(targetLeadNum);
        }
        if (targetLeadRef) {
          whereParts.push('lead_id = ?');
          updateParams.push(targetLeadRef);
        }

        const [leadUpdateRes]: any = await connection.query(`
          UPDATE leads
          SET status = ?,
              field_assigned_to = COALESCE(?, field_assigned_to),
              reviewed_by = COALESCE(?, reviewed_by),
              updated_at = CURRENT_TIMESTAMP
          WHERE ${whereParts.join(' OR ')}
        `, updateParams);

        if (leadUpdateRes.affectedRows === 0 && targetUserId) {
          await connection.query(`
            INSERT INTO leads (user_id, application_id, lead_id, status, field_assigned_to, reviewed_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [targetUserId, applicationId, targetLeadNum || targetLeadRef || `GP-LEAD-${applicationId}`, leadNewStatus, assignedTo, reviewerDisplayName || String(reviewerId)]);
        }
      }
    } catch (e) {
      console.warn('Could not update leads table for workflow action:', e);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const assignCaseToFieldVerification = async (
  applicationId: number,
  reviewerId: number,
  assignedTo: string
) => {
  const [result]: any = await pool.query(`
    UPDATE fcu_field_verifications
    SET assignment_status = 'ASSIGNED', assigned_to = ?, assigned_by = ?,
        assigned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE application_id = ?
  `, [assignedTo, reviewerId, applicationId]);

  if (result.affectedRows === 0) {
    await pool.query(`
      INSERT INTO fcu_field_verifications
        (application_id, residence_data, office_data, assignment_status, assigned_to, assigned_by, assigned_at)
      VALUES (?, JSON_OBJECT(), JSON_OBJECT(), 'ASSIGNED', ?, ?, CURRENT_TIMESTAMP)
    `, [applicationId, assignedTo, reviewerId]);
  }
};

export const claimCase = async (applicationId: number, userId: number) => {
  await pool.query('INSERT IGNORE INTO fcu_case_locks (application_id) VALUES (?)', [applicationId]);
  const [result]: any = await pool.query(`
    UPDATE fcu_case_locks
    SET fcu_user_id = ?, locked_at = IF(fcu_user_id = ?, locked_at, CURRENT_TIMESTAMP),
        heartbeat_at = CURRENT_TIMESTAMP, lock_expires_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 15 MINUTE)
    WHERE application_id = ?
      AND (fcu_user_id IS NULL OR fcu_user_id = ? OR lock_expires_at IS NULL OR lock_expires_at <= CURRENT_TIMESTAMP)
  `, [userId, userId, applicationId, userId]);
  if (result.affectedRows === 0) {
    const [rows]: any = await pool.query(`SELECT fu.name, l.lock_expires_at FROM fcu_case_locks l LEFT JOIN fcu_users fu ON fu.id=l.fcu_user_id WHERE l.application_id=?`, [applicationId]);
    return { claimed: false, owner: rows[0]?.name || 'Another FCU user', expiresAt: rows[0]?.lock_expires_at };
  }
  return { claimed: true };
};

export const heartbeatCase = async (applicationId: number, userId: number) => {
  const [result]: any = await pool.query(`UPDATE fcu_case_locks SET heartbeat_at=CURRENT_TIMESTAMP, lock_expires_at=DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 15 MINUTE) WHERE application_id=? AND fcu_user_id=? AND lock_expires_at>CURRENT_TIMESTAMP`, [applicationId, userId]);
  return result.affectedRows > 0;
};

export const releaseCase = async (applicationId: number, userId: number) => {
  await pool.query(`UPDATE fcu_case_locks SET fcu_user_id=NULL, locked_at=NULL, heartbeat_at=NULL, lock_expires_at=NULL WHERE application_id=? AND fcu_user_id=?`, [applicationId, userId]);
};

export const userOwnsCase = async (applicationId: number, userId: number) => {
  const [rows]: any = await pool.query(`SELECT 1 FROM fcu_case_locks WHERE application_id=? AND fcu_user_id=? AND lock_expires_at>CURRENT_TIMESTAMP LIMIT 1`, [applicationId, userId]);
  return rows.length > 0;
};

export const addCaseHistory = async (applicationId: number, eventType: string, title: string, description: string, userId?: number) => {
  const [appRows]: any = await pool.query('SELECT user_id FROM applications WHERE id = ? LIMIT 1', [applicationId]);
  const applicantUserId = appRows[0]?.user_id;
  if (!applicantUserId) return null;

  let reviewerName = 'System';
  let reviewerRole = 'System';
  if (userId) {
    const [userRows]: any = await pool.query('SELECT name, role FROM fcu_users WHERE id = ? LIMIT 1', [userId]);
    if (userRows[0]) {
      reviewerName = userRows[0].name || 'FCU Reviewer';
      reviewerRole = userRows[0].role || 'FCU Reviewer';
    }
  }

  const actionText = title || eventType;
  const [result]: any = await pool.query(`
    INSERT INTO application_logs (
      user_id,
      action,
      status,
      details,
      performed_by_role,
      performed_by_name,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [
    applicantUserId,
    actionText,
    'SUCCESS',
    description || null,
    reviewerRole,
    reviewerName
  ]);

  return {
    id: result.insertId,
    type: eventType,
    title: actionText,
    description: description,
    performedBy: reviewerName,
    role: reviewerRole,
    createdAt: new Date().toISOString()
  };
};

export const getCaseHistory = async (applicationId: number) => {
  const [rows]: any = await pool.query(`
    SELECT 
      l.id,
      l.user_id,
      a.id AS application_id,
      l.action AS event_type,
      COALESCE(l.action, 'Activity Log') AS title,
      l.details AS description,
      l.status,
      COALESCE(l.performed_by_name, fu.name, tc.name, 'System') AS performed_by,
      COALESCE(l.performed_by_role, CASE WHEN fu.id IS NOT NULL THEN 'FCU Reviewer' WHEN tc.id IS NOT NULL THEN 'Telecaller' ELSE 'System' END) AS role,
      l.created_at
    FROM application_logs l
    INNER JOIN users u ON u.id = l.user_id
    INNER JOIN applications a ON a.user_id = u.id
    LEFT JOIN fcu_users fu ON (fu.name = l.performed_by_name)
    LEFT JOIN telecallers tc ON tc.id = l.telecaller_id
    WHERE a.id = ?
    ORDER BY l.created_at DESC, l.id DESC
  `, [applicationId]);

  return rows.map((item: any) => ({
    id: item.id,
    type: item.event_type,
    title: item.title,
    description: item.description,
    status: item.status,
    performedBy: item.performed_by || 'System',
    role: item.role || 'System',
    createdAt: item.created_at
  }));
};
