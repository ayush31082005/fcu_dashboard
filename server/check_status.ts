import pool from './src/config/db';
import fs from 'fs';
import path from 'path';

async function extractDbImages() {
  try {
    const [rows]: any = await pool.query('SELECT ac.user_id, ac.profile_image, kd.selfie_path FROM aadhaar_card_details ac LEFT JOIN kyc_documents kd ON kd.user_id = ac.user_id');
    const baseUploads = path.join(__dirname, 'uploads');

    for (const r of rows) {
      if (r.profile_image && r.selfie_path) {
        const cleanBase64 = String(r.profile_image).replace(/^data:image\/\w+;base64,/, '').replace(/\s+/g, '');
        const imageBuffer = Buffer.from(cleanBase64, 'base64');

        // Clean relative path: strip leading uploads/ or /uploads/
        const relativePath = r.selfie_path.replace(/^\/*(uploads\/)*/i, '');
        
        const path1 = path.join(baseUploads, relativePath);
        const path2 = path.join(baseUploads, r.selfie_path.replace(/^\/+/, ''));

        osEnsureDir(path.dirname(path1));
        osEnsureDir(path.dirname(path2));

        fs.writeFileSync(path1, imageBuffer);
        fs.writeFileSync(path2, imageBuffer);

        console.log(`Successfully wrote DB base64 image to: ${path1}`);
        console.log(`Successfully wrote DB base64 image to: ${path2}`);
      }
    }
  } catch (err: any) {
    console.error(err);
  }
  process.exit(0);
}

function osEnsureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

extractDbImages();
