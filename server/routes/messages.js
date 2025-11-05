const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get conversations (latest message per conversation partner)
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Pull recent messages involving current user
    const [rows] = await pool.execute(
      `SELECT m.*, 
              CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END AS partner_id
       FROM messages m
       WHERE m.sender_id = ? OR m.receiver_id = ?
       ORDER BY m.created_at DESC
       LIMIT 200`,
      [userId, userId, userId]
    );

    // Group by partner and pick first (latest)
    const latestByPartner = new Map();
    for (const msg of rows) {
      if (!latestByPartner.has(msg.partner_id)) {
        latestByPartner.set(msg.partner_id, msg);
      }
    }

    const partnerIds = Array.from(latestByPartner.keys());
    let partners = [];
    if (partnerIds.length) {
      const [profiles] = await pool.query(
        `SELECT p.id, p.username, p.full_name, p.avatar_url FROM profiles p WHERE p.id IN (${partnerIds.map(() => '?').join(',')})`,
        partnerIds
      );
      partners = profiles;
    }

    // Unread counts by partner
    const [unreadRows] = await pool.execute(
      `SELECT sender_id as partner_id, COUNT(*) as unread
       FROM messages
       WHERE receiver_id = ? AND is_read = 0
       GROUP BY sender_id`,
      [userId]
    );

    const unreadMap = new Map(unreadRows.map(r => [r.partner_id, r.unread]));
    const partnerMap = new Map(partners.map(p => [p.id, p]));

    const conversations = Array.from(latestByPartner.entries()).map(([partnerId, lastMessage]) => ({
      user: partnerMap.get(partnerId) || { id: partnerId },
      lastMessage,
      unread: (unreadMap.get(partnerId) || 0) > 0,
    }));

    res.json({ conversations });
  } catch (e) {
    console.error('Get conversations error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get thread with specific user
router.get('/thread/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const otherId = req.params.userId;

    const [msgs] = await pool.execute(
      `SELECT * FROM messages
       WHERE (sender_id = ? AND receiver_id = ?)
          OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC`,
      [userId, otherId, otherId, userId]
    );

    // mark as read for messages received
    await pool.execute(
      `UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ? AND is_read = 0`,
      [userId, otherId]
    );

    res.json({ messages: msgs });
  } catch (e) {
    console.error('Get thread error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send message
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, content } = req.body || {};
    if (!receiverId || !content || !String(content).trim()) {
      return res.status(400).json({ error: 'receiverId and content are required' });
    }

    await pool.execute(
      `INSERT INTO messages (sender_id, receiver_id, content, is_read)
       VALUES (?, ?, ?, 0)`,
      [senderId, receiverId, content]
    );

    res.status(201).json({ message: 'Message sent' });
  } catch (e) {
    console.error('Send message error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark thread as read
router.post('/thread/:userId/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const otherId = req.params.userId;

    await pool.execute(
      `UPDATE messages SET read = 1 WHERE receiver_id = ? AND sender_id = ? AND read = 0`,
      [userId, otherId]
    );

    res.json({ message: 'Thread marked as read' });
  } catch (e) {
    console.error('Mark read error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
