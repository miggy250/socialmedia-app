const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'],
      credentials: true
    }
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Verify user exists
      const [users] = await pool.execute(
        'SELECT id, email, is_admin, is_active FROM users WHERE id = ?',
        [decoded.userId]
      );

      if (users.length === 0 || !users[0].is_active) {
        return next(new Error('User not found or inactive'));
      }

      socket.userId = decoded.userId;
      socket.userEmail = users[0].email;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join user's personal room for notifications
    socket.join(`user:${socket.userId}`);

    // Join a conversation room
    socket.on('join-conversation', (otherUserId) => {
      const roomId = [socket.userId, otherUserId].sort().join('-');
      socket.join(`conversation:${roomId}`);
      console.log(`User ${socket.userId} joined conversation with ${otherUserId}`);
    });

    // Leave a conversation room
    socket.on('leave-conversation', (otherUserId) => {
      const roomId = [socket.userId, otherUserId].sort().join('-');
      socket.leave(`conversation:${roomId}`);
    });

    // Send message
    socket.on('send-message', async (data) => {
      try {
        const { receiverId, content } = data;
        
        // Save to database
        const [result] = await pool.execute(
          'INSERT INTO messages (sender_id, receiver_id, content, is_read) VALUES (?, ?, ?, 0)',
          [socket.userId, receiverId, content]
        );

        const messageId = result.insertId;

        // Get the complete message
        const [messages] = await pool.execute(
          'SELECT * FROM messages WHERE id = ?',
          [messageId]
        );

        const message = messages[0];
        const roomId = [socket.userId, receiverId].sort().join('-');

        // Emit to conversation room
        io.to(`conversation:${roomId}`).emit('new-message', message);
        
        // Also emit to receiver's personal room for notifications
        io.to(`user:${receiverId}`).emit('message-notification', {
          senderId: socket.userId,
          message
        });

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing-start', (receiverId) => {
      const roomId = [socket.userId, receiverId].sort().join('-');
      socket.to(`conversation:${roomId}`).emit('user-typing', {
        userId: socket.userId,
        typing: true
      });
    });

    socket.on('typing-stop', (receiverId) => {
      const roomId = [socket.userId, receiverId].sort().join('-');
      socket.to(`conversation:${roomId}`).emit('user-typing', {
        userId: socket.userId,
        typing: false
      });
    });

    // Mark messages as read
    socket.on('mark-read', async (data) => {
      try {
        const { senderId } = data;
        
        await pool.execute(
          'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
          [senderId, socket.userId]
        );

        const roomId = [socket.userId, senderId].sort().join('-');
        
        // Notify sender that messages were read
        io.to(`conversation:${roomId}`).emit('messages-read', {
          readerId: socket.userId,
          senderId
        });

      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    // User online status
    socket.on('user-online', () => {
      socket.broadcast.emit('user-status', {
        userId: socket.userId,
        online: true
      });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      socket.broadcast.emit('user-status', {
        userId: socket.userId,
        online: false
      });
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { initializeSocket, getIO };
