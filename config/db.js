require("dotenv").config();
const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const connectDB = async () => {
  try {
    const connection = await db.getConnection();
    console.log("Database connected successfully");
    connection.release();
  } catch (error) {
    console.log("Database connection failed: ", error);
    process.exit(1);
  }
};

module.exports = {
  db,
  connectDB,
};

// PORT=5000
// NODE_ENV=development

// JWT_SECRET=lksajflkdjflkjalkdsjflkajsdjfewjoalksdajfkiugreiugiakfjnvmcnviughksj
// JWT_EXPIRE=30d

// DB_HOST=localhost
// DB_USER=root
// DB_PASSWORD=797616
// DB_NAME=chatapp
// DB_PORT=3306

// UPLOAD_PATH=./uploads
