const bcrypt = require('bcrypt');
const { pool } = require('../config/database');

async function main() {
  const [, , emailArg, newPasswordArg] = process.argv;

  if (!emailArg || !newPasswordArg) {
    console.error('Usage: node server/scripts/reset-password.js <email> <newPassword>');
    process.exit(1);
  }

  const email = String(emailArg).trim().toLowerCase();
  const newPassword = String(newPasswordArg);

  if (newPassword.length < 6) {
    console.error('Error: password must be at least 6 characters.');
    process.exit(1);
  }

  const conn = await pool.getConnection();
  try {
    const [users] = await conn.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      console.error(`User not found for email: ${email}`);
      process.exit(1);
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await conn.execute('UPDATE users SET password_hash = ? WHERE email = ?', [hash, email]);

    console.log(`✅ Password updated for ${email}`);
    process.exit(0);
  } catch (e) {
    console.error('❌ Failed to reset password:', e);
    process.exit(1);
  } finally {
    conn.release();
  }
}

main();
