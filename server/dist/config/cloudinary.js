"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCloudinary = void 0;
const documentStorage_1 = require("./documentStorage");
/**
 * Fallback adapter for uploadToCloudinary:
 * Transparently saves file locally into centralized customer_documents directory
 */
const uploadToCloudinary = async (dataUri, folder, publicId) => {
    try {
        const docName = publicId || `doc_${Date.now()}`;
        const parts = docName.split('_');
        const userId = parts[1] || 'customer';
        const docType = folder || parts[0] || 'document';
        const saved = await (0, documentStorage_1.saveDocumentFile)({
            userId,
            documentType: docType,
            originalName: docName,
            base64Data: dataUri,
        });
        return saved.filePath;
    }
    catch (error) {
        console.error('Document upload error:', error);
        throw new Error('Failed to upload document to storage');
    }
};
exports.uploadToCloudinary = uploadToCloudinary;
exports.default = {
    uploader: {
        upload: async (dataUri) => {
            const url = await (0, exports.uploadToCloudinary)(dataUri, 'docs');
            return { secure_url: url, url };
        },
    },
};
