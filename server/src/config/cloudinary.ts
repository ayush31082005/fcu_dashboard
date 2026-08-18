import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
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
export const uploadToCloudinary = async (dataUri: string, folder: string, publicId?: string): Promise<string> => {
  try {
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: folder,
      public_id: publicId,
      resource_type: 'auto',
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload file to Cloudinary');
  }
};

export default cloudinary;
