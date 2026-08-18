"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadCustomerDocument = exports.getCustomerDocumentRequest = exports.shareDocumentRequest = exports.createDocumentRequest = exports.getDocumentRequest = void 0;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const authModel_1 = require("../../models/fcuModels/authModel");
const documentRequestModel_1 = require("../../models/fcuModels/documentRequestModel");
const whatsapp_1 = require("../../utils/whatsapp");
const casesModel_1 = require("../../models/fcuModels/casesModel");
const allowedDocuments = new Set(['Aadhaar Card', 'PAN Card', 'Passport', 'Voter ID', 'Driving License', 'Utility Bill (Electricity/Water/Gas)', 'Bank Statement']);
const parseId = (value) => {
    const raw = Array.isArray(value) ? value[0] : value;
    const id = Number(String(raw).replace(/^APP0*/i, ''));
    return Number.isInteger(id) && id > 0 ? id : null;
};
const normalize = (row) => row ? ({ ...row, documents: typeof row.documents === 'string' ? JSON.parse(row.documents) : row.documents || [] }) : null;
const requestIsExpired = (request) => Number(request?.is_expired) === 1;
const requestStatus = (request) => String(request?.status || '').trim().toUpperCase();
const getDocumentRequest = async (req, res) => {
    try {
        const applicationId = parseId(req.params.caseId);
        if (!applicationId) {
            res.status(400).json({ status: 'error', message: 'Invalid application' });
            return;
        }
        res.json({ status: 'success', data: normalize(await (0, documentRequestModel_1.findDocumentRequestByApplication)(applicationId)) });
    }
    catch (error) {
        console.error('FCU document request load error:', error);
        res.status(500).json({ status: 'error', message: 'Unable to load document request' });
    }
};
exports.getDocumentRequest = getDocumentRequest;
const createDocumentRequest = async (req, res) => {
    try {
        const applicationId = parseId(req.params.caseId);
        const documents = Array.isArray(req.body.documents)
            ? Array.from(new Set(req.body.documents.map((value) => String(value))))
            : [];
        if (!applicationId || !documents.length || documents.some(doc => !allowedDocuments.has(doc))) {
            res.status(400).json({ status: 'error', message: 'Select at least one valid document' });
            return;
        }
        const sessionUser = req.fcuUser;
        const user = await (0, authModel_1.findFcuUserByEmail)(sessionUser.email);
        if (!user) {
            res.status(401).json({ status: 'error', message: 'FCU user not found' });
            return;
        }
        const token = crypto_1.default.randomBytes(24).toString('hex');
        await (0, documentRequestModel_1.createDocumentRequestRecord)(applicationId, token, user.id, documents);
        const data = normalize(await (0, documentRequestModel_1.findDocumentRequestByApplication)(applicationId));
        res.status(201).json({ status: 'success', data: { ...data, shareUrl: `${req.protocol}://${req.get('host')}/customer-upload/${token}` } });
    }
    catch (error) {
        console.error('FCU document request create error:', error);
        if (error?.code === 'APPLICATION_NOT_FOUND' || error?.code === 'ER_NO_REFERENCED_ROW_2') {
            res.status(404).json({ status: 'error', message: 'This application was removed from the database. Refresh Applications and open an existing case.' });
            return;
        }
        res.status(500).json({ status: 'error', message: 'Unable to create document request' });
    }
};
exports.createDocumentRequest = createDocumentRequest;
const shareDocumentRequest = async (req, res) => {
    try {
        const applicationId = parseId(req.params.caseId);
        const uploadLink = String(req.body.uploadLink || '').trim();
        if (!applicationId || !uploadLink) {
            res.status(400).json({ status: 'error', message: 'Create an upload link first' });
            return;
        }
        const request = normalize(await (0, documentRequestModel_1.findDocumentRequestByApplication)(applicationId));
        if (!request || request.status !== 'ACTIVE' || !uploadLink.endsWith(`/customer-upload/${request.token}`)) {
            res.status(409).json({ status: 'error', message: 'The active document request does not match this link' });
            return;
        }
        const recipient = await (0, documentRequestModel_1.findDocumentRequestRecipient)(applicationId);
        if (!recipient) {
            res.status(404).json({ status: 'error', message: 'Applicant mobile number not found' });
            return;
        }
        const formattedApplicationId = `APP${String(applicationId).padStart(7, '0')}`;
        const provider = await (0, whatsapp_1.sendWhatsAppDocumentRequest)(recipient.mobile, formattedApplicationId, recipient.name, uploadLink);
        await (0, casesModel_1.addCaseHistory)(applicationId, 'WHATSAPP', 'Document upload link submitted to WhatsApp', `Upload link submitted to ${recipient.mobile}. Provider LogID: ${provider?.LogID || 'N/A'}`, Number(req.fcuUser.id));
        res.json({ status: 'success', message: 'Upload link submitted to customer WhatsApp', data: { mobile: `******${String(recipient.mobile).slice(-4)}`, logId: provider?.LogID || null } });
    }
    catch (error) {
        console.error('FCU document request WhatsApp error:', error?.response?.data || error);
        res.status(502).json({ status: 'error', message: error?.message || 'Unable to send upload link on WhatsApp' });
    }
};
exports.shareDocumentRequest = shareDocumentRequest;
const getCustomerDocumentRequest = async (req, res) => {
    try {
        const data = normalize(await (0, documentRequestModel_1.findDocumentRequestByToken)(String(req.params.token)));
        if (!data || requestStatus(data) === 'CLOSED') {
            res.status(404).json({ status: 'error', message: 'Document request not found' });
            return;
        }
        if (requestIsExpired(data)) {
            res.status(410).json({ status: 'error', message: 'Document request link has expired' });
            return;
        }
        res.json({ status: 'success', data });
    }
    catch (error) {
        console.error('FCU public document request error:', error);
        res.status(500).json({ status: 'error', message: 'Unable to load upload request' });
    }
};
exports.getCustomerDocumentRequest = getCustomerDocumentRequest;
const uploadCustomerDocument = async (req, res) => {
    try {
        const token = String(req.params.token);
        const documentId = Number(req.params.documentId);
        const imageBase64 = String(req.body.imageBase64 || '');
        const originalName = String(req.body.fileName || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
        const match = imageBase64.match(/^data:(application\/pdf|image\/(?:jpeg|png|webp));base64,(.+)$/);
        if (!documentId || !match) {
            res.status(400).json({ status: 'error', message: 'Valid PDF, JPG, PNG or WEBP file is required' });
            return;
        }
        const buffer = Buffer.from(match[2], 'base64');
        if (!buffer.length || buffer.length > 5 * 1024 * 1024) {
            res.status(413).json({ status: 'error', message: 'File must be smaller than 5 MB' });
            return;
        }
        const request = normalize(await (0, documentRequestModel_1.findDocumentRequestByToken)(token));
        if (!request || requestStatus(request) !== 'ACTIVE' || requestIsExpired(request)) {
            res.status(410).json({ status: 'error', message: 'Document request is invalid or expired' });
            return;
        }
        const uploadsDir = path_1.default.join(__dirname, '../../../uploads/fcu_customer_docs');
        fs_1.default.mkdirSync(uploadsDir, { recursive: true });
        const savedName = `${token.slice(0, 10)}_${documentId}_${Date.now()}_${originalName}`;
        fs_1.default.writeFileSync(path_1.default.join(uploadsDir, savedName), buffer);
        const relativePath = `uploads/fcu_customer_docs/${savedName}`;
        const saved = await (0, documentRequestModel_1.saveRequestedDocumentUpload)(token, documentId, originalName, relativePath);
        if (!saved) {
            fs_1.default.unlinkSync(path_1.default.join(uploadsDir, savedName));
            res.status(404).json({ status: 'error', message: 'Requested document not found' });
            return;
        }
        res.json({ status: 'success', message: 'Document uploaded successfully', data: normalize(await (0, documentRequestModel_1.findDocumentRequestByToken)(token)) });
    }
    catch (error) {
        console.error('FCU customer upload error:', error);
        res.status(500).json({ status: 'error', message: 'Unable to upload document' });
    }
};
exports.uploadCustomerDocument = uploadCustomerDocument;
