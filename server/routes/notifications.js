const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// List latest notifications for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const [rows] = await pool.execute(
      `SELECT id, user_id, type, content, link, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [req.user.id, limit]
    );
    res.json({ notifications: rows });
  } catch (error) {
    console.error('List notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark a notification as read
router.post('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.execute(
      `UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?`,
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
