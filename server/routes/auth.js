const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('username').isLength({ min: 3, max: 50 }).matches(/^[a-zA-Z0-9_]+$/),
  body('fullName').optional().isLength({ max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, username, fullName } = req.body;

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ? OR EXISTS(SELECT 1 FROM profiles WHERE username = ?)',
      [email, username]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User with this email or username already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user and profile in transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insert user
      const [userResult] = await connection.execute(
        'INSERT INTO users (id, email, password_hash) VALUES (UUID(), ?, ?)',
        [email, passwordHash]
      );

      // Get the created user ID
      const [newUser] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );
      const userId = newUser[0].id;

      // Insert profile
      await connection.execute(
        'INSERT INTO profiles (id, username, full_name) VALUES (?, ?, ?)',
        [userId, username, fullName || '']
      );

      await connection.commit();
      connection.release();

      const token = generateToken(userId);

      // Fetch is_admin flag
      const [adminFlagRows] = await pool.execute(
        'SELECT is_admin FROM users WHERE id = ?',
        [userId]
      );
      const isAdmin = !!(adminFlagRows[0]?.is_admin);

      res.status(201).json({
        message: 'User created successfully',
        token,
        user: { id: userId, email, username, fullName, isAdmin }
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Get user with profile
    const [users] = await pool.execute(`
      SELECT u.id, u.email, u.password_hash, u.is_admin, p.username, p.full_name 
      FROM users u 
      JOIN profiles p ON u.id = p.id 
      WHERE u.email = ?
    `, [email]);

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        isAdmin: !!user.is_admin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(`
      SELECT u.id, u.email, u.is_admin, p.username, p.full_name, p.avatar_url, p.bio, p.location
      FROM users u 
      JOIN profiles p ON u.id = p.id 
      WHERE u.id = ?
    `, [req.user.id]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const u = users[0];
    res.json({ user: { ...u, isAdmin: !!u.is_admin } });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout (client-side token removal, but we can blacklist tokens if needed)
router.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
