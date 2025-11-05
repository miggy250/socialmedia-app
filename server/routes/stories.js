const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { randomUUID } = require('crypto');

const router = express.Router();

// Get active stories (from followed users and own)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [stories] = await pool.execute(`
      SELECT 
        s.*,
        p.username,
        p.full_name,
        p.avatar_url,
        (SELECT COUNT(*) FROM story_views sv WHERE sv.story_id = s.id AND sv.user_id = ?) AS user_viewed,
        (SELECT COUNT(*) FROM story_views sv WHERE sv.story_id = s.id) AS views_count
      FROM stories s
      JOIN profiles p ON s.user_id = p.id
      WHERE s.expires_at > NOW()
        AND (
          s.user_id = ?
          OR s.user_id IN (
            SELECT following_id FROM follows WHERE follower_id = ?
          )
        )
      ORDER BY s.created_at DESC
    `, [req.user.id, req.user.id, req.user.id]);

    // Group stories by user
    const storiesByUser = {};
    stories.forEach(story => {
      if (!storiesByUser[story.user_id]) {
        storiesByUser[story.user_id] = {
          user_id: story.user_id,
          username: story.username,
          full_name: story.full_name,
          avatar_url: story.avatar_url,
          stories: []
        };
      }
      storiesByUser[story.user_id].stories.push(story);
    });

    const groupedStories = Object.values(storiesByUser);

    res.json({ stories: groupedStories });
  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get stories for a specific user
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const [stories] = await pool.execute(`
      SELECT 
        s.*,
        p.username,
        p.full_name,
        p.avatar_url,
        (SELECT COUNT(*) FROM story_views sv WHERE sv.story_id = s.id AND sv.user_id = ?) AS user_viewed,
        (SELECT COUNT(*) FROM story_views sv WHERE sv.story_id = s.id) AS views_count
      FROM stories s
      JOIN profiles p ON s.user_id = p.id
      WHERE s.user_id = ? AND s.expires_at > NOW()
      ORDER BY s.created_at ASC
    `, [req.user.id, userId]);

    res.json({ stories });
  } catch (error) {
    console.error('Get user stories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create story
router.post('/', [
  authenticateToken,
  body('imageUrl').notEmpty().isString(),
  body('caption').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { imageUrl, caption } = req.body;
    const newStoryId = randomUUID();

    await pool.execute(
      'INSERT INTO stories (id, user_id, image_url, caption) VALUES (?, ?, ?, ?)',
      [newStoryId, req.user.id, imageUrl, caption || null]
    );

    // Get the created story with profile info
    const [newStory] = await pool.execute(`
      SELECT 
        s.*,
        p.username,
        p.full_name,
        p.avatar_url
      FROM stories s
      JOIN profiles p ON s.user_id = p.id
      WHERE s.id = ?
    `, [newStoryId]);

    res.status(201).json({ story: newStory[0] });
  } catch (error) {
    console.error('Create story error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark story as viewed
router.post('/:storyId/view', authenticateToken, async (req, res) => {
  try {
    const { storyId } = req.params;

    // Check if already viewed
    const [existing] = await pool.execute(
      'SELECT id FROM story_views WHERE story_id = ? AND user_id = ?',
      [storyId, req.user.id]
    );

    if (existing.length === 0) {
      await pool.execute(
        'INSERT INTO story_views (story_id, user_id) VALUES (?, ?)',
        [storyId, req.user.id]
      );
    }

    res.json({ message: 'Story view recorded' });
  } catch (error) {
    console.error('Mark story viewed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete story
router.delete('/:storyId', authenticateToken, async (req, res) => {
  try {
    const { storyId } = req.params;

    // Verify ownership
    const [story] = await pool.execute(
      'SELECT user_id FROM stories WHERE id = ?',
      [storyId]
    );

    if (story.length === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }

    if (story[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this story' });
    }

    await pool.execute('DELETE FROM stories WHERE id = ?', [storyId]);

    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get story viewers (for own stories)
router.get('/:storyId/viewers', authenticateToken, async (req, res) => {
  try {
    const { storyId } = req.params;

    // Verify ownership
    const [story] = await pool.execute(
      'SELECT user_id FROM stories WHERE id = ?',
      [storyId]
    );

    if (story.length === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }

    if (story[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view story viewers' });
    }

    const [viewers] = await pool.execute(`
      SELECT 
        p.id,
        p.username,
        p.full_name,
        p.avatar_url,
        sv.viewed_at
      FROM story_views sv
      JOIN profiles p ON sv.user_id = p.id
      WHERE sv.story_id = ?
      ORDER BY sv.viewed_at DESC
    `, [storyId]);

    res.json({ viewers });
  } catch (error) {
    console.error('Get story viewers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
