"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCaseHistory = exports.addCaseHistory = exports.userOwnsCase = exports.releaseCase = exports.heartbeatCase = exports.claimCase = exports.assignCaseToFieldVerification = exports.saveWorkflowAction = exports.updateEkycReview = exports.getWorkflow = exports.getDocumentReviewSummary = exports.reviewAllDocuments = exports.updateDocumentReview = exports.findAllCases = void 0;
const db_1 = __importDefault(require("../../config/db"));
const dbQuery_1 = require("../../config/dbQuery");
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
        const [rows] = await (0, dbQuery_1.dbQuery)(`
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
      ORDER BY a.created_at DESC, a.id DESC
    `);
        const [reviewRows] = await (0, dbQuery_1.dbQuery)('SELECT application_id, document_id, status FROM fcu_document_reviews');
        const [telecallerDocumentRows] = await (0, dbQuery_1.dbQuery)(`
      SELECT id, user_id, lead_id, doc_type, file_name, file_path, uploaded_by, created_at
      FROM customer_documents
      WHERE LOWER(TRIM(uploaded_by)) = 'telecaller'
      ORDER BY created_at DESC, id DESC
    `);
        const [workflowRows] = await (0, dbQuery_1.dbQuery)('SELECT * FROM fcu_case_workflows');
        const [ekycReviewRows] = await (0, dbQuery_1.dbQuery)('SELECT application_id, check_id, status FROM fcu_ekyc_reviews');
        const [creditRows] = await (0, dbQuery_1.dbQuery)('SELECT * FROM credit_report_details ORDER BY updated_at DESC, id DESC');
        const [referenceRows] = await (0, dbQuery_1.dbQuery)('SELECT * FROM references_details ORDER BY user_id, id');
        const [historyRows] = await (0, dbQuery_1.dbQuery)(`SELECT h.*,fu.name AS performed_by_name FROM fcu_case_history h LEFT JOIN fcu_users fu ON fu.id=h.performed_by ORDER BY h.created_at DESC,h.id DESC`);
        const reviewsByApplication = new Map();
        for (const review of reviewRows) {
            if (!reviewsByApplication.has(review.application_id))
                reviewsByApplication.set(review.application_id, new Map());
            reviewsByApplication.get(review.application_id).set(review.document_id, review.status);
        }
        const telecallerDocumentsByLead = new Map();
        for (const document of telecallerDocumentRows) {
            const leadId = String(document.lead_id || '').trim().toUpperCase();
            if (!leadId)
                continue;
            if (!telecallerDocumentsByLead.has(leadId))
                telecallerDocumentsByLead.set(leadId, []);
            telecallerDocumentsByLead.get(leadId).push(document);
        }
        const workflowByApplication = new Map(workflowRows.map((workflow) => [workflow.application_id, workflow]));
        const ekycReviewsByApplication = new Map();
        for (const review of ekycReviewRows) {
            if (!ekycReviewsByApplication.has(review.application_id))
                ekycReviewsByApplication.set(review.application_id, new Map());
            ekycReviewsByApplication.get(review.application_id).set(review.check_id, review.status);
        }
        const historyByApplication = new Map();
        for (const item of historyRows) {
            if (!historyByApplication.has(item.application_id))
                historyByApplication.set(item.application_id, []);
            historyByApplication.get(item.application_id).push({ id: item.id, type: item.event_type, title: item.title, description: item.description, performedBy: item.performed_by_name || 'System', createdAt: item.created_at });
        }
        const creditByUser = new Map();
        for (const credit of creditRows) {
            if (!creditByUser.has(Number(credit.user_id)))
                creditByUser.set(Number(credit.user_id), credit);
        }
        const referencesByUser = new Map();
        for (const reference of referenceRows) {
            const userId = Number(reference.user_id);
            if (!referencesByUser.has(userId))
                referencesByUser.set(userId, []);
            referencesByUser.get(userId).push(reference);
        }
        const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#4f46e5', '#db2777'];
        const cases = rows.map((row, index) => {
            const parseJson = (value) => value ? (typeof value === 'string' ? JSON.parse(value) : value) : {};
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
            const aadhaarProfileImage = row.aadhaar_profile_image
                ? String(row.aadhaar_profile_image).startsWith('data:')
                    ? String(row.aadhaar_profile_image)
                    : `data:image/jpeg;base64,${String(row.aadhaar_profile_image).replace(/\s+/g, '')}`
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
            const status = normalizeStatus(workflow?.case_status || applicationStatus);
            const caseLeadId = String(row.lead_number || '').trim().toUpperCase();
            const docs = (telecallerDocumentsByLead.get(caseLeadId) || []).map((document) => {
                const documentId = `customer-doc-${document.id}`;
                const documentName = String(document.doc_type || 'Customer Document').trim();
                const normalizedName = documentName.toLowerCase();
                const documentType = normalizedName.includes('bank') ? 'Banking'
                    : normalizedName.includes('selfie') || normalizedName.includes('photo') ? 'Photo'
                        : 'Identity';
                return {
                    id: documentId,
                    name: documentName,
                    type: documentType,
                    uploaded: document.created_at || row.updated_on,
                    // A newly uploaded document always requires an FCU decision. Only an
                    // explicit row in fcu_document_reviews can mark it approved/rejected.
                    status: savedReviews?.get(documentId) || 'PENDING',
                    fileUrl: document.file_path || null,
                    fileName: document.file_name || documentName,
                    details: {
                        'Lead ID': document.lead_id,
                        'Uploaded By': document.uploaded_by,
                        'File Name': document.file_name,
                    },
                };
            });
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
                secondaryResidenceAddressLine1: row.aadhaar_address || 'N/A',
                secondaryResidenceAddressLine2: aadhaarApi?.data?.address_line_2 || aadhaarApi?.address_line_2 || 'N/A',
                secondaryResidenceCity: aadhaarApi?.data?.city || aadhaarApi?.city || 'N/A',
                secondaryResidenceState: aadhaarApi?.data?.state || aadhaarApi?.state || 'N/A',
                secondaryResidencePincode: aadhaarApi?.data?.pincode || aadhaarApi?.data?.zip || aadhaarApi?.pincode || aadhaarApi?.zip || 'N/A',
                secondaryResidenceType: aadhaarApi?.data?.address_type || aadhaarApi?.address_type || 'N/A',
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
                    databaseColumns: Object.fromEntries(Object.entries(creditRecord).filter(([key]) => key !== 'api_response')),
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
                        photo: aadhaarProfileImage || aadhaarApi?.photo || aadhaarApi?.data?.photo || null,
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
                    selfie: row.selfie_path || null,
                    faceMatch: {
                        percentage: row.face_match_percentage != null ? Number(row.face_match_percentage) : null,
                        status: row.face_match_status || null,
                        confidence: row.face_match_confidence || null,
                        details: row.face_match_details || null,
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
                references: (referencesByUser.get(Number(row.user_id)) || references).map((reference, referenceIndex) => ({
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
    }
    catch (error) {
        throw error;
    }
};
exports.findAllCases = findAllCases;
const updateDocumentReview = async (applicationId, documentId, status) => {
    await db_1.default.query(`
    INSERT INTO fcu_document_reviews (application_id, document_id, status)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = CURRENT_TIMESTAMP
  `, [applicationId, documentId, status]);
};
exports.updateDocumentReview = updateDocumentReview;
const reviewAllDocuments = async (applicationId, documentIds) => {
    const connection = await db_1.default.getConnection();
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
    }
    catch (error) {
        await connection.rollback();
        throw error;
    }
    finally {
        connection.release();
    }
};
exports.reviewAllDocuments = reviewAllDocuments;
const getDocumentReviewSummary = async (applicationId) => {
    const [rows] = await db_1.default.query('SELECT document_id, status FROM fcu_document_reviews WHERE application_id = ?', [applicationId]);
    return rows;
};
exports.getDocumentReviewSummary = getDocumentReviewSummary;
const getWorkflow = async (applicationId) => {
    const [rows] = await db_1.default.query(`
    SELECT w.*, a.parameter AS application_parameter, a.status AS application_status,
           a.updated_at AS application_updated_at
    FROM applications a
    LEFT JOIN fcu_case_workflows w ON w.application_id = a.id
    WHERE a.id = ? LIMIT 1
  `, [applicationId]);
    const row = rows[0];
    const sourceStatus = normalizeStatus(row?.application_status);
    const isNewHandoff = Number(row?.application_parameter) === 2
        && ['SENT_TO_FCU', 'SENT_FCU'].includes(sourceStatus)
        && (!row?.application_id || new Date(row.application_updated_at).getTime() > new Date(row.updated_at).getTime());
    if (isNewHandoff) {
        return { ...row, application_id: applicationId, stage: 'DOCUMENT_REVIEW', case_status: 'PENDING' };
    }
    return row?.application_id ? row : { application_id: applicationId, stage: 'DOCUMENT_REVIEW', case_status: 'PENDING' };
};
exports.getWorkflow = getWorkflow;
const updateEkycReview = async (applicationId, checkId, status, reviewerId) => {
    await db_1.default.query(`INSERT INTO fcu_ekyc_reviews (application_id,check_id,status,reviewed_by) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status),reviewed_by=VALUES(reviewed_by),updated_at=CURRENT_TIMESTAMP`, [applicationId, checkId, status, reviewerId]);
};
exports.updateEkycReview = updateEkycReview;
const saveWorkflowAction = async (applicationId, stage, caseStatus, reviewerId, fieldAssignedTo, applicationParameter, rejectionDecision, rejectionReason) => {
    const connection = await db_1.default.getConnection();
    const assignedTo = fieldAssignedTo || null;
    try {
        await connection.beginTransaction();
        const [existingRows] = await connection.query('SELECT id FROM fcu_case_workflows WHERE application_id = ? LIMIT 1 FOR UPDATE', [applicationId]);
        if (existingRows.length === 0) {
            if (assignedTo) {
                await connection.query(`
          INSERT INTO fcu_case_workflows
            (application_id, stage, case_status, reviewed_by, field_assigned_to, field_assigned_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [applicationId, stage, caseStatus, reviewerId, assignedTo]);
            }
            else {
                await connection.query(`
          INSERT INTO fcu_case_workflows
            (application_id, stage, case_status, reviewed_by)
          VALUES (?, ?, ?, ?)
        `, [applicationId, stage, caseStatus, reviewerId]);
            }
        }
        else if (assignedTo) {
            await connection.query(`
        UPDATE fcu_case_workflows
        SET stage = ?, case_status = ?, reviewed_by = ?, field_assigned_to = ?,
            field_assigned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE application_id = ?
      `, [stage, caseStatus, reviewerId, assignedTo, applicationId]);
        }
        else {
            await connection.query(`
        UPDATE fcu_case_workflows
        SET stage = ?, case_status = ?, reviewed_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE application_id = ?
      `, [stage, caseStatus, reviewerId, applicationId]);
        }
        if (applicationParameter !== undefined) {
            await connection.query('UPDATE applications SET parameter = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [applicationParameter, applicationId]);
        }
        if (rejectionDecision) {
            const isFraud = rejectionDecision === 'FRAUD';
            const reapplyDays = Math.max(1, Number(process.env.FCU_REAPPLY_AFTER_DAYS || 90));
            const [applicationRows] = await connection.query(`
        SELECT a.user_id, u.lead_number FROM applications a
        INNER JOIN users u ON u.id = a.user_id WHERE a.id = ? LIMIT 1
      `, [applicationId]);
            const application = applicationRows[0];
            if (!application)
                throw new Error('Application not found while saving rejection decision');
            const reason = rejectionReason?.trim() || (isFraud ? 'Flagged as fraud by FCU' : 'Rejected by FCU');
            const remarks = isFraud ? 'Permanent fraud ban applied by FCU reviewer.' : `Applicant may reapply after ${reapplyDays} days.`;
            const [rejectionRows] = await connection.query('SELECT id FROM rejected_loans WHERE application_id = ? LIMIT 1 FOR UPDATE', [applicationId]);
            if (rejectionRows.length) {
                await connection.query(`UPDATE rejected_loans SET user_id=?, lead_id=?, rejection_reasons=?, remarks=?, fraud_status=?,
          is_permanent_ban=?, can_reapply_after=${isFraud ? 'NULL' : 'DATE_ADD(CURRENT_DATE, INTERVAL ? DAY)'},
          rejected_at=CURRENT_TIMESTAMP, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE application_id=?`, isFraud
                    ? [application.user_id, application.lead_number || null, reason, remarks, 'REPORT_FRAUD', 1, reviewerId, applicationId]
                    : [application.user_id, application.lead_number || null, reason, remarks, 'NOT_FRAUD', 0, reapplyDays, reviewerId, applicationId]);
            }
            else {
                await connection.query(`INSERT INTO rejected_loans
          (user_id,application_id,lead_id,rejection_reasons,remarks,fraud_status,is_permanent_ban,can_reapply_after,rejected_at,updated_by,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,${isFraud ? 'NULL' : 'DATE_ADD(CURRENT_DATE, INTERVAL ? DAY)'},CURRENT_TIMESTAMP,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`, isFraud
                    ? [application.user_id, applicationId, application.lead_number || null, reason, remarks, 'REPORT_FRAUD', 1, reviewerId]
                    : [application.user_id, applicationId, application.lead_number || null, reason, remarks, 'NOT_FRAUD', 0, reapplyDays, reviewerId]);
            }
            await connection.query('UPDATE applications SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', ['rejected', applicationId]);
        }
        await connection.commit();
    }
    catch (error) {
        await connection.rollback();
        throw error;
    }
    finally {
        connection.release();
    }
};
exports.saveWorkflowAction = saveWorkflowAction;
const assignCaseToFieldVerification = async (applicationId, reviewerId, assignedTo) => {
    const [result] = await db_1.default.query(`
    UPDATE fcu_field_verifications
    SET assignment_status = 'ASSIGNED', assigned_to = ?, assigned_by = ?,
        assigned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE application_id = ?
  `, [assignedTo, reviewerId, applicationId]);
    if (result.affectedRows === 0) {
        await db_1.default.query(`
      INSERT INTO fcu_field_verifications
        (application_id, residence_data, office_data, assignment_status, assigned_to, assigned_by, assigned_at)
      VALUES (?, JSON_OBJECT(), JSON_OBJECT(), 'ASSIGNED', ?, ?, CURRENT_TIMESTAMP)
    `, [applicationId, assignedTo, reviewerId]);
    }
};
exports.assignCaseToFieldVerification = assignCaseToFieldVerification;
const claimCase = async (applicationId, userId) => {
    await db_1.default.query('INSERT IGNORE INTO fcu_case_locks (application_id) VALUES (?)', [applicationId]);
    const [result] = await db_1.default.query(`
    UPDATE fcu_case_locks
    SET fcu_user_id = ?, locked_at = IF(fcu_user_id = ?, locked_at, CURRENT_TIMESTAMP),
        heartbeat_at = CURRENT_TIMESTAMP, lock_expires_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 15 MINUTE)
    WHERE application_id = ?
      AND (fcu_user_id IS NULL OR fcu_user_id = ? OR lock_expires_at IS NULL OR lock_expires_at <= CURRENT_TIMESTAMP)
  `, [userId, userId, applicationId, userId]);
    if (result.affectedRows === 0) {
        const [rows] = await db_1.default.query(`SELECT fu.name, l.lock_expires_at FROM fcu_case_locks l LEFT JOIN fcu_users fu ON fu.id=l.fcu_user_id WHERE l.application_id=?`, [applicationId]);
        return { claimed: false, owner: rows[0]?.name || 'Another FCU user', expiresAt: rows[0]?.lock_expires_at };
    }
    return { claimed: true };
};
exports.claimCase = claimCase;
const heartbeatCase = async (applicationId, userId) => {
    const [result] = await db_1.default.query(`UPDATE fcu_case_locks SET heartbeat_at=CURRENT_TIMESTAMP, lock_expires_at=DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 15 MINUTE) WHERE application_id=? AND fcu_user_id=? AND lock_expires_at>CURRENT_TIMESTAMP`, [applicationId, userId]);
    return result.affectedRows > 0;
};
exports.heartbeatCase = heartbeatCase;
const releaseCase = async (applicationId, userId) => {
    await db_1.default.query(`UPDATE fcu_case_locks SET fcu_user_id=NULL, locked_at=NULL, heartbeat_at=NULL, lock_expires_at=NULL WHERE application_id=? AND fcu_user_id=?`, [applicationId, userId]);
};
exports.releaseCase = releaseCase;
const userOwnsCase = async (applicationId, userId) => {
    const [rows] = await db_1.default.query(`SELECT 1 FROM fcu_case_locks WHERE application_id=? AND fcu_user_id=? AND lock_expires_at>CURRENT_TIMESTAMP LIMIT 1`, [applicationId, userId]);
    return rows.length > 0;
};
exports.userOwnsCase = userOwnsCase;
const addCaseHistory = async (applicationId, eventType, title, description, userId) => {
    const [result] = await db_1.default.query('INSERT INTO fcu_case_history (application_id,event_type,title,description,performed_by) VALUES (?,?,?,?,?)', [applicationId, eventType, title, description, userId || null]);
    const [rows] = await db_1.default.query(`SELECT h.*,fu.name AS performed_by_name FROM fcu_case_history h LEFT JOIN fcu_users fu ON fu.id=h.performed_by WHERE h.id=?`, [result.insertId]);
    const item = rows[0];
    return { id: item.id, type: item.event_type, title: item.title, description: item.description, performedBy: item.performed_by_name || 'System', createdAt: item.created_at };
};
exports.addCaseHistory = addCaseHistory;
const getCaseHistory = async (applicationId) => {
    const [rows] = await db_1.default.query(`SELECT h.*,fu.name AS performed_by_name FROM fcu_case_history h LEFT JOIN fcu_users fu ON fu.id=h.performed_by WHERE h.application_id=? ORDER BY h.created_at DESC,h.id DESC`, [applicationId]);
    return rows.map((item) => ({ id: item.id, type: item.event_type, title: item.title, description: item.description, performedBy: item.performed_by_name || 'System', createdAt: item.created_at }));
};
exports.getCaseHistory = getCaseHistory;
