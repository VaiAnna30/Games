import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import logger from '../utils/winston.js';
import roomHandlers from './roomHandlers.js';
import chatHandlers from './chatHandlers.js';
import tictactoeHandlers from './tictactoeHandlers.js';
import ludoHandlers from './ludoHandlers.js';

export default function initSocket(io) {
  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.username = user.username;
      socket.currentRoom = null;

      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`SOCKET CONNECTED: ${socket.username} (${socket.id})`);

    // Register all handlers
    roomHandlers(io, socket);
    chatHandlers(io, socket);
    tictactoeHandlers(io, socket);
    ludoHandlers(io, socket);

    socket.on('disconnect', () => {
      logger.info(`SOCKET DISCONNECTED: ${socket.username} (${socket.id})`);
    });
  });
}
