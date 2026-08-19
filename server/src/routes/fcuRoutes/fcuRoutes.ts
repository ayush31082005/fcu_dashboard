import { Router } from 'express';
import { login, logout, me, register } from '../../controllers/fcuController/authController';
import { requireFcuAuth } from '../../middleware/fcuMiddleware/authMiddleware';
import { addCaseNote, approveAllDocuments, claimCaseForReview, getCases, keepCaseClaimAlive, listCaseHistory, performWorkflowAction, releaseCaseReview, reviewDocument, reviewEkycCheck } from '../../controllers/fcuController/casesController';
import { getDashboard } from '../../controllers/fcuController/dashboardController';
import { getSidebar } from '../../controllers/fcuController/sidebarController';
import { createDocumentRequest, disableDocumentRequest, getCustomerDocumentRequest, getDocumentRequest, shareDocumentRequest, uploadCustomerDocument } from '../../controllers/fcuController/documentRequestController';
import { listNotifications, readAllNotifications, readNotification } from '../../controllers/fcuController/notificationController';
import { lookupMobileUpi } from '../../controllers/fcuController/mobileUpiController';
import { verifyBankPenny } from '../../controllers/fcuController/bankPennyController';
import { searchCkyc } from '../../controllers/fcuController/ckycController';
import { fetchAadhaarDetails, updateAadhaarRelation } from '../../controllers/fcuController/aadhaarFetchController';
import { lookupMobileBank } from '../../controllers/fcuController/mobileBankController';
import { verifyCorporateEmail } from '../../controllers/fcuController/corporateEmailController';
import { updateBankDetails } from '../../controllers/fcuController/bankDetailsController';

const router = Router();

// Registration is API-only by design; use Postman or another trusted admin client.
router.post('/register', register);
router.post('/login', login);
router.get('/me', requireFcuAuth, me);
router.post('/logout', requireFcuAuth, logout);
router.get('/cases', requireFcuAuth, getCases);
router.post('/cases/:caseId/claim', requireFcuAuth, claimCaseForReview);
router.post('/cases/:caseId/heartbeat', requireFcuAuth, keepCaseClaimAlive);
router.delete('/cases/:caseId/claim', requireFcuAuth, releaseCaseReview);
router.get('/dashboard', requireFcuAuth, getDashboard);
router.get('/sidebar', requireFcuAuth, getSidebar);
router.get('/notifications', requireFcuAuth, listNotifications);
router.patch('/notifications/read-all', requireFcuAuth, readAllNotifications);
router.patch('/notifications/:applicationId/read', requireFcuAuth, readNotification);
router.patch('/cases/:caseId/documents/:documentId', requireFcuAuth, reviewDocument);
router.post('/cases/:caseId/documents/approve-all', requireFcuAuth, approveAllDocuments);
router.patch('/cases/:caseId/ekyc/:checkId', requireFcuAuth, reviewEkycCheck);
router.post('/cases/:caseId/actions', requireFcuAuth, performWorkflowAction);
router.post('/cases/:caseId/mobile-to-upi', requireFcuAuth, lookupMobileUpi);
router.post('/cases/:caseId/bank-penny-verification', requireFcuAuth, verifyBankPenny);
router.patch('/cases/:caseId/bank-details', requireFcuAuth, updateBankDetails);
router.post('/cases/:caseId/mobile-to-bank', requireFcuAuth, lookupMobileBank);
router.post('/cases/:caseId/corporate-email-verification', requireFcuAuth, verifyCorporateEmail);
router.post('/cases/:caseId/ckyc-search', requireFcuAuth, searchCkyc);
router.post('/cases/:caseId/aadhaar-fetch', requireFcuAuth, fetchAadhaarDetails);
router.patch('/cases/:caseId/aadhaar-relation', requireFcuAuth, updateAadhaarRelation);
router.get('/cases/:caseId/history', requireFcuAuth, listCaseHistory);
router.post('/cases/:caseId/history', requireFcuAuth, addCaseNote);
router.get('/cases/:caseId/document-requests', requireFcuAuth, getDocumentRequest);
router.post('/cases/:caseId/document-requests', requireFcuAuth, createDocumentRequest);
router.delete('/cases/:caseId/document-requests', requireFcuAuth, disableDocumentRequest);
router.post('/cases/:caseId/document-requests/share', requireFcuAuth, shareDocumentRequest);

// The random token authorizes a customer to view and upload only requested documents.
router.get('/customer-upload/:token', getCustomerDocumentRequest);
router.post('/customer-upload/:token/documents/:documentId', uploadCustomerDocument);

export default router;
