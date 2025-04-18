const { createPool } = require("mysql2");
const { db } = require("../config/db");

const sendDirectMessage = async (req, res) => {
  const { recipentId, content } = req.body;
  const senderId = req.user.id;

  try {
    const [recipent] = await db.query(`SELECT id from users WHERE id = ?`, [
      recipentId,
    ]);

    if (recipent.length === 0) {
      return res.status(404).json({ message: "Recipient not found" });
    }
    //create message
    const [message] = await db.query(
      `INSERT INTO messages WHERE (content, sender_id, recipient_id) VALUES(?, ?, ?)`,
      [content, senderId, recipentId]
    );

    const messageId = message.insertId;

    //attachments if any
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await db.query(
          `INSERT INTO message_attachments (messageId, file_name, file_path, file_type, file_size) VALUES (?, ?, ?, ?, ?)`,
          [
            messageId,
            file.originalname,
            `/uploads/${file.filename}`,
            file.mimetype,
            file.size,
          ]
        );
      }
    }

    //get created message with sender details
    const [messageWithSender] = await db.query(
      `SELECT m.*, u.username, u.avatar FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.id = ?`,
      [messageId]
    );

    //get attachments
    const [attachments] = await db.query(
      `SELECT * FROM message_attachments WHERE message_id = ?`,
      [messageId]
    );

    const messageData = {
      ...messageWithSender[0],
      attachments: attachments,
    };

    res.json(messageData);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Error sending message" });
  }
};

const getDirectMessages = async (req, res) => {
  const currentUserId = req.user.id;
  const otherUserId = req.params.userId;

  try {
    const [messages] = await db.query(
      `SELECT m.*, u.username, u.avatar FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE (m.sender_id = ? AND m.recipient_id = ?)
            OR (m.sender_id = ? AND m.recipient_id = ?)
            ORDER BY m.created_at DESC`,
      [currentUserId, otherUserId, otherUserId, currentUserId]
    );

    //get attachments for each message
    const messagesWithAttachments = await Promise.all(
      messages.map(async (message) => {
        const [attachments] = await db.query(
          `SELECT * FROM message_attachments WHERE message_id = ?`,
          [message.id]
        );
        return {
          ...message,
          attachments,
        };
      })
    );

    //mark message as read
    await db.query(
      `UPDATE messages SET is_read = TRUE WHERE sender_id = ? AND recipient_id = ? AND is_read = FALSE`,
      [otherUserId, currentUserId]
    );
    res.json(messagesWithAttachments);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Error fetching direct messages" });
  }
};

const sendChannelMessage = async (req, res) => {
  const { channelId, content } = req.body;
  const senderId = req.user.id;

  try {
    const [member] = await db.query(
      `SELECT * FROM channel_members WHERE channel_id = ? AND user_id = ? `,
      [channelId, senderId]
    );

    if (member.length === 0) {
      return res
        .status(403)
        .json({ message: "You are not a member of this channel" });
    }

    //create message
    const [message] = await db.query(
      `INSERT INTO messages(content, sender_id, channel_id) VALUES (?, ?, ?)`,
      [content, senderId, channelId]
    );
    const messageId = message.insertId;

    //add attachment if any
    if (req.files && req.files.length > 0) {
      for (const file of req.file) {
        await db.query(
          `INSERT INTO message_attachments(message_id, file_name, file_path, file_type, file_size) VALUES (?, ?, ?, ?)`,
          [
            messageId,
            file.originalname,
            `/uploads/${file.filename}`,
            file.mimetype,
            file.size,
          ]
        );
      }
    }

    //get the created message with sender details
    const [messageWIthSender] = await db.query(
      `SELECT m.*, u.username, u.avatar FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.id = ?`,
      [messageId]
    );

    //get attachment
    const [attachments] = await db.query(
      `SELECT * FROM message_attachments WHERE message_id = ?`,
      [messageId]
    );

    const messageData = {
      ...message[0],
      attachments: attachments,
    };

    res.json(messageData);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getChannelMessages = async (req, res) => {
  const channelId = req.params.channelId;
  const userId = req.user.id;

  try {
    //check if member
    const [member] = await db.query(
      `SELECT * FROM channel_members WHERE channel_id = ? AND user_id = ?`,
      [channelId, userId]
    );

    if (member.length === 0) {
      return res
        .status(403)
        .json({ message: "You are not a member of this channel" });
    }

    const [messages] = await db.query(
      `SELECT m.*, u.username, u.avatar FROM messages m JOIN users u ON m.sender_id = u.id
            WHERE m.channel_id = ?
            ORDER BY m.created_at DESC`,
      [channelId]
    );

    //get attachments
    const messagesWithAttachments = await Promise.all(
      messages.map(async (message) => {
        const [attachments] = await db.query(
          `SELECT * FROM message_attachments WHERE message_id = ?`,
          [message.id]
        );
        return {
          ...message,
          attachments,
        };
      })
    );

    res.json(messagesWithAttachments);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const downloadAttachments = async (req, res) => {
  const attachmentId = req.params.id;
  const userId = req.user.id;

  try {
    const [attachments] = await db.query(
      `SELECT a.*, m.sender_id, m.recipient_id, m.channel_id
        FROM message_attachments a
        JOIN messages m ON a.message_id = m.id
        WHERE a.id = ?`,
      [attachmentId]
    );

    if (attachments.length === 0) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    const attachment = attachments[0];

    //check if user has access to atchment
    if (attachment.channelId) {
      //check if user a member of channel
      const [member] = await db.query(
        `SELECT * FROM channel_members WHERE channel_id = ? AND user_id = ?`,
        [attachment.channelId, userId]
      );

      if (member.length === 0) {
        return res
          .status(403)
          .json({ message: "You are not a member of this channel" });
      }
    } else {
      //check if user is sender or recipient
      if (
        attachment.sender_id !== userId &&
        attachment.recipient_id !== userId
      ) {
        return res.status(403).json({
          message: "You are not authorized to access this attachment",
        });
      }
    }

    //send file
    const filePath = path.join(__dirname, "..", attachment.file_path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    res.download(filePath, attachment.file_name);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Error downloading attachment" });
  }
};

module.exports = {
  sendDirectMessage,
  getDirectMessages,
  sendChannelMessage,
  getChannelMessages,
  downloadAttachments,
};
