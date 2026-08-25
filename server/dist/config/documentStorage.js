"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCustomerDocumentsDirectly = exports.saveSelfieFile = exports.saveDocumentFile = exports.getDocumentStoragePath = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
/**
 * Returns the resolved centralized customer documents storage directory.
 * Priority:
 * 1. process.env.DOCUMENT_STORAGE_PATH
 * 2. public_html/customer_documents (relative to project root on cPanel)
 * 3. Fallback to local server/uploads/customer_documents
 */
const getDocumentStoragePath = () => {
    if (process.env.DOCUMENT_STORAGE_PATH) {
        const customPath = path_1.default.resolve(process.env.DOCUMENT_STORAGE_PATH);
        if (!fs_1.default.existsSync(customPath)) {
            try {
                fs_1.default.mkdirSync(customPath, { recursive: true });
            }
            catch (err) {
                console.warn(`[documentStorage] Could not create DOCUMENT_STORAGE_PATH: ${customPath}`, err);
            }
        }
        return customPath;
    }
    // Check if public_html/customer_documents exists in parent directories (cPanel structure)
    const cpanelCandidates = [
        path_1.default.resolve(__dirname, '../../../../public_html/customer_documents'),
        path_1.default.resolve(__dirname, '../../../public_html/customer_documents'),
        path_1.default.resolve(__dirname, '../../public_html/customer_documents'),
        path_1.default.resolve(__dirname, '../public_html/customer_documents'),
        path_1.default.resolve(process.cwd(), '../public_html/customer_documents'),
        path_1.default.resolve(process.cwd(), 'public_html/customer_documents'),
    ];
    for (const candidate of cpanelCandidates) {
        if (fs_1.default.existsSync(candidate)) {
            return candidate;
        }
    }
    // Local fallback: server/uploads/customer_documents
    const localFallback = path_1.default.resolve(__dirname, '../../uploads/customer_documents');
    if (!fs_1.default.existsSync(localFallback)) {
        try {
            fs_1.default.mkdirSync(localFallback, { recursive: true });
        }
        catch (err) {
            console.warn(`[documentStorage] Could not create local fallback directory: ${localFallback}`, err);
        }
    }
    return localFallback;
};
exports.getDocumentStoragePath = getDocumentStoragePath;
/**
 * Normalizes document type name for clean filename formatting
 */
const sanitizeDocType = (docType) => {
    return String(docType || 'document')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'document';
};
/**
 * Extracts extension from mimeType or original filename
 */
const getFileExtension = (mimeType, fileName) => {
    if (fileName && fileName.includes('.')) {
        const ext = fileName.split('.').pop()?.toLowerCase()?.trim();
        if (ext && /^[a-z0-9]{2,5}$/.test(ext)) {
            return ext === 'jpeg' ? 'jpg' : ext;
        }
    }
    if (mimeType) {
        const m = mimeType.toLowerCase();
        if (m.includes('pdf'))
            return 'pdf';
        if (m.includes('png'))
            return 'png';
        if (m.includes('webp'))
            return 'webp';
        if (m.includes('jpeg') || m.includes('jpg'))
            return 'jpg';
    }
    return 'jpg';
};
/**
 * Saves a base64 encoded document into the centralized customer_documents directory
 * with format: {userId}_{documentType}_{timestamp}.{ext}
 */
