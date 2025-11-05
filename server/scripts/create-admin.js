const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const { pool } = require('../config/database');

async function main() {
  const [, , emailArg, passwordArg, usernameArg, fullNameArg] = process.argv;

  if (!emailArg || !passwordArg) {
    console.error('Usage: node server/scripts/create-admin.js <email> <password> [username] [fullName]');
    process.exit(1);
  }

  const email = String(emailArg).trim().toLowerCase();
  const password = String(passwordArg);
  const username = (usernameArg ? String(usernameArg) : email.split('@')[0]).replace(/[^a-zA-Z0-9_]/g, '_');
  const fullName = fullNameArg ? String(fullNameArg) : 'Administrator';

  if (password.length < 6) {
    console.error('Error: password must be at least 6 characters.');
    process.exit(1);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Ensure users table has necessary columns (is_admin, is_active, deleted_at)
    // We won't auto-migrate here; run migrate-admin.js beforehand.

    const [userRows] = await conn.execute('SELECT id FROM users WHERE email = ?', [email]);

    let userId;
    const hash = await bcrypt.hash(password, 12);

    if (userRows.length === 0) {
      userId = randomUUID();
      await conn.execute(
        'INSERT INTO users (id, email, password_hash, email_verified, is_admin, is_active) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, email, hash, true, 1, 1]
      );
    } else {
      userId = userRows[0].id;
      await conn.execute('UPDATE users SET password_hash = ?, is_admin = 1, is_active = 1, deleted_at = NULL WHERE id = ?', [hash, userId]);
    }

    // Ensure profile exists and set basic info
    const [profileRows] = await conn.execute('SELECT id FROM profiles WHERE id = ?', [userId]);
    if (profileRows.length === 0) {
      // Handle username collision by suffix
      let candidate = username;
      let suffix = 1;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const [exists] = await conn.execute('SELECT id FROM profiles WHERE username = ?', [candidate]);
        if (exists.length === 0) break;
        candidate = `${username}_${suffix++}`;
      }
      await conn.execute('INSERT INTO profiles (id, username, full_name) VALUES (?, ?, ?)', [userId, candidate, fullName]);
    } else {
      await conn.execute('UPDATE profiles SET full_name = ? WHERE id = ?', [fullName, userId]);
    }

    await conn.commit();
    console.log(`✅ Admin account ready for ${email} (user id: ${userId})`);
    process.exit(0);
  } catch (e) {
    await conn.rollback();
    console.error('❌ Failed to create admin:', e);
    process.exit(1);
  } finally {
    conn.release();
  }
}

main();
