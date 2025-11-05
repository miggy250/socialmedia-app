const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get trending/popular posts
router.get('/trending', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    // Get posts sorted by engagement (likes + comments count)
    const [posts] = await pool.execute(`
      SELECT 
        p.*,
        pr.username,
        pr.full_name,
        pr.avatar_url,
        pr.location,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) AS user_liked,
        ((SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) + 
         (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) * 2) AS engagement_score
      FROM posts p
      JOIN profiles pr ON p.user_id = pr.id
      WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY engagement_score DESC, p.created_at DESC
      LIMIT ?
    `, [req.user.id, limit]);

    res.json({ posts });
  } catch (error) {
    console.error('Get trending posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get trending hashtags
router.get('/hashtags', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const [hashtags] = await pool.execute(`
      SELECT 
        h.id,
        h.name,
        COUNT(ph.post_id) AS post_count
      FROM hashtags h
      LEFT JOIN post_hashtags ph ON h.id = ph.hashtag_id
      JOIN posts p ON ph.post_id = p.id
      WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY h.id, h.name
      ORDER BY post_count DESC
      LIMIT ?
    `, [limit]);

    res.json({ hashtags });
  } catch (error) {
    console.error('Get trending hashtags error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get posts by hashtag
router.get('/hashtag/:name', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const [posts] = await pool.execute(`
      SELECT 
        p.*,
        pr.username,
        pr.full_name,
        pr.avatar_url,
        pr.location,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) AS user_liked
      FROM posts p
      JOIN profiles pr ON p.user_id = pr.id
      JOIN post_hashtags ph ON p.id = ph.post_id
      JOIN hashtags h ON ph.hashtag_id = h.id
      WHERE h.name = ?
      ORDER BY p.created_at DESC
      LIMIT ?
    `, [req.user.id, name.toLowerCase(), limit]);

    res.json({ posts, hashtag: name });
  } catch (error) {
    console.error('Get hashtag posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
