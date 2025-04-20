const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { connectDB } = require('./config/db');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Connect to database
connectDB();

// Middleware
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:8080',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8080',
      'http://192.168.170.63:8080',
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // Allow any local network IP
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,  // Allow any local network IP
      /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/ // Allow any local network IP
    ];

    // Check if the origin is allowed
    if (allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return allowedOrigin === origin;
    })) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  exposedHeaders: ['x-auth-token'],
  credentials: true
};

// Apply CORS middleware
app.use(cors(corsOptions));
app.use(express.json());

// Set up static files directory for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth.route'));
app.use('/api/users', require('./routes/user.route'));
app.use('/api/messages', require('./routes/message.route'));
app.use('/api/channels', require('./routes/channel.route'));
app.use('/api/upload', require('./routes/upload.route'));


// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketio(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? 'https://your-production-domain.com' 
      : ['http://localhost:5173', 'http://localhost:8080'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.IO connection handler
require('./socket')(io);

// Define the port
const PORT = process.env.PORT || 5000;

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
