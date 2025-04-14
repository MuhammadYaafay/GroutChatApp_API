const jwt = require("jsonwebtoken");
const { db } = require("../config/db");

module.exports = async (req, res, next) => {
  const token = req.header("x-auth-token");

  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded.user;

    await db.query("UPDATE users SET status = ? WHERE id = ?", [
      "online",
      req.user.id,
    ]);
    next();
  } catch (err) {
    res.status(401).json({ msg: "Token is not valid" });
  }
};
