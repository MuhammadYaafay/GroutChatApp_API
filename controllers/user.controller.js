const { db } = require("../config/db");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

const getUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT id, username, email, avatar, status, last_active FROM users WHERE id != ?`,
      [req.user.id]
    );
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching users" });
  }
};

const getUserById = async (req, res) => {
  try {
    const [user] = await db.query(
      `SELECT id, username, email, avatar, bio, status, last_active, created_at FROM users WHERE id = ?`,
      [req.params.id]
    );
    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching user" });
  }
};

const updateProfile = async (req, res) => {
  const { username, bio } = req.body;
  try {
    if (username) {
      const [existingUsers] = await db.query(
        `SELECT id FROM users WHERE username = ? AND id != ?`,
        [username, req.user.id]
      );
      if (existingUsers.length > 0) {
        return res.status(400).json({ message: "Username already exists" });
      }
    }
    const updateFields = [];
    const queryParams = [];

    if (username) {
      updateFields.push("username = ?");
      queryParams.push(username);
    }

    if (bio !== undefined) {
      updateFields.push("bio = ?");
      queryParams.push(bio);
    }
    //add avatar path if file was uploaded
    if (req.file) {
      //delete old avatar if exists
      const [currentUser] = await db.query(
        `SELECT avatar FROM users WHERE id = ?`,
        [req.user.id]
      );
      if (currentUser[0].avatar) {
        const oldAvatarPath = path.join(__dirname, "..", currentUser[0].avatar);

        //check if file exists
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }

      updateFields.push("avatar = ?");
      queryParams.push(`/uploads/${req.file.filename}`);
    }

    //return if no fields were updated
    if (updateFields.length === 0) {
      return res.status(200).json({ message: "No fields were updated" });
    }

    //add user ID to query params
    queryParams.push(req.user.id);

    //update user profile
    await db.query(
      `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`,
      queryParams
    );

    //get updated users
    const [updatedUser] = await db.query(
      `SELECT id, username, email, avatar, bio, status FROM users WHERE id = ?`,
      [req.user.id]
    );
    res.status(200).json(updatedUser[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update user profile" });
  }
};

const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const [users] = await db.query(`SELECT password FROM users WHERE id = ?`, [
      req.user.id,
    ]);

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, users[0].password);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db.query(`UPDATE users SET password = ? WHERE id = ?`, [
      hashedPassword,
      req.user.id,
    ]);
    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Failed to update password" });
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateProfile,
  updatePassword,
};
