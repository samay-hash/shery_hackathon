const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const deployRoutes = require('./routes/deployRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const githubRoutes = require('./routes/githubRoutes');
const { setupSocket } = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible in routes
app.set('io', io);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/deployments', deployRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/github', githubRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Setup WebSocket
setupSocket(io);

// Connect to MongoDB & Start server
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/deployx';

const { proxyServer } = require('./proxy');

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(PORT, () => {
      console.log(`🚀 DeployX API Backend running on http://localhost:${PORT}`);
    });
    proxyServer.listen(8000, () => {
      console.log(`🌐 DeployX Reverse Proxy running on port 8000 (Subdomain router)`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    server.listen(PORT, () => {
      console.log(`🚀 DeployX API Backend running on http://localhost:${PORT} (No DB)`);
    });
  });

module.exports = { app, server, io };
