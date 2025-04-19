const { db } = require("../config/db");

const createChannel = async (req, res) => {
  const { name, description, isPrivate } = req.body;
  const userId = req.user.id;

  try {
    const [existingChannels] = await db.query(
      `SELECT * FROM channels WHERE name = ?`,
      [name]
    );

    if (existingChannels.length > 0) {
      return res.status(400).json({ message: "Channel already exists" });
    }

    //create channel
    const [channel] = await db.query(
      `INSERT INTO channels (name, description, is_private, created_by) VALUES (?, ?, ?, ?)`,
      [name, description, isPrivate ? 1 : 0, userId]
    );

    const channelId = channel.insertId;

    //add creater as admin
    await db.query(
      `INSERT INTO channel_memebers (channel_id, user_id, role) VALUES (?, ?, ?)`,
      [channelId, userId, "admin"]
    );

    //get the created channel
    const [channels] = await db.query(`SELECT * FROM channels WHERE id = ?`, [
      channelId,
    ]);

    res.json(channels[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Failed to create channel" });
  }
};

const getUserChannels = async (req, res) => {
  const userId = req.user.id;

  try {
    // Get channels the user is a member of
    const [channels] = await db.query(
      `SELECT c.*, cm.role FROM channels c
            JOIN channel_members cm ON c.id = cm.channel_id
            WHERE cm.user_id = ?
            ORDER BY c.created_at DESC`,
      [userId]
    );

    const channelsWithMemberCount = await Promise.all(
      channels.map(async (channel) => {
        const [members] = await db.query(
          `SELECT COUNT(*) as member_count FROM channel_members WHERE channel_id = ?`,
          [channel.id]
        );

        //get unread messages count
        const [unread] = await db.query(
          `SELECT COUNT(*) as unread_count FROM 
                messages WHERE channel_id = ? AND sender_id != ? AND created_at > (
                SELECT IFNULL(last_active, '1970-01-01') FROM users WHERE id = ?
                )`,
          [channel.id, userId, userId]
        );

        return {
          ...channel,
          member_count: members[0].member_count,
          unread_count: unread[0].unread_count,
        };
      })
    );

    res.json(channelsWithMemberCount);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Failed to get user channels" });
  }
};

const getAvailabelChannels = async (req, res) => {
  const userId = req.user.id;

  try {
    // Get public channels the user is not a member of
    const [channels] = await db.query(
      `SELECT c.* 
            FROM channels c
            WHERE c.is_private = 0
            AND c.id NOT IN (
                SELECT channel_id FROM channel_members WHERE user_id = ?
            )
            ORDER BY c.created_at DESC`,
      [userId]
    );

    //get member count for each channel
    const channelsWithMemberCount = await Promise.all(
      channels.map(async (channel) => {
        const [members] = await db.query(
          `SELECT COUNT(*) as member_count FROM channel_members WHERE channel_id = ?`,
          [channel.id]
        );

        return {
          ...channel,
          member_count: members[0].member_count,
        };
      })
    );
    res.json(channelsWithMemberCount);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Failed to get available channels" });
  }
};

const getChannelById = async (req, res) => {
  const channelId = req.params.id;
  const userId = req.user.id;

  try {
    //check if user a member of this channel
    const [membership] = await db.query(
      `SELECT * FROM channel_members WHERE channel_id = ? AND user_id = ?`,
      [channelId, userId]
    );

    if (membership.length === 0) {
      return res
        .status(404)
        .json({ message: "You are not a member of this channel" });
    }

    const [channels] = await db.query(`SELECT * FROM channels WHERE id = ?`, [
      channelId,
    ]);

    if (channels.length === 0) {
      return res.status(404).json({ message: "Channel not found" });
    }

    //get members
    const [members] = await db.query(
      `SELECT cm.role, u.id, u.username, u.avatar, u.status
        FROM channel_members cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.channel_id = ?`,
      [channelId]
    );

    const channel = {
      ...channels[0],
      members,
    };
    res.json(channel);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Failed to get channel" });
  }
};

const updateChannel = async (req, res) => {
  const channelId = req.params.id;
  const { name, description, isPrivate } = req.body;
  const userId = req.user.id;

  try {
    const [channels] = await db.query(`SELECT * FROM channels WHERE id = ?`, [
      channelId,
    ]);

    if (channels.length === 0) {
      return res.status(404).json({ message: "Channel not found" });
    }

    //check if user admin of channel
    const [membership] = await db.query(
      `SELECT * FROM channel_members WHERE channel_id = ? and user_id = ? AND role = ?`,
      [channelId, userId, "admin"]
    );

    if (membership.length === 0) {
      return res
        .status(403)
        .json({ message: "You are not admin of this channel" });
    }

    //check if new name already exists
    if (name) {
      const [existingChannels] = await db.query(
        `SELECT * FROM channels WHERE name = ? AND id != ?`,
        [name, channelId]
      );

      if (existingChannels.length > 0) {
        return res.status(400).json({ message: "Channel name already exists" });
      }
    }

    const updateFields = [];
    const queryParams = [];

    if (name) {
      updateFields.push("name = ?");
      queryParams.push(name);
    }
    if (description !== undefined) {
      updateFields.push("description = ?");
      queryParams.push(description);
    }
    if (isPrivate !== undefined) {
      updateFields.push("is_private = ?");
      queryParams.push(isPrivate ? 1 : 0);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }
    queryParams.push(channelId);

    await db.query(
      `UPDATE channels SET ${updateFields.join(", ")} WHERE id = ?`,
      queryParams
    );

    const [updatedChannels] = await db.query(
      `SELECT * FROM channels where id = ?`,
      [channelId]
    );
    return res.json(updatedChannels[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const addMember = async (req, res) => {
  const channelId = req.params.id;
  const { userId, role } = req.body;
  const currentUserId = req.user.id;

  try {
    const [channels] = await db.query(`SELECT * FROM channels WHERE id = ?`, [
      channelId,
    ]);
    if (channels.length === 0) {
      return res.status(404).json({ message: "Channel not found" });
    }

    const [membership] = await db.query(
      `SELECT * FROM channel_members WHERE channel_id = ? AND user_id = ? AND role = ?`,
      [channelId, currentUserId, "admin"]
    );

    if (membership.length === 0) {
      return res
        .status(400)
        .json({ message: "You are not a admin of this channel" });
    }

    const [user] = await db.query(`SELECT * FROM users WHERE id = ?`, [userId]);

    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    //check if user already a member
    const [existingMembership] = await db.query(
      `SELECT * FROM channel_members WHERE channel_id = ? AND user_id = ? `,
      [channelId, userId]
    );

    if (existingMembership.length > 0) {
      return res.status(400).json({ message: "User is already a member" });
    }

    //add him
    await db.query(
      `INSERT INTO channel_members (channel_id, user_id, role) VALUES (?, ?, ?)`,
      [channelId, userId, role || "member"]
    );

    res.json({ msg: "Member added" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const removeMember = async (req, res) => {
  const channelId = req.params.id;
  const memberIdToRemove = req.params.userId;
  const currentUserId = req.user.id;

  try {
    // Check if channel exists
    const [channels] = await db.query("SELECT * FROM channels WHERE id = ?", [
      channelId,
    ]);

    if (channels.length === 0) {
      return res.status(404).json({ msg: "Channel not found" });
    }

    //check if current user is admin or removing himself
    if (currentUserId !== parseInt(memberIdToRemove)) {
      const [membership] = await db.query(
        `SELECT * FROM channel_members WHERE channel_id = ? AND user_id = ? AND role = ?`,
        [channelId, currentUserId, "admin"]
      );

      if (membership.length === 0) {
        return res
          .status(403)
          .json({ msg: "You are not authorized to remove this user" });
      }
    }

    //check if member
    const [memberToRemove] = await db.query(
      `SELECT * FROM channel_members WHERE channel_id = ? AND user_id = ?`,
      [channelId, memberIdToRemove]
    );

    if (memberIdToRemove.length === 0) {
      return res.status(404).json({ msg: "Member not found" });
    }

    await db.query(
      `DELETE FROM channel_members WHERE channel_id = ? AND user_id = ?`,
      [channelId, memberIdToRemove]
    );
    res.json({ msg: "Member removed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteChannel = async (req, res) => {
  const channelId = req.params.id;
  const userId = req.user.id;

  try {
    // Check if channel exists
    const [channels] = await db.query("SELECT * FROM channels WHERE id = ?", [
      channelId,
    ]);

    if (channels.length === 0) {
      return res.status(404).json({ msg: "Channel not found" });
    }

    // Check if user is admin of the channel
    const [membership] = await db.query(
      "SELECT * FROM channel_members WHERE channel_id = ? AND user_id = ? AND role = ?",
      [channelId, userId, "admin"]
    );

    if (membership.length === 0) {
      return res
        .status(403)
        .json({ msg: "You must be an admin to delete this channel" });
    }

    // Delete channel
    await db.query("DELETE FROM channels WHERE id = ?", [channelId]);

    res.json({ msg: "Channel deleted" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

module.exports = {
  createChannel,
  getUserChannels,
  getAvailabelChannels,
  getChannelById,
  updateChannel,
  addMember,
  removeMember,
  deleteChannel,
};
