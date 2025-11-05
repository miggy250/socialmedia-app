const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user suggestions
router.get('/suggestions', authenticateToken, async (req, res) => {
  try {
    const [suggestions] = await pool.execute(`
      SELECT p.id, p.username, p.full_name, p.avatar_url, p.bio
      FROM profiles p
      WHERE p.id != ? 
        AND p.id NOT IN (
          SELECT f.following_id 
          FROM follows f 
          WHERE f.follower_id = ?
        )
      ORDER BY p.created_at DESC
      LIMIT 5
    `, [req.user.id, req.user.id]);

    res.json({ suggestions });
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get my profile with follow counts (must be before parameterized ':userId' route)
router.get('/me/profile', authenticateToken, async (req, res) => {
  try {
    const [profiles] = await pool.execute(`
      SELECT 
        p.*,
        pfc.followers_count,
        pfc.following_count
      FROM profiles p
      LEFT JOIN profile_follow_counts pfc ON p.id = pfc.profile_id
      WHERE p.id = ?
    `, [req.user.id]);

    if (profiles.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ profile: profiles[0] });
  } catch (error) {
    console.error('Get my profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Follow user
router.post('/:userId/follow', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if already following
    const [existing] = await pool.execute(
      'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
      [req.user.id, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    await pool.execute(
      'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)',
      [req.user.id, userId]
    );

    res.json({ message: 'Successfully followed user' });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unfollow user
router.delete('/:userId/follow', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    await pool.execute(
      'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
      [req.user.id, userId]
    );

    res.json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get profile with follow counts
router.get('/:userId/profile', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const [profiles] = await pool.execute(`
      SELECT 
        p.*,
        pfc.followers_count,
        pfc.following_count,
        (SELECT COUNT(*) FROM follows f WHERE f.follower_id = ? AND f.following_id = p.id) AS is_following
      FROM profiles p
      LEFT JOIN profile_follow_counts pfc ON p.id = pfc.profile_id
      WHERE p.id = ?
    `, [req.user.id, userId]);

    if (profiles.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ profile: profiles[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update profile
router.put('/me/profile', [
  authenticateToken,
  body('fullName').optional().isLength({ max: 100 }),
  body('bio').optional().isLength({ max: 500 }),
  body('location').optional().isLength({ max: 100 }),
  body('avatarUrl').optional().isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullName, bio, location, avatarUrl } = req.body;

    await pool.execute(`
      UPDATE profiles 
      SET full_name = ?, bio = ?, location = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [fullName || null, bio || null, location || null, avatarUrl || null, req.user.id]);

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