const saveDocumentFile = async ({ userId, documentType, originalName, base64Data, mimeType, }) => {
    const storageDir = (0, exports.getDocumentStoragePath)();
    if (!fs_1.default.existsSync(storageDir)) {
        fs_1.default.mkdirSync(storageDir, { recursive: true });
    }
    // Parse base64 header if present
    let cleanBase64 = base64Data;
    let detectedMime = mimeType;
    const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
        detectedMime = match[1];
        cleanBase64 = match[2];
    }
    const buffer = Buffer.from(cleanBase64, 'base64');
    const ext = getFileExtension(detectedMime, originalName);
    const cleanType = sanitizeDocType(documentType);
    const timestamp = Date.now();
    const fileName = `${userId}_${cleanType}_${timestamp}.${ext}`;
    const fullPath = path_1.default.join(storageDir, fileName);
    await fs_1.default.promises.writeFile(fullPath, buffer);
    const relativePath = `/uploads/customer_documents/${fileName}`;
    return {
        fileName,
        filePath: relativePath,
        fullPath,
        size: buffer.length,
    };
};
exports.saveDocumentFile = saveDocumentFile;
const saveSelfieFile = async ({ userId, base64Data, }) => {
    return (0, exports.saveDocumentFile)({
        userId,
        documentType: 'selfie',
        base64Data,
        mimeType: 'image/jpeg',
    });
};
exports.saveSelfieFile = saveSelfieFile;
/**
 * Directly lists customer documents from cPanel folder (public_html/customer_documents)
 * matching any of the user identifiers (leadId, userId, leadRef).
 */
const listCustomerDocumentsDirectly = (identifiers) => {
    try {
        const storageDir = (0, exports.getDocumentStoragePath)();
        if (!fs_1.default.existsSync(storageDir))
            return [];
        const validIds = identifiers
            .filter((id) => id !== null && id !== undefined && String(id).trim() !== '')
            .map(id => String(id).trim().toUpperCase());
        if (!validIds.length)
            return [];
        const files = fs_1.default.readdirSync(storageDir);
        const matchedDocs = [];
        for (const file of files) {
            const upperFile = file.toUpperCase();
            // Check if file starts with or contains any of the identifiers
            const isMatch = validIds.some(id => {
                const cleanId = id.replace(/[^A-Z0-9]/g, '');
                const cleanFile = upperFile.replace(/[^A-Z0-9]/g, '');
                return upperFile.startsWith(`${id}_`) ||
                    upperFile.startsWith(`${id}-`) ||
                    (cleanId && cleanFile.startsWith(cleanId)) ||
                    upperFile.includes(id);
            });
            if (isMatch) {
                // Detect clean document type from filename
                const lowerFile = file.toLowerCase();
                let docType = 'Customer Document';
                if (lowerFile.includes('aadhaar') || lowerFile.includes('aadhar'))
                    docType = 'Aadhaar Card';
                else if (lowerFile.includes('pan'))
                    docType = 'PAN Card';
                else if (lowerFile.includes('salary') || lowerFile.includes('slip'))
                    docType = 'Salary Slip';
                else if (lowerFile.includes('bank') || lowerFile.includes('statement'))
                    docType = 'Bank Statement';
                else if (lowerFile.includes('voter'))
                    docType = 'Voter ID';
                else if (lowerFile.includes('passport'))
                    docType = 'Passport';
                else if (lowerFile.includes('license') || lowerFile.includes('dl'))
                    docType = 'Driving License';
                else if (lowerFile.includes('utility') || lowerFile.includes('bill'))
                    docType = 'Utility Bill';
                else if (lowerFile.includes('rent'))
                    docType = 'Rental Agreement';
                else if (lowerFile.includes('selfie') || lowerFile.includes('photo'))
                    docType = 'Selfie Photo';
                else if (lowerFile.includes('cheque'))
                    docType = 'Cancelled Cheque';
                else if (lowerFile.includes('form16') || lowerFile.includes('form_16'))
                    docType = 'Form 16';
                matchedDocs.push({
                    id: `cpanel-${file}`,
                    doc_type: docType,
                    file_name: file,
                    file_path: `/customer_documents/${file}`,
                    uploaded_by: 'Customer / cPanel',
                });
            }
        }
        return matchedDocs;
    }
    catch (error) {
        console.error('Error scanning customer documents directly from disk:', error);
        return [];
    }
};
exports.listCustomerDocumentsDirectly = listCustomerDocumentsDirectly;
