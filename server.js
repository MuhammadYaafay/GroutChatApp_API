const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { connectDB } = require("./config/db");

const authRoutes = require("./routes/auth.route");

dotenv.config();

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);

const server = http.createServer(app);

const PORT = process.env.PORT || 8800;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
