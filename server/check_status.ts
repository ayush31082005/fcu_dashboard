import pool from './src/config/db';
import fs from 'fs';
import path from 'path';

async function checkAllUserImages() {
  try {
    console.log('--- CUSTOMER DOCUMENTS FOR USER 5 ---');
    const [cdocs]: any = await pool.query('SELECT * FROM customer_documents WHERE user_id = 5 OR lead_id LIKE "%4403%"');
    console.log(JSON.stringify(cdocs, null, 2));

    console.log('--- FIELD VERIFICATION UPLOADS FOR APP 5 ---');
    const [fuploads]: any = await pool.query('SELECT id, mime_type, LENGTH(image_data) as img_len FROM field_verification_uploads');
    console.log(JSON.stringify(fuploads, null, 2));

    console.log('--- FIELD VERIFICATION REPORTS ---');
    const [freports]: any = await pool.query('SELECT id, application_id, report_data FROM field_verification_reports');
    console.log(JSON.stringify(freports, null, 2));

    console.log('--- ALL FILES IN SERVER/UPLOADS/SELFIES ---');
    const selfieDir = path.join(__dirname, 'uploads', 'selfies');
    if (fs.existsSync(selfieDir)) {
      console.log(fs.readdirSync(selfieDir));
    }
  } catch (err: any) {
    console.error(err);
  }
  process.exit(0);
}

checkAllUserImages();
