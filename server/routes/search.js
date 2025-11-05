const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Search all (users, posts, hashtags)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    if (!q) {
      return res.json({ users: [], posts: [], hashtags: [] });
    }

    const searchTerm = `%${q}%`;
    const limit = 10;

    // Search users
    const [users] = await pool.execute(`
      SELECT 
        u.id,
        p.username,
        p.full_name,
        p.avatar_url,
        p.bio,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers_count
      FROM users u
      JOIN profiles p ON u.id = p.id
      WHERE p.username LIKE ? OR p.full_name LIKE ?
      ORDER BY followers_count DESC
      LIMIT ?
    `, [searchTerm, searchTerm, limit]);

    // Search posts
    const [posts] = await pool.execute(`
      SELECT 
        p.*,
        pr.username,
        pr.full_name,
        pr.avatar_url,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) AS user_liked
      FROM posts p
      JOIN profiles pr ON p.user_id = pr.id
      WHERE p.content LIKE ?
      ORDER BY p.created_at DESC
      LIMIT ?
    `, [req.user.id, searchTerm, limit]);

    // Search hashtags
    const [hashtags] = await pool.execute(`
      SELECT 
        h.id,
        h.name,
        COUNT(ph.post_id) AS post_count
      FROM hashtags h
      LEFT JOIN post_hashtags ph ON h.id = ph.hashtag_id
      WHERE h.name LIKE ?
      GROUP BY h.id, h.name
      ORDER BY post_count DESC
      LIMIT ?
    `, [searchTerm, limit]);

    res.json({ users, posts, hashtags });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search users only
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    if (!q) {
      return res.json({ users: [] });
    }

    const searchTerm = `%${q}%`;
    const limit = parseInt(req.query.limit) || 20;

    const [users] = await pool.execute(`
      SELECT 
        u.id,
        p.username,
        p.full_name,
        p.avatar_url,
        p.bio,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND following_id = u.id) AS is_following
      FROM users u
      JOIN profiles p ON u.id = p.id
      WHERE (p.username LIKE ? OR p.full_name LIKE ?) AND u.id != ?
      ORDER BY followers_count DESC
      LIMIT ?
    `, [req.user.id, searchTerm, searchTerm, req.user.id, limit]);

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
