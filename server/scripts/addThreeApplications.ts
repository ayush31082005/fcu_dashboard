import pool from '../src/config/db';

const mobile = '8423573070';
const applications = [
  { amount: 70000, purpose: 'Medical Loan' },
  { amount: 125000, purpose: 'Business Loan' },
  { amount: 180000, purpose: 'Education Loan' },
];

const run = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [users]: any = await connection.query('SELECT id FROM users WHERE mobile_number = ? LIMIT 1', [mobile]);
    if (!users.length) throw new Error(`Customer with mobile ${mobile} does not exist`);
    const userId = users[0].id;

    const inserted: number[] = [];
    for (const application of applications) {
      const [result]: any = await connection.query(
        `INSERT INTO applications (user_id, loan_amount, loan_purpose, existing_loan, status, parameter)
         VALUES (?, ?, ?, 0, 'pending', 2)`,
        [userId, application.amount, application.purpose]
      );
      inserted.push(result.insertId);
    }
    await connection.commit();
    console.log(`Added 3 applications for ${mobile}: ${inserted.join(', ')}`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
};

run().catch(error => {
  console.error('Unable to add applications:', error);
  process.exit(1);
});
