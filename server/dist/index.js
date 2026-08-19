"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// FCU API entry point
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const db_1 = __importDefault(require("./config/db"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
const path_1 = __importDefault(require("path"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const enrichmentRoutes_1 = __importDefault(require("./routes/enrichmentRoutes"));
const onboardingRoutes_1 = __importDefault(require("./routes/onboardingRoutes"));
const routes_1 = __importDefault(require("./telecaller/routes"));
const fcuRoutes_1 = __importDefault(require("./routes/fcuRoutes/fcuRoutes"));
app.set('trust proxy', 1);
// Load Client/Frontend URLs from .env (comma-separated or single)
const configuredClientUrls = (process.env.CLIENT_URL || process.env.FRONTEND_URL || '')
    .split(',')
    .map(url => url.trim().replace(/\/+$/, ''))
    .filter(Boolean);
const defaultAllowedOrigins = [
    'http://localhost:8443',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:8443',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000',
    'https://geetpay.in',
    'http://geetpay.in',
    'https://www.geetpay.in',
    'http://www.geetpay.in',
    'https://fcu-dashboard-fcuserver.vercel.app',
];
const allowedOrigins = Array.from(new Set([...configuredClientUrls, ...defaultAllowedOrigins]));
const isOriginAllowed = (origin) => {
    if (!origin)
        return true; // Allow server-to-server or non-browser requests
    const normalized = origin.replace(/\/+$/, '');
    return allowedOrigins.includes(normalized) ||
        allowedOrigins.some(allowed => allowed === '*' || normalized.endsWith(`.${allowed.replace(/^https?:\/\//, '')}`));
};
// Universal CORS & Preflight middleware
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        if (isOriginAllowed(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        }
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cookie, Set-Cookie');
        res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie, Authorization');
    }
    // Instant response for preflight OPTIONS checks
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});
const corsOptions = {
    origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
            callback(null, true);
        }
        else {
            callback(null, true);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cookie', 'Set-Cookie'],
    exposedHeaders: ['Set-Cookie', 'Authorization']
};
app.use((0, cors_1.default)(corsOptions));
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express_1.default.json({ limit: '15mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '15mb' }));
app.use((0, cookie_parser_1.default)());
const sharedFieldUploadDirectory = process.env.FIELD_VERIFICATION_UPLOAD_DIR
    || path_1.default.resolve(__dirname, '../../../mobile app/server/uploads/field-verification');
// Support standard routes and /FCU subpath routes on cPanel
const prefixes = ['', '/FCU', '/fcu'];
prefixes.forEach(prefix => {
    app.use(`${prefix}/uploads/field-verification`, express_1.default.static(sharedFieldUploadDirectory));
    app.use(`${prefix}/uploads`, express_1.default.static(path_1.default.join(__dirname, '../uploads')));
    app.use(`${prefix}/api/auth`, authRoutes_1.default);
    app.use(`${prefix}/api/enrichment`, enrichmentRoutes_1.default);
    app.use(`${prefix}/api/onboarding`, onboardingRoutes_1.default);
    app.use(`${prefix}/api/telecaller`, routes_1.default);
    app.use(`${prefix}/api/fcu/auth`, fcuRoutes_1.default);
    app.get(`${prefix}/api/field/auth/images/:id`, async (req, res) => {
        const imageId = String(req.params.id || '').trim();
        if (!/^[0-9a-f-]{36}$/i.test(imageId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid image id' });
        }
        try {
            const [rows] = await db_1.default.query('SELECT mime_type, image_data FROM field_verification_uploads WHERE id = ? LIMIT 1', [imageId]);
            const image = rows[0];
            if (!image?.image_data) {
                return res.status(404).json({ status: 'error', message: 'Image not found' });
            }
            res.setHeader('Content-Type', image.mime_type || 'image/jpeg');
            res.setHeader('Cache-Control', 'private, max-age=3600');
            return res.send(image.image_data);
        }
        catch (error) {
            console.error('Field verification image error:', error?.message || error);
            return res.status(500).json({ status: 'error', message: 'Unable to load image' });
        }
    });
    app.get(`${prefix}/api/health`, async (req, res) => {
        try {
            await db_1.default.query('SELECT 1');
            res.status(200).json({ status: 'success', message: 'API is running & DB is connected' });
        }
        catch (error) {
            res.status(500).json({ status: 'error', message: 'Database connection failed' });
        }
    });
    app.get(`${prefix}/`, (req, res) => {
        res.json({ status: 'success', message: 'FCU Backend Server is Live' });
    });
    if (prefix) {
        app.get(`${prefix}`, (req, res) => {
            res.json({ status: 'success', message: 'FCU Backend Server is Live' });
        });
    }
});
const initDatabase = async () => {
    try {
        await db_1.default.query(`
      CREATE TABLE IF NOT EXISTS fcu_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(100) NOT NULL DEFAULT 'FCU Officer',
        status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
        last_login_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
        await db_1.default.query(`
      CREATE TABLE IF NOT EXISTS fcu_document_reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        application_id INT NOT NULL,
        document_id VARCHAR(50) NOT NULL,
        status ENUM('APPROVED', 'REJECTED') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_application_document (application_id, document_id),
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
      )
    `);
        await db_1.default.query(`
      CREATE TABLE IF NOT EXISTS fcu_case_workflows (
        id INT AUTO_INCREMENT PRIMARY KEY,
        application_id INT NOT NULL UNIQUE,
        stage ENUM('DOCUMENT_REVIEW', 'FCU_APPROVED', 'FIELD_ASSIGNED', 'FIELD_WAIVED', 'FINALIZED') NOT NULL DEFAULT 'DOCUMENT_REVIEW',
        case_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        reviewed_by INT NULL,
        field_assigned_to VARCHAR(150) NULL,
        field_assigned_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES fcu_users(id) ON DELETE SET NULL
      )
    `);
        await db_1.default.query(`
      CREATE TABLE IF NOT EXISTS fcu_login_activity (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fcu_user_id INT NOT NULL,
        action ENUM('login', 'logout') NOT NULL,
        ip_address VARCHAR(100),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_fcu_activity_user_date (fcu_user_id, created_at),
        FOREIGN KEY (fcu_user_id) REFERENCES fcu_users(id) ON DELETE CASCADE
      )
    `);
        await db_1.default.query(`
      CREATE TABLE IF NOT EXISTS fcu_document_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        application_id INT NOT NULL,
        token VARCHAR(64) NOT NULL UNIQUE,
        status ENUM('ACTIVE', 'COMPLETED', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
        expires_at TIMESTAMP NOT NULL,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_fcu_document_request_application (application_id, created_at),
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES fcu_users(id) ON DELETE SET NULL
      )
    `);
        await db_1.default.query(`
      CREATE TABLE IF NOT EXISTS fcu_requested_documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        document_name VARCHAR(120) NOT NULL,
        status ENUM('PENDING', 'UPLOADED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
        file_name VARCHAR(255) NULL,
        file_path VARCHAR(500) NULL,
        uploaded_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_fcu_requested_document (request_id, document_name),
        FOREIGN KEY (request_id) REFERENCES fcu_document_requests(id) ON DELETE CASCADE
      )
    `);
        await db_1.default.query(`
      CREATE TABLE IF NOT EXISTS fcu_field_verifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        application_id INT NOT NULL UNIQUE,
        residence_data JSON NOT NULL,
        office_data JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
      )
    `);
        await db_1.default.query(`
      CREATE TABLE IF NOT EXISTS fcu_case_locks (
        application_id INT PRIMARY KEY,
        fcu_user_id INT NULL,
        locked_at TIMESTAMP NULL,
        heartbeat_at TIMESTAMP NULL,
        lock_expires_at TIMESTAMP NULL,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
        FOREIGN KEY (fcu_user_id) REFERENCES fcu_users(id) ON DELETE SET NULL
      )
    `);
        await db_1.default.query(`INSERT IGNORE INTO fcu_case_locks (application_id) SELECT id FROM applications`);
        await db_1.default.query(`CREATE TABLE IF NOT EXISTS fcu_mobile_upi_details (
      id INT AUTO_INCREMENT PRIMARY KEY,
      application_id INT NOT NULL UNIQUE,
      user_id INT NOT NULL,
      mobile_number VARCHAR(20) NOT NULL,
      http_response_code INT NULL,
      client_ref_num VARCHAR(150) NULL,
      request_id VARCHAR(150) NULL,
      result_code INT NULL,
      mobile_linked_name VARCHAR(255) NULL,
      vpa VARCHAR(255) NULL,
      api_response JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
        await db_1.default.query(`CREATE TABLE IF NOT EXISTS fcu_corporate_email_verifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      application_id INT NOT NULL UNIQUE,
      user_id INT NOT NULL,
      email VARCHAR(255) NOT NULL,
      domain VARCHAR(255) NULL,
      is_verified BOOLEAN NOT NULL DEFAULT FALSE,
      verification_reason VARCHAR(500) NULL,
      verified_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
        await db_1.default.query(`CREATE TABLE IF NOT EXISTS fcu_bank_penny_verifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      application_id INT NOT NULL UNIQUE,
      user_id INT NOT NULL,
      account_number VARCHAR(100) NOT NULL,
      ifsc_code VARCHAR(20) NOT NULL,
      http_response_code INT NULL,
      request_id VARCHAR(150) NULL,
      result_code INT NULL,
      account_exists BOOLEAN NULL,
      name_at_bank VARCHAR(255) NULL,
      utr VARCHAR(150) NULL,
      amount_deposited DECIMAL(12,2) NULL,
      message VARCHAR(500) NULL,
      api_response JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
        await db_1.default.query(`CREATE TABLE IF NOT EXISTS fcu_mobile_bank_details (
      id INT AUTO_INCREMENT PRIMARY KEY,
      application_id INT NOT NULL UNIQUE,
      user_id INT NOT NULL,
      mobile_number VARCHAR(20) NOT NULL,
      http_response_code INT NULL,
      request_id VARCHAR(150) NULL,
      result_code VARCHAR(50) NULL,
      message VARCHAR(500) NULL,
      bank_account_data JSON NULL,
      api_response JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
        await db_1.default.query(`CREATE TABLE IF NOT EXISTS fcu_ckyc_searches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      application_id INT NOT NULL UNIQUE,
      user_id INT NOT NULL,
      pan_number VARCHAR(20) NOT NULL,
      ckyc_number VARCHAR(50) NULL,
      ckyc_status VARCHAR(80) NULL,
      registered_on VARCHAR(80) NULL,
      issuer VARCHAR(100) NULL,
      proof_type VARCHAR(100) NULL,
      matching_status VARCHAR(100) NULL,
      request_id VARCHAR(150) NULL,
      message VARCHAR(500) NULL,
      api_response JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
        await db_1.default.query(`CREATE TABLE IF NOT EXISTS fcu_aadhaar_fetches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      application_id INT NOT NULL UNIQUE,
      user_id INT NOT NULL,
      aadhaar_number VARCHAR(20) NOT NULL,
      pan_number VARCHAR(20) NULL, full_name VARCHAR(255) NULL,
      first_name VARCHAR(120) NULL, middle_name VARCHAR(120) NULL, last_name VARCHAR(120) NULL,
      dob VARCHAR(50) NULL, gender VARCHAR(30) NULL,
      address TEXT NULL, address_line_2 VARCHAR(255) NULL, city VARCHAR(120) NULL,
      state VARCHAR(120) NULL, pincode VARCHAR(15) NULL, country VARCHAR(80) NULL,
      linked_mobile VARCHAR(20) NULL, verification_status VARCHAR(80) NULL,
      request_id VARCHAR(150) NULL, relation VARCHAR(40) NULL, photo LONGTEXT NULL, api_response JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
        await db_1.default.query(`ALTER TABLE fcu_aadhaar_fetches ADD COLUMN IF NOT EXISTS relation VARCHAR(40) NULL AFTER request_id`);
        await db_1.default.query(`ALTER TABLE fcu_aadhaar_fetches ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20) NULL AFTER aadhaar_number`);
        await db_1.default.query(`ALTER TABLE fcu_aadhaar_fetches ADD COLUMN IF NOT EXISTS first_name VARCHAR(120) NULL AFTER full_name`);
        await db_1.default.query(`ALTER TABLE fcu_aadhaar_fetches ADD COLUMN IF NOT EXISTS middle_name VARCHAR(120) NULL AFTER first_name`);
        await db_1.default.query(`ALTER TABLE fcu_aadhaar_fetches ADD COLUMN IF NOT EXISTS last_name VARCHAR(120) NULL AFTER middle_name`);
        // Keep the lender-facing lead reference separate from the internal GP lead number.
        await db_1.default.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS lead_reference_number VARCHAR(50) NULL AFTER lead_number`);
        await db_1.default.query(`
      UPDATE users
      SET lead_reference_number = CONCAT('BLP1MP', LPAD(id, 2, '0'))
      WHERE lead_reference_number IS NULL OR TRIM(lead_reference_number) = ''
    `);
        await db_1.default.query(`ALTER TABLE bank_details MODIFY COLUMN is_verified VARCHAR(20) NOT NULL DEFAULT 'Not verified'`);
        await db_1.default.query(`UPDATE bank_details SET is_verified = CASE
      WHEN LOWER(TRIM(is_verified)) IN ('1', 'verified') THEN 'Verified'
      ELSE 'Not verified' END`);
        // Parameter 2 is the FCU queue; parameter 3 is assigned when a case is sent to credit.
        await db_1.default.query('ALTER TABLE applications ALTER COLUMN parameter SET DEFAULT 2');
        await db_1.default.query(`
      UPDATE applications a
      LEFT JOIN fcu_case_workflows w ON w.application_id = a.id
      SET a.parameter = 2
      WHERE LOWER(TRIM(a.status)) IN ('sent to fcu', 'sent_to_fcu')
        AND (w.stage IS NULL OR w.stage != 'FINALIZED')
        AND a.parameter != 2
    `);
        await db_1.default.query(`CREATE TABLE IF NOT EXISTS fcu_ekyc_reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      application_id INT NOT NULL,
      check_id VARCHAR(50) NOT NULL,
      status ENUM('PASS','FAIL','PENDING') NOT NULL DEFAULT 'PENDING',
      reviewed_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_fcu_ekyc_review (application_id, check_id),
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES fcu_users(id) ON DELETE SET NULL
    )`);
        await db_1.default.query(`CREATE TABLE IF NOT EXISTS fcu_case_history (
      id INT AUTO_INCREMENT PRIMARY KEY, application_id INT NOT NULL, event_type VARCHAR(50) NOT NULL,
      title VARCHAR(180) NOT NULL, description TEXT NULL, performed_by INT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_fcu_history_app_date (application_id, created_at),
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (performed_by) REFERENCES fcu_users(id) ON DELETE SET NULL
    )`);
        await db_1.default.query(`CREATE TABLE IF NOT EXISTS fcu_notification_reads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fcu_user_id INT NOT NULL,
      application_id INT NOT NULL,
      read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_fcu_notification_read (fcu_user_id, application_id),
      INDEX idx_fcu_notification_user_date (fcu_user_id, read_at),
      FOREIGN KEY (fcu_user_id) REFERENCES fcu_users(id) ON DELETE CASCADE,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    )`);
        await db_1.default.query(`CREATE TABLE IF NOT EXISTS fcu_field_report_notification_reads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fcu_user_id INT NOT NULL,
      report_id INT NOT NULL,
      read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_fcu_report_notification_read (fcu_user_id, report_id),
      FOREIGN KEY (fcu_user_id) REFERENCES fcu_users(id) ON DELETE CASCADE,
      FOREIGN KEY (report_id) REFERENCES field_verification_reports(id) ON DELETE CASCADE
    )`);
        await db_1.default.query(`INSERT INTO fcu_case_history (application_id,event_type,title,description,created_at)
      SELECT a.id,'APPLICATION_CREATED','Application submitted',CONCAT('Application created with status ',UPPER(a.status)),a.created_at
      FROM applications a WHERE NOT EXISTS (SELECT 1 FROM fcu_case_history h WHERE h.application_id=a.id AND h.event_type='APPLICATION_CREATED')`);
        for (const alter of [
            "ALTER TABLE fcu_field_verifications ADD COLUMN assignment_status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'",
            'ALTER TABLE fcu_field_verifications ADD COLUMN assigned_to VARCHAR(150) NULL',
            'ALTER TABLE fcu_field_verifications ADD COLUMN assigned_by INT NULL',
            'ALTER TABLE fcu_field_verifications ADD COLUMN assigned_at TIMESTAMP NULL',
        ]) {
            try {
                await db_1.default.query(alter);
            }
            catch (error) {
                if (error?.code !== 'ER_DUP_FIELDNAME')
                    throw error;
            }
        }
        await db_1.default.query(`
      INSERT IGNORE INTO fcu_field_verifications (application_id, residence_data, office_data)
      SELECT
        a.id,
        JSON_OBJECT(
          'initiatedOn', DATE_FORMAT(COALESCE(a.created_at, NOW()), '%d %b %Y'),
          'metWith', COALESCE(up.full_name, 'Applicant'),
          'residenceType', COALESCE(up.address_type, 'Owned'),
          'easeOfIdentification', 'Easy',
          'residingSince', '5 years',
          'earningMembers', '2',
          'neighbourCheck', 'Positive',
          'visitOn', DATE_FORMAT(DATE_ADD(COALESCE(a.created_at, NOW()), INTERVAL 2 DAY), '%d %b %Y'),
          'documentVerified', 'Aadhaar and address proof',
          'receivedOn', DATE_FORMAT(DATE_ADD(COALESCE(a.created_at, NOW()), INTERVAL 2 DAY), '%d %b %Y'),
          'relation', 'Self',
          'houseType', 'Independent house',
          'locality', COALESCE(up.city, 'Local area'),
          'totalMembers', '4',
          'livingStandard', 'Good',
          'geoCoordinates', CONCAT(COALESCE(bi.latitude, '26.9124'), ', ', COALESCE(bi.longitude, '75.7873')),
          'remarks', 'Residence details verified successfully.',
          'photo', 'Residence photo captured',
          'reportStatus', 'VERIFIED'
        ),
        JSON_OBJECT(
          'initiatedOn', DATE_FORMAT(COALESCE(a.created_at, NOW()), '%d %b %Y'),
          'metWith', 'HR / Reporting Manager',
          'entryAllowed', 'Yes',
          'signboardSighted', 'Yes',
          'staffSighted', '18',
          'employedSince', '3 years',
          'visitOn', DATE_FORMAT(DATE_ADD(COALESCE(a.created_at, NOW()), INTERVAL 3 DAY), '%d %b %Y'),
          'documentVerified', 'Employee ID and salary proof',
          'reportStatus', 'VERIFIED',
          'receivedOn', DATE_FORMAT(DATE_ADD(COALESCE(a.created_at, NOW()), INTERVAL 3 DAY), '%d %b %Y'),
          'relation', 'Employer',
          'employerName', COALESCE(ed.company_name, 'Self Employed'),
          'locality', COALESCE(ed.work_city, up.city, 'Business area'),
          'employeeStrength', '25+',
          'geoCoordinates', CONCAT(COALESCE(bi.latitude, '26.9124'), ', ', COALESCE(bi.longitude, '75.7873')),
          'remarks', 'Office and employment details verified.',
          'photo', 'Office photo captured'
        )
      FROM applications a
      INNER JOIN users u ON u.id = a.user_id
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN employment_details ed ON ed.user_id = u.id
      LEFT JOIN browser_info bi ON bi.id = (SELECT bi2.id FROM browser_info bi2 WHERE bi2.user_id = u.id ORDER BY bi2.id DESC LIMIT 1)
    `);
        console.log('FCU authentication and workflow tables are ready.');
    }
    catch (error) {
        console.warn('Database initialization warning (server will still respond):', {
            code: error?.code,
            message: error?.message || String(error),
        });
    }
};
const startServer = () => {
    try {
        const listenTarget = typeof global.PhusionPassenger !== 'undefined'
            ? 'passenger'
            : (process.env.PORT || 5000);
        const server = app.listen(listenTarget, () => {
            console.log(`FCU Server is running on ${listenTarget}`);
            // Asynchronously prepare DB tables without blocking the web listener
            initDatabase().catch(err => console.warn('Background DB init error:', err?.message || err));
        });
        server.on('error', (error) => {
            console.warn('HTTP server warning (handled):', { code: error.code, message: error.message });
        });
        process.once('SIGINT', () => server.close(() => process.exit(0)));
        process.once('SIGTERM', () => server.close(() => process.exit(0)));
    }
    catch (error) {
        console.warn('Server startup warning (handled):', error?.message || error);
    }
};
if (process.env.VERCEL !== '1') {
    startServer();
}
// Export app for cPanel Passenger and Vercel serverless deployment
exports.default = app;
module.exports = app;
