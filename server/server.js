import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import initSocket from './sockets/index.js';
import logger from './utils/winston.js';

// Controllers
import { register, login, getMe } from './controllers/authController.js';
import { createRoom, joinRoom, getRoom, deleteRoom, getMyRooms } from './controllers/roomController.js';
import { getMessages } from './controllers/messageController.js';
import auth from './middleware/auth.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;
  logger.info(`${req.method} ${req.path} | IP: ${ip}`);
  next();
});

// === AUTH ROUTES ===
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.get('/api/auth/me', auth, getMe);

// === ROOM ROUTES ===
app.post('/api/rooms/create', auth, createRoom);
app.post('/api/rooms/join', auth, joinRoom);
app.get('/api/rooms/user/my-rooms', auth, getMyRooms);
app.get('/api/rooms/:roomKey', auth, getRoom);
app.delete('/api/rooms/:roomKey', auth, deleteRoom);

// === MESSAGE ROUTES ===
app.get('/api/messages/:roomId', auth, getMessages);

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
  });
} else {
  // Health check in dev
  app.get('/', (req, res) => res.send('API Running'));
}

// Connect to MongoDB & start server
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  // Initialize Socket.io
  initSocket(io);

  httpServer.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    console.log(`🎮 SyncArena server running at http://localhost:${PORT}`);
  });
});
