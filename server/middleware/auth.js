const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify user still exists and is active
    const [users] = await pool.execute(
      'SELECT id, email, is_admin, is_active, deleted_at FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid token - user not found' });
    }

    const user = users[0];
    if (!user.is_active || user.deleted_at) {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    req.user = { id: decoded.userId, email: user.email, isAdmin: !!user.is_admin };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

module.exports = { authenticateToken };
