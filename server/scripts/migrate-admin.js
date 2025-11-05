const { pool } = require('../config/database');

async function columnExists(conn, table, column) {
  const [rows] = await conn.execute(
    `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows.length > 0;
}

async function addColumnIfMissing(conn, sql) {
  await conn.execute(sql);
}

async function main() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const table = 'users';

    if (!(await columnExists(conn, table, 'is_admin'))) {
      await addColumnIfMissing(conn, `ALTER TABLE ${table} ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER email_verified`);
    }
    if (!(await columnExists(conn, table, 'is_active'))) {
      await addColumnIfMissing(conn, `ALTER TABLE ${table} ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER is_admin`);
    }
    if (!(await columnExists(conn, table, 'deleted_at'))) {
      await addColumnIfMissing(conn, `ALTER TABLE ${table} ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL AFTER updated_at`);
    }

    await conn.commit();
    console.log('✅ Migration complete: users table now has is_admin, is_active, deleted_at');
    process.exit(0);
  } catch (e) {
    await conn.rollback();
    console.error('❌ Migration failed:', e);
    process.exit(1);
  } finally {
    conn.release();
  }
}

main();
