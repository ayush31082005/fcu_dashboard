"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCloudinary = void 0;
const cloudinary_1 = require("cloudinary");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
/**
 * Uploads a base64 encoded data URI to Cloudinary
 * @param dataUri The base64 data URI (e.g., 'data:image/jpeg;base64,...')
 * @param folder The folder in Cloudinary where the image should be saved
 * @param publicId Optional specific name for the file
 */
const uploadToCloudinary = async (dataUri, folder, publicId) => {
    try {
        const result = await cloudinary_1.v2.uploader.upload(dataUri, {
            folder: folder,
            public_id: publicId,
            resource_type: 'auto',
        });
        return result.secure_url;
    }
    catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error('Failed to upload file to Cloudinary');
    }
};
exports.uploadToCloudinary = uploadToCloudinary;
exports.default = cloudinary_1.v2;
