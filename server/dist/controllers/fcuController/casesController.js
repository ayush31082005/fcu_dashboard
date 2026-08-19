"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCaseNote = exports.listCaseHistory = exports.performWorkflowAction = exports.reviewEkycCheck = exports.approveAllDocuments = exports.reviewDocument = exports.releaseCaseReview = exports.keepCaseClaimAlive = exports.claimCaseForReview = exports.getCases = void 0;
const casesModel_1 = require("../../models/fcuModels/casesModel");
const authModel_1 = require("../../models/fcuModels/authModel");
const whatsapp_1 = require("../../utils/whatsapp");
const parseApplicationId = (value) => {
    const raw = Array.isArray(value) ? value[0] : value;
    const numericId = Number(String(raw).replace(/^APP0*/i, ''));
    return Number.isInteger(numericId) && numericId > 0 ? numericId : null;
};
const getCases = async (req, res) => {
    try {
        const cases = await (0, casesModel_1.findAllCases)();
        const currentUserId = Number(req.fcuUser?.id);
        res.json({ status: 'success', data: cases.map(item => ({ ...item, lock: item.lock ? { ...item.lock, isMine: item.lock.userId === currentUserId } : null })) });
    }
    catch (error) {
        console.error('FCU cases error:', error);
        res.status(500).json({ status: 'error', message: 'Unable to load FCU applications' });
    }
};
exports.getCases = getCases;
const claimCaseForReview = async (req, res) => {
    const applicationId = parseApplicationId(req.params.caseId);
    if (!applicationId) {
        res.status(400).json({ status: 'error', message: 'Invalid application' });
        return;
    }
    const result = await (0, casesModel_1.claimCase)(applicationId, Number(req.fcuUser.id));
    if (!result.claimed) {
        res.status(409).json({ status: 'error', message: `This application is being reviewed by ${result.owner}`, data: result });
        return;
    }
    res.json({ status: 'success', data: { applicationId, expiresInMinutes: 15 } });
};
exports.claimCaseForReview = claimCaseForReview;
const keepCaseClaimAlive = async (req, res) => {
    const applicationId = parseApplicationId(req.params.caseId);
    if (!applicationId || !(await (0, casesModel_1.heartbeatCase)(applicationId, Number(req.fcuUser.id)))) {
        res.status(409).json({ status: 'error', message: 'Your review lock expired or belongs to another user' });
        return;
    }
    res.json({ status: 'success' });
};
exports.keepCaseClaimAlive = keepCaseClaimAlive;
const releaseCaseReview = async (req, res) => {
    const applicationId = parseApplicationId(req.params.caseId);
    if (!applicationId) {
        res.status(400).json({ status: 'error', message: 'Invalid application' });
        return;
    }
    await (0, casesModel_1.releaseCase)(applicationId, Number(req.fcuUser.id));
    res.json({ status: 'success' });
};
exports.releaseCaseReview = releaseCaseReview;
const ensureCaseOwner = async (req, res, applicationId) => {
    const userId = Number(req.fcuUser.id);
    if (await (0, casesModel_1.userOwnsCase)(applicationId, userId))
        return true;
    // A browser/server interruption can let the same user's heartbeat expire while
    // the review drawer is still open. Reclaim atomically; another user's live lock
    // remains protected by claimCase and still returns 409.
    const reclaimed = await (0, casesModel_1.claimCase)(applicationId, userId);
    if (reclaimed.claimed)
        return true;
    res.status(409).json({ status: 'error', message: `This application is being reviewed by ${reclaimed.owner}` });
    return false;
};
const reviewDocument = async (req, res) => {
    try {
        const applicationId = parseApplicationId(req.params.caseId);
        const documentId = String(req.params.documentId);
        const status = String(req.body.status || '').toUpperCase();
        const reason = String(req.body.reason || '').trim().slice(0, 1000);
        if (!applicationId || !['APPROVED', 'REJECTED'].includes(status)) {
            res.status(400).json({ status: 'error', message: 'Invalid application, document or review status' });
            return;
        }
        if (!(await ensureCaseOwner(req, res, applicationId)))
            return;
        const currentCase = (await (0, casesModel_1.findAllCases)()).find(item => item.databaseId === applicationId);
        const validDocumentIds = (currentCase?.docs || []).map((document) => String(document.id));
        if (!currentCase || !validDocumentIds.includes(documentId)) {
            res.status(400).json({ status: 'error', message: 'This document does not belong to the selected application' });
            return;
        }
        const workflow = await (0, casesModel_1.getWorkflow)(applicationId);
        if (workflow.stage !== 'DOCUMENT_REVIEW') {
            res.status(409).json({ status: 'error', message: 'Document decisions are locked after the application decision' });
            return;
        }
        if (status === 'REJECTED' && !reason) {
            res.status(400).json({ status: 'error', message: 'Rejection reason is required' });
            return;
        }
        await (0, casesModel_1.updateDocumentReview)(applicationId, documentId, status);
        await (0, casesModel_1.addCaseHistory)(applicationId, 'DOCUMENT_REVIEW', `${documentId.toUpperCase()} document ${status.toLowerCase()}`, status === 'REJECTED' ? `Reason: ${reason}` : `Document review status changed to ${status}.`, Number(req.fcuUser.id));
        res.json({ status: 'success', data: { documentId, status } });
    }
    catch (error) {
        console.error('FCU document review error:', error);
        res.status(500).json({ status: 'error', message: 'Unable to save document review' });
    }
};
exports.reviewDocument = reviewDocument;
const approveAllDocuments = async (req, res) => {
    try {
        const applicationId = parseApplicationId(req.params.caseId);
        if (!applicationId) {
            res.status(400).json({ status: 'error', message: 'Invalid application' });
            return;
        }
        if (!(await ensureCaseOwner(req, res, applicationId)))
            return;
        const currentCase = (await (0, casesModel_1.findAllCases)()).find(item => item.databaseId === applicationId);
        const documentIds = (currentCase?.docs || []).map((document) => String(document.id));
        if (!currentCase || !documentIds.length) {
            res.status(409).json({ status: 'error', message: 'No uploaded documents are available for approval' });
            return;
        }
        const workflow = await (0, casesModel_1.getWorkflow)(applicationId);
        if (workflow.stage !== 'DOCUMENT_REVIEW') {
            res.status(409).json({ status: 'error', message: 'Document decisions are locked after the application decision' });
            return;
        }
        await (0, casesModel_1.reviewAllDocuments)(applicationId, documentIds);
        await (0, casesModel_1.addCaseHistory)(applicationId, 'DOCUMENT_REVIEW', 'All documents approved', 'All required documents were approved.', Number(req.fcuUser.id));
        res.json({ status: 'success', data: { documents: documentIds, status: 'APPROVED' } });
    }
    catch (error) {
        console.error('FCU approve all error:', error);
        res.status(500).json({ status: 'error', message: 'Unable to approve documents' });
    }
};
exports.approveAllDocuments = approveAllDocuments;
const reviewEkycCheck = async (req, res) => {
    try {
        const applicationId = parseApplicationId(req.params.caseId);
        const checkId = String(req.params.checkId || '');
        const status = String(req.body.status || '').toUpperCase();
        if (!applicationId || !['identity', 'credit', 'bank'].includes(checkId) || !['PASS', 'FAIL', 'PENDING'].includes(status)) {
            res.status(400).json({ status: 'error', message: 'Invalid eKYC review' });
            return;
        }
        if (!(await ensureCaseOwner(req, res, applicationId)))
            return;
        const userId = Number(req.fcuUser.id);
        await (0, casesModel_1.updateEkycReview)(applicationId, checkId, status, userId);
        await (0, casesModel_1.addCaseHistory)(applicationId, 'EKYC_REVIEW', `${checkId} check marked ${status}`, `eKYC review status changed to ${status}.`, userId);
        res.json({ status: 'success', data: { checkId, status } });
    }
    catch (error) {
        console.error('FCU eKYC review error:', error);
        res.status(500).json({ status: 'error', message: 'Unable to save eKYC review' });
    }
};
exports.reviewEkycCheck = reviewEkycCheck;
const performWorkflowAction = async (req, res) => {
    try {
        const applicationId = parseApplicationId(req.params.caseId);
        const action = String(req.body.action || '').toUpperCase();
        const reason = String(req.body.reason || '').trim().slice(0, 1000);
        if (!applicationId) {
            res.status(400).json({ status: 'error', message: 'Invalid application' });
            return;
        }
        if (!(await ensureCaseOwner(req, res, applicationId)))
            return;
        if (['REJECT_CASE', 'FLAG_FRAUD'].includes(action) && !reason) {
            res.status(400).json({ status: 'error', message: action === 'FLAG_FRAUD' ? 'Fraud flag reason is required' : 'Rejection reason is required' });
            return;
        }
        const workflow = await (0, casesModel_1.getWorkflow)(applicationId);
        const currentCase = (await (0, casesModel_1.findAllCases)()).find(item => item.databaseId === applicationId);
        const allDocumentsApproved = !currentCase?.docs?.length || currentCase.docs.every((document) => document.status === 'APPROVED');
        const allEkycChecksPassed = !currentCase?.checks?.length || currentCase.checks.every((check) => check.status === 'PASS');
        const sessionUser = req.fcuUser;
        const reviewer = await (0, authModel_1.findFcuUserByEmail)(sessionUser.email);
        if (!reviewer || reviewer.status !== 'active') {
            res.clearCookie('fcu_token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
            });
            res.status(401).json({
                status: 'error',
                message: 'Your session belongs to an old database user. Please sign in again.',
                code: 'STALE_FCU_SESSION',
            });
            return;
        }
        let nextStage = workflow.stage;
        let caseStatus = workflow.case_status || 'PENDING';
        let fieldAssignedTo;
        if (action === 'FLAG_FRAUD') {
            if (workflow.stage !== 'DOCUMENT_REVIEW') {
                res.status(409).json({
                    status: 'error',
                    message: 'Only a case in document review can be flagged as fraud',
                });
                return;
            }
            nextStage = 'FINALIZED';
            caseStatus = 'REJECTED';
        }
        else if (action === 'APPROVE_CASE' || action === 'REJECT_CASE') {
            if (!allDocumentsApproved || !allEkycChecksPassed || workflow.stage !== 'DOCUMENT_REVIEW') {
                res.status(409).json({
                    status: 'error',
                    message: !allDocumentsApproved
                        ? 'All documents must be approved before this action'
                        : !allEkycChecksPassed
                            ? 'All eKYC checks must pass before approve or reject'
                            : 'This case is no longer in document review',
                });
                return;
            }
            if (action === 'REJECT_CASE') {
                nextStage = 'FINALIZED';
                caseStatus = 'REJECTED';
            }
            else {
                nextStage = 'FCU_APPROVED';
                caseStatus = 'APPROVED';
            }
        }
        else if (action === 'SEND_FIELD' || action === 'WAIVE_FIELD') {
            if (workflow.stage !== 'FCU_APPROVED') {
                res.status(409).json({ status: 'error', message: 'Approve the case before choosing field verification' });
                return;
            }
            if (action === 'SEND_FIELD') {
                nextStage = 'FIELD_ASSIGNED';
                caseStatus = 'FIELD_VERIFICATION';
                fieldAssignedTo = 'Field Verification Team';
            }
            else {
                nextStage = 'FIELD_WAIVED';
                caseStatus = 'PENDING';
            }
        }
        else if (['SEND_CREDIT', 'HOLD_CASE', 'FORWARD_REJECT'].includes(action)) {
            const fieldReportComplete = Boolean(currentCase?.fieldReport)
                && Boolean(currentCase.fieldReport?.documents?.aadhaar)
                && Boolean(currentCase.fieldReport?.documents?.pan)
                && Array.isArray(currentCase.fieldReport?.documents?.checklist)
                && currentCase.fieldReport.documents.checklist.length === 5
                && currentCase.fieldReport.documents.checklist.every(Boolean)
                && Boolean(currentCase.fieldReport?.photos?.applicant)
                && Boolean(currentCase.fieldReport?.photos?.residenceOffice)
                && Boolean(currentCase.fieldReport?.location?.latitude)
                && Boolean(currentCase.fieldReport?.location?.longitude)
                && Boolean(currentCase.fieldReport?.signature);
            const verificationFinished = workflow.stage === 'FIELD_WAIVED'
                || (workflow.stage === 'FIELD_ASSIGNED' && fieldReportComplete);
            if (!verificationFinished) {
                res.status(409).json({ status: 'error', message: 'Final actions unlock after field verification is waived or a complete field report is submitted' });
                return;
            }
            nextStage = 'FINALIZED';
            caseStatus = action === 'SEND_CREDIT' ? 'SENT_TO_CREDIT' : action === 'HOLD_CASE' ? 'HOLD' : 'FORWARDED_REJECT';
        }
        else {
            res.status(400).json({ status: 'error', message: 'Unsupported FCU workflow action' });
            return;
        }
        const rejectionDecision = action === 'FLAG_FRAUD' ? 'FRAUD' : action === 'REJECT_CASE' ? 'REJECT' : undefined;
        await (0, casesModel_1.saveWorkflowAction)(applicationId, nextStage, caseStatus, reviewer.id, fieldAssignedTo, action === 'SEND_CREDIT' ? 3 : undefined, rejectionDecision, reason);
        const actionTitle = { APPROVE_CASE: 'Case approved', REJECT_CASE: 'Case rejected', FLAG_FRAUD: 'Case permanently flagged as fraud', SEND_FIELD: 'Sent to field verification', WAIVE_FIELD: 'Field verification waived', SEND_CREDIT: 'Sent to credit team', HOLD_CASE: 'Case placed on hold', FORWARD_REJECT: 'Forwarded for rejection' };
        const actionDetail = action === 'FLAG_FRAUD'
            ? 'Permanent ban applied · Fraud status: REPORT_FRAUD'
            : action === 'REJECT_CASE'
                ? `Applicant can reapply after ${Math.max(1, Number(process.env.FCU_REAPPLY_AFTER_DAYS || 90))} days`
                : `Stage: ${nextStage} · Status: ${caseStatus}`;
        await (0, casesModel_1.addCaseHistory)(applicationId, 'WORKFLOW_ACTION', actionTitle[action] || action, actionDetail, reviewer.id);
        let whatsapp = null;
        if (action === 'REJECT_CASE' || action === 'FLAG_FRAUD') {
            try {
                await (0, whatsapp_1.sendWhatsAppRejection)(String(currentCase?.mobile || ''), String(currentCase?.borrower || 'Customer'));
                whatsapp = { sent: true };
                await (0, casesModel_1.addCaseHistory)(applicationId, 'WHATSAPP', 'Rejection WhatsApp sent', `Rejection template sent to ${currentCase?.mobile || 'registered mobile'}.`, reviewer.id);
            }
            catch (notificationError) {
                whatsapp = { sent: false, message: notificationError?.message || 'WhatsApp notification failed' };
                await (0, casesModel_1.addCaseHistory)(applicationId, 'WHATSAPP_FAILED', 'Rejection WhatsApp failed', whatsapp.message || 'WhatsApp notification failed', reviewer.id);
                console.error('FCU rejection WhatsApp error:', notificationError?.response?.data || notificationError);
            }
        }
        if (action === 'SEND_FIELD' && fieldAssignedTo) {
            await (0, casesModel_1.assignCaseToFieldVerification)(applicationId, reviewer.id, fieldAssignedTo);
        }
        if (nextStage === 'FINALIZED' || nextStage === 'FIELD_ASSIGNED')
            await (0, casesModel_1.releaseCase)(applicationId, Number(req.fcuUser.id));
        res.json({
            status: 'success',
            data: { workflowStage: nextStage, caseStatus, fieldAssignedTo: fieldAssignedTo || null, whatsapp },
        });
    }
    catch (error) {
        console.error('FCU workflow action error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Unable to update FCU workflow',
            code: error?.code || 'FCU_WORKFLOW_ERROR',
            detail: process.env.NODE_ENV === 'production' ? undefined : (error?.sqlMessage || error?.message),
        });
    }
};
exports.performWorkflowAction = performWorkflowAction;
const listCaseHistory = async (req, res) => {
    try {
        const applicationId = parseApplicationId(req.params.caseId);
        if (!applicationId) {
            res.status(400).json({ status: 'error', message: 'Invalid application' });
            return;
        }
        res.json({ status: 'success', data: await (0, casesModel_1.getCaseHistory)(applicationId) });
    }
    catch (error) {
        console.error('FCU case history error:', error);
        res.status(500).json({ status: 'error', message: 'Unable to load case history' });
    }
};
exports.listCaseHistory = listCaseHistory;
const addCaseNote = async (req, res) => {
    try {
        const applicationId = parseApplicationId(req.params.caseId);
        const note = String(req.body.note || '').trim();
        if (!applicationId || !note || note.length > 1000) {
            res.status(400).json({ status: 'error', message: 'Enter a valid note (maximum 1000 characters)' });
            return;
        }
        if (!(await ensureCaseOwner(req, res, applicationId)))
            return;
        const data = await (0, casesModel_1.addCaseHistory)(applicationId, 'NOTE', 'Review note added', note, Number(req.fcuUser.id));
        res.status(201).json({ status: 'success', data });
    }
    catch (error) {
        console.error('FCU case note error:', error);
        res.status(500).json({ status: 'error', message: 'Unable to save case note' });
    }
};
exports.addCaseNote = addCaseNote;
