const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { db } = require("../config/db");
const { validationResult } = require("express-validator");

const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  const { username, email, password } = req.body;

  try {
    const [users] = await db.query(
      `SELECT * from users WHERE email = ? OR username = ?`,
      [email, username]
    );

    if (users.length > 0) {
      return res
        .status(400)
        .json({ message: "Username or email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [user] = await db.query(
      `INSERT INTO users (username, email, password, status) VALUES (?, ?, ?, ?)`,
      [username, email, hashedPassword, "online"]
    );

    const userId = user.insertId;

    const jwtToken = {
      user: {
        id: userId,
      },
    };

    jwt.sign(
      jwtToken,
      process.env.SECRET_KEY,
      { expiresIn: process.env.JWT_EXPIRE },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const [users] = await db.query(`SELECT * FROM users WHERE email = ?`, [
      email,
    ]);

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    await db.query(`UPDATE users SET status = ? WHERE id = ?`, [
      "online",
      user.id,
    ]);

    const jwtToken = {
      user: {
        id: user.id,
      },
    };

    jwt.sign(
      jwtToken,
      process.env.SECRET_KEY,
      { expiresIn: process.env.JWT_EXPIRE },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
};

const getUser = async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT id, username, email, avatar, bio, status, created_at FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(users[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
};

const logout = async (req, res) => {
  try {
    await db.query(`UPDATE users SET status = ? WHERE id = ?`, [
      "offline",
      req.user.id,
    ]);
    res.json({ message: "Logged out successfully" });
  } catch {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  register,
  login,
  getUser,
  logout,
};
