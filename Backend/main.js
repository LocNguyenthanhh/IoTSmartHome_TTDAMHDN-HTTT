const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// ==================== SOCKET.IO SETUP ====================
const io = new Server(server, {
  cors: {
    origin: [
      'http://127.0.0.1:5000',
      'http://localhost:5000',
      'http://localhost:5173',
      'http://localhost:3000',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  },
});

// Make io globally available
global.io = io;

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: [
    'http://127.0.0.1:5000',
    'http://localhost:5000',
    'http://localhost:5173',
    'http://localhost:3000',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// ==================== DATABASE CONNECTION ====================
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    console.log(`📊 Database: ${mongoose.connection.name}`);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// Monitor MongoDB connection
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// ==================== IMPORT ROUTES ====================
const feedRoutes = require('./routes/feedRoute');
const deviceRoute = require('./routes/DeviceRoute');
const dialogRoute = require('./routes/DialogRoute');
const homeRoute = require('./routes/HomeRoute');
const roomRoute = require('./routes/RoomRoute');
const userRoute = require('./routes/UserRoute');
const analyticsRoute = require('./routes/AnalyticsRoute');
const authRoute = require('./routes/AuthRoute');
// ==================== ROOT ROUTE ====================
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'IoT Smart Home API Server - Nhóm HTTT',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      devices: '/api/devices',
      dialogs: '/api/dialogs',
      feed: '/api/feed',
      homes: '/api/homes',
      rooms: '/api/rooms',
      users: '/api/users',
    }
  });
});

// ==================== API ROUTES ====================
app.use('/api/feed', feedRoutes);
app.use('/api/devices', deviceRoute);
app.use('/api/dialogs', dialogRoute);
app.use('/api/homes', homeRoute);
app.use('/api/rooms', roomRoute);
app.use('/api/users', userRoute);
app.use('/api/auth', authRoute);
app.use('/api/analytics', analyticsRoute);

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// ==================== 404 HANDLER ====================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong!',
  });
});

// ==================== SOCKET.IO EVENTS ====================
io.on('connection', (socket) => {
  console.log('✅ Client connected via Socket.IO:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });

  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`👤 Client ${socket.id} joined room: ${room}`);
  });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 IoT Smart Home Server Started');
  console.log('='.repeat(60));
  console.log(`🌐 Server:     http://localhost:${PORT}`);
  console.log(`📡 API:        http://localhost:${PORT}/api`);
  console.log(`🔌 Socket.IO:  ws://localhost:${PORT}`);
  console.log(`💚 Health:     http://localhost:${PORT}/health`);
  console.log('='.repeat(60) + '\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM received, closing server...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = { app, server, io };