const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { connectDB } = require("./config/db");

const authRoutes = require("./routes/auth.route");
const userRoutes = require("./routes/user.route");
const messageRoutes = require("./routes/message.route");
const channelRoutes = require('./routes/channel.route')

dotenv.config();

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/channel", channelRoutes)

const server = http.createServer(app);

const PORT = process.env.PORT || 8800;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
