import path from 'path';
import fs from 'fs';

/**
 * Returns the resolved centralized customer documents storage directory.
 * Priority:
 * 1. process.env.DOCUMENT_STORAGE_PATH
 * 2. public_html/customer_documents (relative to project root on cPanel)
 * 3. Fallback to local server/uploads/customer_documents
 */
export const getDocumentStoragePath = (): string => {
  if (process.env.DOCUMENT_STORAGE_PATH) {
    const customPath = path.resolve(process.env.DOCUMENT_STORAGE_PATH);
    if (!fs.existsSync(customPath)) {
      try {
        fs.mkdirSync(customPath, { recursive: true });
      } catch (err) {
        console.warn(`[documentStorage] Could not create DOCUMENT_STORAGE_PATH: ${customPath}`, err);
      }
    }
    return customPath;
  }

  // Check if public_html/customer_documents exists in parent directories (cPanel structure)
  const cpanelCandidates = [
    path.resolve(__dirname, '../../../../public_html/customer_documents'),
    path.resolve(__dirname, '../../../public_html/customer_documents'),
    path.resolve(__dirname, '../../public_html/customer_documents'),
    path.resolve(__dirname, '../public_html/customer_documents'),
    path.resolve(process.cwd(), '../public_html/customer_documents'),
    path.resolve(process.cwd(), 'public_html/customer_documents'),
  ];

  for (const candidate of cpanelCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Local fallback: server/uploads/customer_documents
  const localFallback = path.resolve(__dirname, '../../uploads/customer_documents');
  if (!fs.existsSync(localFallback)) {
    try {
      fs.mkdirSync(localFallback, { recursive: true });
    } catch (err) {
      console.warn(`[documentStorage] Could not create local fallback directory: ${localFallback}`, err);
    }
  }
  return localFallback;
};

/**
 * Normalizes document type name for clean filename formatting
 */
const sanitizeDocType = (docType: string): string => {
  return String(docType || 'document')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'document';
};

/**
 * Extracts extension from mimeType or original filename
 */
const getFileExtension = (mimeType?: string, fileName?: string): string => {
  if (fileName && fileName.includes('.')) {
    const ext = fileName.split('.').pop()?.toLowerCase()?.trim();
    if (ext && /^[a-z0-9]{2,5}$/.test(ext)) {
      return ext === 'jpeg' ? 'jpg' : ext;
    }
  }

  if (mimeType) {
    const m = mimeType.toLowerCase();
    if (m.includes('pdf')) return 'pdf';
    if (m.includes('png')) return 'png';
    if (m.includes('webp')) return 'webp';
    if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  }

  return 'jpg';
};

export interface SaveDocumentOptions {
  userId: string | number;
  documentType: string;
  originalName?: string;
  base64Data: string;
  mimeType?: string;
}

export interface SaveDocumentResult {
  fileName: string;
  filePath: string; // Relative URL path: /uploads/customer_documents/{fileName}
  fullPath: string; // Absolute disk path
  size: number;
}

/**
 * Saves a base64 encoded document into the centralized customer_documents directory
 * with format: {userId}_{documentType}_{timestamp}.{ext}
 */
export const saveDocumentFile = async ({
  userId,
  documentType,
  originalName,
  base64Data,
  mimeType,
}: SaveDocumentOptions): Promise<SaveDocumentResult> => {
  const storageDir = getDocumentStoragePath();
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
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
  const fullPath = path.join(storageDir, fileName);

  await fs.promises.writeFile(fullPath, buffer);

  const relativePath = `/uploads/customer_documents/${fileName}`;

  return {
    fileName,
    filePath: relativePath,
    fullPath,
    size: buffer.length,
  };
};

export const saveSelfieFile = async ({
  userId,
  base64Data,
}: {
  userId: string | number;
  base64Data: string;
}): Promise<SaveDocumentResult> => {
  return saveDocumentFile({
    userId,
    documentType: 'selfie',
    base64Data,
    mimeType: 'image/jpeg',
  });
};

export interface DirectCustomerDocument {
  id: string;
  doc_type: string;
  document_name?: string;
  file_name: string;
  file_path: string;
  uploaded_by: string;
  is_modified_or_edited?: boolean;
  tamper_status?: string;
  tamper_analysis?: string;
  meta_creation_date?: string;
  meta_mod_date?: string;
  meta_producer?: string;
  meta_software?: string;
}

/**
 * Directly lists customer documents from cPanel folder (public_html/customer_documents)
 * matching any of the user identifiers (leadId, userId, leadRef).
 */
export const listCustomerDocumentsDirectly = (
  identifiers: (string | number | undefined | null)[]
): DirectCustomerDocument[] => {
  try {
    const storageDir = getDocumentStoragePath();
    if (!fs.existsSync(storageDir)) return [];

    const validIds = identifiers
      .filter((id): id is string | number => id !== null && id !== undefined && String(id).trim() !== '')
      .map(id => String(id).trim().toUpperCase());

    if (!validIds.length) return [];

    const files = fs.readdirSync(storageDir);
    const matchedDocs: DirectCustomerDocument[] = [];

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
        if (lowerFile.includes('aadhaar') || lowerFile.includes('aadhar')) docType = 'Aadhaar Card';
        else if (lowerFile.includes('pan')) docType = 'PAN Card';
        else if (lowerFile.includes('salary') || lowerFile.includes('slip')) docType = 'Salary Slip';
        else if (lowerFile.includes('bank') || lowerFile.includes('statement')) docType = 'Bank Statement';
        else if (lowerFile.includes('voter')) docType = 'Voter ID';
        else if (lowerFile.includes('passport')) docType = 'Passport';
        else if (lowerFile.includes('license') || lowerFile.includes('dl')) docType = 'Driving License';
        else if (lowerFile.includes('utility') || lowerFile.includes('bill')) docType = 'Utility Bill';
        else if (lowerFile.includes('rent')) docType = 'Rental Agreement';
        else if (lowerFile.includes('selfie') || lowerFile.includes('photo')) docType = 'Selfie Photo';
        else if (lowerFile.includes('cheque')) docType = 'Cancelled Cheque';
        else if (lowerFile.includes('form16') || lowerFile.includes('form_16')) docType = 'Form 16';

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
  } catch (error) {
    console.error('Error scanning customer documents directly from disk:', error);
    return [];
  }
};

