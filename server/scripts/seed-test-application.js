require('dotenv').config()
const mysql = require('mysql2/promise')
const crypto = require('crypto')

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })
  await connection.beginTransaction()
  try {
    const stamp = Date.now().toString().slice(-8)
    const mobile = `91${stamp}`
    const leadNumber = `FCU-TEST-${stamp}`
    const [userResult] = await connection.query(
      'INSERT INTO users (uuid, lead_number, mobile_number) VALUES (?, ?, ?)',
      [crypto.randomUUID(), leadNumber, mobile]
    )
    const userId = userResult.insertId
    await connection.query(`INSERT INTO user_profiles
      (user_id, full_name, father_name, mother_name, dob, gender, marital_status, religion, education, address_type, address, city, state, pincode, rent_amount, personal_email)
      VALUES (?, 'Arjun Test Kumar', 'Mahesh Kumar', 'Sunita Devi', '1994-05-18', 'Male', 'Single', 'Hindu', 'Graduate', 'rented', 'D-84, Vyapar Marg, Sector 15', 'Noida', 'Uttar Pradesh', '201301', 12000, ?)`,
      [userId, `arjun.test.${stamp}@example.com`])
    await connection.query(`INSERT INTO employment_details
      (user_id, employment_type, company_name, company_type, industry, role, monthly_income, official_email, work_address, work_pincode, work_city, work_state, experience_years, salary_date)
      VALUES (?, 'salaried', 'Test Fintech Pvt Ltd', 'Private', 'Finance', 'Operations Executive', 45000, ?, 'Sector 62, Noida', '201309', 'Noida', 'Uttar Pradesh', '4 years', 5)`,
      [userId, `arjun.office.${stamp}@example.com`])
    await connection.query('INSERT INTO pan_card_details (user_id, pan_number, pan_name, is_verified) VALUES (?, ?, ?, 1)', [userId, `TESTK${stamp.slice(-4)}A`, 'Arjun Test Kumar'])
    await connection.query('INSERT INTO aadhaar_card_details (user_id, aadhaar_number, full_name, dob, gender, address, is_verified) VALUES (?, ?, ?, ?, ?, ?, 1)', [userId, `9999${stamp}`, 'Arjun Test Kumar', '18-05-1994', 'Male', 'D-84, Vyapar Marg, Noida'])
    await connection.query(`INSERT INTO bank_details
      (user_id, account_type, is_salary_account, account_holder_name, bank_name, account_number, ifsc_code, branch_name)
      VALUES (?, 'Savings', 1, 'Arjun Test Kumar', 'HDFC Bank', ?, 'HDFC0001234', 'Noida Sector 18')`, [userId, `TEST${stamp}`])
    await connection.query('INSERT INTO credit_report_details (user_id, cibil_score, total_accounts, active_accounts) VALUES (?, 735, 3, 1)', [userId])
    await connection.query('INSERT INTO kyc_documents (user_id, selfie_path) VALUES (?, ?)', [userId, 'uploads/test/arjun-selfie.jpg'])
    await connection.query(`INSERT INTO browser_info
      (user_id, ip_address, browser_info, device_type, device_model, latitude, longitude)
      VALUES (?, '103.45.67.89', 'Chrome 140', 'Desktop', 'Windows PC', 28.58318719, 77.31876853)`, [userId])
    await connection.query('INSERT INTO references_details (user_id, reference_name, mobile_number, relationship) VALUES (?, ?, ?, ?)', [userId, 'Rohit Kumar', '9876501234', 'Brother'])
    const [applicationResult] = await connection.query(`INSERT INTO applications
      (user_id, loan_amount, loan_purpose, existing_loan, status, parameter) VALUES (?, 85000, 'Personal Loan', 0, 'pending', 2)`, [userId])
    const applicationId = applicationResult.insertId
    await connection.query('INSERT IGNORE INTO fcu_case_locks (application_id) VALUES (?)', [applicationId])
    await connection.commit()
    console.log(JSON.stringify({ applicationId, userId, leadNumber, name: 'Arjun Test Kumar', mobile }, null, 2))
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    await connection.end()
  }
}

seed().catch(error => {
  console.error(error.code || 'SEED_ERROR', error.message)
  process.exit(1)
})
