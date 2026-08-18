import { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { uploadToCloudinary } from '../../config/cloudinary';
import { findFcuUserByEmail } from '../../models/fcuModels/authModel';
import { createDocumentRequestRecord, findDocumentRequestByApplication, findDocumentRequestByToken, findDocumentRequestRecipient, saveRequestedDocumentUpload } from '../../models/fcuModels/documentRequestModel';
import { sendWhatsAppDocumentRequest } from '../../utils/whatsapp';
import { addCaseHistory } from '../../models/fcuModels/casesModel';

const allowedDocuments = new Set(['Aadhaar Card', 'PAN Card', 'Passport', 'Voter ID', 'Driving License', 'Utility Bill (Electricity/Water/Gas)', 'Bank Statement']);
const parseId = (value: string | string[]) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = Number(String(raw).replace(/^APP0*/i, ''));
  return Number.isInteger(id) && id > 0 ? id : null;
};
const normalize = (row: any) => row ? ({ ...row, documents: typeof row.documents === 'string' ? JSON.parse(row.documents) : row.documents || [] }) : null;
const requestIsExpired = (request: any) => Number(request?.is_expired) === 1;
const requestStatus = (request: any) => String(request?.status || '').trim().toUpperCase();

export const getDocumentRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationId = parseId(req.params.caseId);
    if (!applicationId) { res.status(400).json({ status: 'error', message: 'Invalid application' }); return; }
    res.json({ status: 'success', data: normalize(await findDocumentRequestByApplication(applicationId)) });
  } catch (error) {
    console.error('FCU document request load error:', error);
    res.status(500).json({ status: 'error', message: 'Unable to load document request' });
  }
};

export const createDocumentRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationId = parseId(req.params.caseId);
    const documents: string[] = Array.isArray(req.body.documents)
      ? Array.from(new Set<string>(req.body.documents.map((value: unknown) => String(value))))
      : [];
    if (!applicationId || !documents.length || documents.some(doc => !allowedDocuments.has(doc))) {
      res.status(400).json({ status: 'error', message: 'Select at least one valid document' }); return;
    }
    const sessionUser = (req as any).fcuUser;
    const user = await findFcuUserByEmail(sessionUser.email);
    if (!user) { res.status(401).json({ status: 'error', message: 'FCU user not found' }); return; }
    const token = crypto.randomBytes(24).toString('hex');
    await createDocumentRequestRecord(applicationId, token, user.id, documents);
    const data = normalize(await findDocumentRequestByApplication(applicationId));
    res.status(201).json({ status: 'success', data: { ...data, shareUrl: `${req.protocol}://${req.get('host')}/customer-upload/${token}` } });
  } catch (error: any) {
    console.error('FCU document request create error:', error);
    if (error?.code === 'APPLICATION_NOT_FOUND' || error?.code === 'ER_NO_REFERENCED_ROW_2') {
      res.status(404).json({ status: 'error', message: 'This application was removed from the database. Refresh Applications and open an existing case.' }); return;
    }
    res.status(500).json({ status: 'error', message: 'Unable to create document request' });
  }
};

export const shareDocumentRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationId = parseId(req.params.caseId);
    const uploadLink = String(req.body.uploadLink || '').trim();
    if (!applicationId || !uploadLink) { res.status(400).json({ status:'error', message:'Create an upload link first' }); return; }
    const request = normalize(await findDocumentRequestByApplication(applicationId));
    if (!request || request.status !== 'ACTIVE' || !uploadLink.endsWith(`/customer-upload/${request.token}`)) {
      res.status(409).json({ status:'error', message:'The active document request does not match this link' }); return;
    }
    const recipient = await findDocumentRequestRecipient(applicationId);
    if (!recipient) { res.status(404).json({ status:'error', message:'Applicant mobile number not found' }); return; }
    const formattedApplicationId = `APP${String(applicationId).padStart(7, '0')}`;
    const provider = await sendWhatsAppDocumentRequest(recipient.mobile, formattedApplicationId, recipient.name, uploadLink);
    await addCaseHistory(applicationId, 'WHATSAPP', 'Document upload link submitted to WhatsApp', `Upload link submitted to ${recipient.mobile}. Provider LogID: ${provider?.LogID || 'N/A'}`, Number((req as any).fcuUser.id));
    res.json({ status:'success', message:'Upload link submitted to customer WhatsApp', data:{ mobile:`******${String(recipient.mobile).slice(-4)}`, logId:provider?.LogID || null } });
  } catch (error: any) {
    console.error('FCU document request WhatsApp error:', error?.response?.data || error);
    res.status(502).json({ status:'error', message:error?.message || 'Unable to send upload link on WhatsApp' });
  }
};

export const getCustomerDocumentRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = normalize(await findDocumentRequestByToken(String(req.params.token)));
    if (!data || requestStatus(data) === 'CLOSED') { res.status(404).json({ status: 'error', message: 'Document request not found' }); return; }
    if (requestIsExpired(data)) { res.status(410).json({ status: 'error', message: 'Document request link has expired' }); return; }
    res.json({ status: 'success', data });
  } catch (error) {
    console.error('FCU public document request error:', error);
    res.status(500).json({ status: 'error', message: 'Unable to load upload request' });
  }
};

export const uploadCustomerDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = String(req.params.token);
    const documentId = Number(req.params.documentId);
    const imageBase64 = String(req.body.imageBase64 || '');
    const originalName = String(req.body.fileName || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
    const match = imageBase64.match(/^data:(application\/pdf|image\/(?:jpeg|png|webp));base64,(.+)$/);
    if (!documentId || !match) { res.status(400).json({ status: 'error', message: 'Valid PDF, JPG, PNG or WEBP file is required' }); return; }
    const buffer = Buffer.from(match[2], 'base64');
    if (!buffer.length || buffer.length > 5 * 1024 * 1024) { res.status(413).json({ status: 'error', message: 'File must be smaller than 5 MB' }); return; }
    const request = normalize(await findDocumentRequestByToken(token));
    if (!request || requestStatus(request) !== 'ACTIVE' || requestIsExpired(request)) {
      res.status(410).json({ status: 'error', message: 'Document request is invalid or expired' }); return;
    }
    const savedName = `${token.slice(0, 10)}_${documentId}_${Date.now()}_${originalName}`;
    
    // Convert base64 buffer to data URI for Cloudinary
    const mimeType = match[1];
    const dataUri = `data:${mimeType};base64,${match[2]}`;
    
    const cloudinaryUrl = await uploadToCloudinary(dataUri, 'fcu_customer_docs', savedName);
    
    const saved = await saveRequestedDocumentUpload(token, documentId, originalName, cloudinaryUrl);
    if (!saved) { res.status(404).json({ status: 'error', message: 'Requested document not found' }); return; }
    res.json({ status: 'success', message: 'Document uploaded successfully', data: normalize(await findDocumentRequestByToken(token)) });
  } catch (error) {
    console.error('FCU customer upload error:', error);
    res.status(500).json({ status: 'error', message: 'Unable to upload document' });
  }
};
