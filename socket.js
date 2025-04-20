
const { db } = require('./config/db');

module.exports = (io) => {
  // Store active user connections
  const connectedUsers = {};

  io.on('connection', (socket) => {
    console.log('New client connected');

    // Handle user authentication
    socket.on('authenticate', async ({ userId }) => {
      try {
        // Associate socket ID with user ID
        connectedUsers[userId] = socket.id;
        socket.userId = userId;

        // Update user status to online
        await db.query(
          'UPDATE users SET status = ?, last_active = CURRENT_TIMESTAMP WHERE id = ?',
          ['online', userId]
        );

        console.log(`User ${userId} authenticated`);

        // Get user's channels
        const [channels] = await db.query(
          'SELECT channel_id FROM channel_members WHERE user_id = ?',
          [userId]
        );

        // Join all the user's channel rooms
        channels.forEach((channel) => {
          socket.join(`channel:${channel.channel_id}`);
        });

        // Notify other users that this user is online
        io.emit('user_status_change', { userId, status: 'online' });

      } catch (error) {
        console.error('Authentication error:', error);
      }
    });

    // Handle direct messages
    socket.on('direct_message', async (message) => {
      try {
        const { recipientId, messageData } = message;
        const senderId = socket.userId;
        
        if (!senderId) {
          return socket.emit('error', { message: 'You are not authenticated' });
        }

        // Save message to database
        const [result] = await db.query(
          'INSERT INTO messages (content, sender_id, recipient_id) VALUES (?, ?, ?)',
          [messageData.content, senderId, recipientId]
        );

        const messageId = result.insertId;

        // If there are attachments, they would be handled separately

        // Get the created message with sender details
        const [dbMessage] = await db.query(
          `SELECT m.*, u.username, u.avatar 
           FROM messages m 
           JOIN users u ON m.sender_id = u.id 
           WHERE m.id = ?`,
          [messageId]
        );

        const fullMessage = dbMessage[0];

        // Send to recipient if online
        const recipientSocketId = connectedUsers[recipientId];
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('direct_message', fullMessage);
        }

        // Send back to sender with confirmation
        socket.emit('message_sent', fullMessage);
        
      } catch (error) {
        console.error('Direct message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle channel messages
    socket.on('channel_message', async (message) => {
      try {
        const { channelId, messageData } = message;
        const senderId = socket.userId;
        
        if (!senderId) {
          return socket.emit('error', { message: 'You are not authenticated' });
        }

        // Check if user is a member of the channel
        const [membership] = await db.query(
          'SELECT * FROM channel_members WHERE channel_id = ? AND user_id = ?',
          [channelId, senderId]
        );

        if (membership.length === 0) {
          return socket.emit('error', { message: 'You are not a member of this channel' });
        }

        // Save message to database
        const [result] = await db.query(
          'INSERT INTO messages (content, sender_id, channel_id) VALUES (?, ?, ?)',
          [messageData.content, senderId, channelId]
        );

        const messageId = result.insertId;

        // If there are attachments, they would be handled separately

        // Get the created message with sender details
        const [dbMessage] = await db.query(
          `SELECT m.*, u.username, u.avatar 
           FROM messages m 
           JOIN users u ON m.sender_id = u.id 
           WHERE m.id = ?`,
          [messageId]
        );

        const fullMessage = dbMessage[0];

        // Broadcast to all users in the channel
        io.to(`channel:${channelId}`).emit('channel_message', fullMessage);
        
      } catch (error) {
        console.error('Channel message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing', ({ recipientId, isTyping, channelId }) => {
      if (!socket.userId) return;
      
      if (channelId) {
        // Channel typing indicator
        socket.to(`channel:${channelId}`).emit('typing', {
          userId: socket.userId,
          isTyping,
          channelId
        });
      } else if (recipientId) {
        // Direct message typing indicator
        const recipientSocketId = connectedUsers[recipientId];
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('typing', {
            userId: socket.userId,
            isTyping,
            channelId: null
          });
        }
      }
    });

    // Handle read receipts
    socket.on('message_read', async ({ messageId, senderId }) => {
      try {
        if (!socket.userId) return;
        
        // Update message as read
        await db.query(
          'UPDATE messages SET is_read = TRUE WHERE id = ?',
          [messageId]
        );

        // Notify sender if online
        const senderSocketId = connectedUsers[senderId];
        if (senderSocketId) {
          io.to(senderSocketId).emit('message_read', {
            messageId,
            readBy: socket.userId
          });
        }
      } catch (error) {
        console.error('Message read error:', error);
      }
    });

    // Handle joining a channel
    socket.on('join_channel', async ({ channelId }) => {
      try {
        if (!socket.userId) return;
        
        // Check if user is a member of the channel
        const [membership] = await db.query(
          'SELECT * FROM channel_members WHERE channel_id = ? AND user_id = ?',
          [channelId, socket.userId]
        );

        if (membership.length === 0) {
          return socket.emit('error', { message: 'You are not a member of this channel' });
        }

        socket.join(`channel:${channelId}`);
        socket.emit('channel_joined', { channelId });
      } catch (error) {
        console.error('Join channel error:', error);
      }
    });

    // Handle leaving a channel
    socket.on('leave_channel', ({ channelId }) => {
      socket.leave(`channel:${channelId}`);
      socket.emit('channel_left', { channelId });
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      if (socket.userId) {
        try {
          // Update user status to offline
          await db.query(
            'UPDATE users SET status = ?, last_active = CURRENT_TIMESTAMP WHERE id = ?',
            ['offline', socket.userId]
          );

          // Remove user from connected users
          delete connectedUsers[socket.userId];

          // Notify other users
          io.emit('user_status_change', { userId: socket.userId, status: 'offline' });
        } catch (error) {
          console.error('Disconnect error:', error);
        }
      }
      
      console.log('Client disconnected');
    });
  });
};
