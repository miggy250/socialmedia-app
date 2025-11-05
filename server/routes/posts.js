const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { randomUUID } = require('crypto');

const router = express.Router();

// Get posts feed
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [posts] = await pool.execute(`
      SELECT 
        p.*,
        pr.username,
        pr.full_name,
        pr.avatar_url,
        pr.location,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) AS user_liked
      FROM posts p
      JOIN profiles pr ON p.user_id = pr.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, limit, offset]);

    res.json({ posts });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create post
router.post('/', [
  authenticateToken,
  body('content').optional().isLength({ max: 2000 }),
  body('imageUrl').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, imageUrl } = req.body;
    
    // Require at least content or image
    if (!content && !imageUrl) {
      return res.status(400).json({ error: 'Post must have content or an image' });
    }

    const newPostId = randomUUID();

    // Extract hashtags from content
    const hashtagRegex = /#(\w+)/g;
    const hashtags = content ? [...new Set((content.match(hashtagRegex) || []).map(tag => tag.slice(1).toLowerCase()))] : [];

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Insert post
      await connection.execute(
        'INSERT INTO posts (id, user_id, content, image_url) VALUES (?, ?, ?, ?)',
        [newPostId, req.user.id, content || null, imageUrl || null]
      );

      // Insert hashtags
      for (const hashtag of hashtags) {
        // Insert or ignore hashtag
        await connection.execute(
          'INSERT IGNORE INTO hashtags (name) VALUES (?)',
          [hashtag]
        );
        
        // Link hashtag to post
        const [hashtagRow] = await connection.execute(
          'SELECT id FROM hashtags WHERE name = ?',
          [hashtag]
        );
        
        if (hashtagRow.length > 0) {
          await connection.execute(
            'INSERT INTO post_hashtags (post_id, hashtag_id) VALUES (?, ?)',
            [newPostId, hashtagRow[0].id]
          );
        }
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    // Get the created post with profile info
    const [newPost] = await pool.execute(`
      SELECT 
        p.*,
        pr.username,
        pr.full_name,
        pr.avatar_url,
        pr.location
      FROM posts p
      JOIN profiles pr ON p.user_id = pr.id
      WHERE p.id = ?
    `, [newPostId]);

    res.status(201).json({ post: newPost[0] });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Like/Unlike post
router.post('/:postId/like', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;

    // Check if already liked
    const [existingLike] = await pool.execute(
      'SELECT id FROM likes WHERE post_id = ? AND user_id = ?',
      [postId, req.user.id]
    );

    if (existingLike.length > 0) {
      // Unlike
      await pool.execute(
        'DELETE FROM likes WHERE post_id = ? AND user_id = ?',
        [postId, req.user.id]
      );
      res.json({ liked: false, message: 'Post unliked' });
    } else {
      // Like
      await pool.execute(
        'INSERT INTO likes (post_id, user_id) VALUES (?, ?)',
        [postId, req.user.id]
      );
      res.json({ liked: true, message: 'Post liked' });
    }
  } catch (error) {
    console.error('Like/unlike error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get post comments
router.get('/:postId/comments', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;

    const [comments] = await pool.execute(`
      SELECT 
        c.*,
        p.username,
        p.full_name,
        p.avatar_url
      FROM comments c
      JOIN profiles p ON c.user_id = p.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `, [postId]);

    res.json({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add comment
router.post('/:postId/comments', [
  authenticateToken,
  body('content').notEmpty().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { postId } = req.params;
    const { content } = req.body;

    const newCommentId = randomUUID();

    await pool.execute(
      'INSERT INTO comments (id, post_id, user_id, content) VALUES (?, ?, ?, ?)',
      [newCommentId, postId, req.user.id, content]
    );

    // Get the created comment with profile info
    const [newComment] = await pool.execute(`
      SELECT 
        c.*,
        p.username,
        p.full_name,
        p.avatar_url
      FROM comments c
      JOIN profiles p ON c.user_id = p.id
      WHERE c.id = ?
    `, [newCommentId]);

    res.status(201).json({ comment: newComment[0] });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
