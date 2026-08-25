import { saveDocumentFile } from './documentStorage';

/**
 * Fallback adapter for uploadToCloudinary:
 * Transparently saves file locally into centralized customer_documents directory
 */
export const uploadToCloudinary = async (dataUri: string, folder: string, publicId?: string): Promise<string> => {
  try {
    const docName = publicId || `doc_${Date.now()}`;
    const parts = docName.split('_');
    const userId = parts[1] || 'customer';
    const docType = folder || parts[0] || 'document';

    const saved = await saveDocumentFile({
      userId,
      documentType: docType,
      originalName: docName,
      base64Data: dataUri,
    });

    return saved.filePath;
  } catch (error) {
    console.error('Document upload error:', error);
    throw new Error('Failed to upload document to storage');
  }
};

export default {
  uploader: {
    upload: async (dataUri: string) => {
      const url = await uploadToCloudinary(dataUri, 'docs');
      return { secure_url: url, url };
    },
  },
};
