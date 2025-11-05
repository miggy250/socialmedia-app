const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/isAdmin');

const router = express.Router();

// List users with basic info
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const params = [];

    let sql = `SELECT u.id, u.email, u.is_admin, u.is_active, u.deleted_at, p.username, p.full_name
               FROM users u LEFT JOIN profiles p ON u.id = p.id`;
    if (q) {
      sql += ' WHERE u.email LIKE ? OR p.username LIKE ? OR p.full_name LIKE ?';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    sql += ' ORDER BY u.created_at DESC LIMIT ?';
    params.push(limit);

    const [rows] = await pool.execute(sql, params);
    res.json({ users: rows });
  } catch (e) {
    console.error('Admin list users error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Deactivate user (cannot deactivate self)
router.post('/users/:id/deactivate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) return res.status(400).json({ error: 'Cannot deactivate your own account' });
    await pool.execute('UPDATE users SET is_active = 0 WHERE id = ?', [id]);
    res.json({ message: 'User deactivated' });
  } catch (e) {
    console.error('Admin deactivate error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reactivate user
router.post('/users/:id/reactivate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('UPDATE users SET is_active = 1, deleted_at = NULL WHERE id = ?', [id]);
    res.json({ message: 'User reactivated' });
  } catch (e) {
    console.error('Admin reactivate error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Soft delete user (safety confirmation required)
router.post('/users/:id/soft-delete', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { confirm } = req.body || {};

    if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });

    // Require explicit confirmation string to avoid accidents
    // Expected: DELETE USER <email>
    if (!confirm || typeof confirm !== 'string') {
      return res.status(400).json({ error: 'Confirmation string required: DELETE USER <email>' });
    }

    const [rows] = await pool.execute('SELECT email FROM users WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const email = rows[0].email;

    const expected = `DELETE USER ${email}`;
    if (confirm !== expected) {
      return res.status(400).json({ error: `Invalid confirmation. Expected: "${expected}"` });
    }

    await pool.execute('UPDATE users SET is_active = 0, deleted_at = NOW() WHERE id = ?', [id]);
    res.json({ message: 'User soft-deleted' });
  } catch (e) {
    console.error('Admin soft delete error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify user
router.post('/users/:userId/verify', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    await pool.execute(
      'UPDATE profiles SET is_verified = TRUE WHERE id = ?',
      [userId]
    );

    res.json({ message: 'User verified successfully' });
  } catch (error) {
    console.error('Verify user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unverify user
router.post('/users/:userId/unverify', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    await pool.execute(
      'UPDATE profiles SET is_verified = FALSE WHERE id = ?',
      [userId]
    );

    res.json({ message: 'User verification removed successfully' });
  } catch (error) {
    console.error('Unverify user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
