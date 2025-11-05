const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const { pool } = require('../config/database');

async function getUniqueUsername(connection, desiredUsername, excludeUserId = null) {
  // If desired username is taken by someone else, append a numeric suffix
  let candidate = desiredUsername;
  let suffix = 1;
  // Loop until an available username is found
  // Guard against excessive loops
  while (suffix < 1000) {
    const [rows] = await connection.execute(
      excludeUserId
        ? 'SELECT id FROM profiles WHERE username = ? AND id != ?'
        : 'SELECT id FROM profiles WHERE username = ?'
      , excludeUserId ? [candidate, excludeUserId] : [candidate]
    );
    if (rows.length === 0) return candidate;
    candidate = `${desiredUsername}_${suffix++}`;
  }
  // Fallback if somehow everything is taken
  return `${desiredUsername}_${Date.now()}`;
}

async function upsertUser({ email, username, fullName, password }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Check by email
    const [existingUsers] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    let userId = existingUsers[0]?.id;

    if (!userId) {
      userId = randomUUID();
      const passwordHash = await bcrypt.hash(password, 12);
      await connection.execute(
        'INSERT INTO users (id, email, password_hash, email_verified) VALUES (?, ?, ?, ?)',
        [userId, email, passwordHash, true]
      );
    }

    // Ensure profile exists
    const [existingProfiles] = await connection.execute(
      'SELECT id FROM profiles WHERE id = ?',
      [userId]
    );

    // Determine a safe username (avoid conflicting with other users)
    const safeUsername = await getUniqueUsername(connection, username, userId || null);

    if (existingProfiles.length === 0) {
      await connection.execute(
        'INSERT INTO profiles (id, username, full_name, bio) VALUES (?, ?, ?, ?)',
        [userId, safeUsername, fullName, `${safeUsername} demo user`]
      );
    } else {
      // Update username/full name if needed
      await connection.execute(
        'UPDATE profiles SET username = ?, full_name = ? WHERE id = ?',
        [safeUsername, fullName, userId]
      );
    }

    await connection.commit();
    return userId;
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
}

async function seedNotifications(userId) {
  // Insert a couple of sample notifications
  await pool.execute(
    'INSERT INTO notifications (id, user_id, type, content, link, is_read) VALUES (?, ?, ?, ?, ?, ?)',
    [randomUUID(), userId, 'welcome', 'Welcome to Rwanda Connect! 🎉', null, false]
  );
  await pool.execute(
    'INSERT INTO notifications (id, user_id, type, content, link, is_read) VALUES (?, ?, ?, ?, ?, ?)',
    [randomUUID(), userId, 'info', 'Remember to complete your profile.', '/settings', false]
  );
}

async function main() {
  try {
    const users = [
      { email: 'inganji@example.com', username: 'inganji', fullName: 'Inganji', password: 'password123' },
      { email: 'init@example.com', username: 'INIT', fullName: 'INIT', password: 'password123' },
      { email: 'blackdih@example.com', username: 'blackdih', fullName: 'Black Dih', password: 'password123' },
    ];

    for (const u of users) {
      const id = await upsertUser(u);
      await seedNotifications(id);
      console.log(`Seeded user ${u.username} (${u.email})`);
    }

    console.log('✅ Seeding complete');
    process.exit(0);
  } catch (e) {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  }
}

main();
