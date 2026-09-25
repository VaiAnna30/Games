import Room from '../models/Room.js';
import logger from '../utils/winston.js';

export default function roomHandlers(io, socket) {
  // Join a room via socket
  socket.on('room:join', async ({ roomKey }) => {
    try {
      const room = await Room.findOne({ roomKey, isActive: true })
        .populate('players', 'username email');

      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Check if user is a player in this room
      const isPlayer = room.players.some(p => p._id.toString() === socket.userId);
      if (!isPlayer) {
        socket.emit('error', { message: 'You are not a member of this room' });
        return;
      }

      // Leave previous rooms
      const rooms = Array.from(socket.rooms);
      rooms.forEach(r => {
        if (r !== socket.id) socket.leave(r);
      });

      socket.join(roomKey);
      socket.currentRoom = roomKey;

      logger.info(`SOCKET: ${socket.username} joined room ${roomKey}`);

      // Notify others in room
      socket.to(roomKey).emit('room:player-joined', {
        userId: socket.userId,
        username: socket.username,
      });

      // Send room data back to joining player
      const freshRoom = await Room.findOne({ roomKey, isActive: true })
        .populate('owner', 'username email')
        .populate('players', 'username email');

      socket.emit('room:joined', {
        room: freshRoom,
      });
    } catch (error) {
      logger.error(`Room join error: ${error.message}`);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Leave a room
  socket.on('room:leave', async ({ roomKey }) => {
    try {
      socket.leave(roomKey);
      socket.currentRoom = null;

      // Remove player from room in DB
      await Room.findOneAndUpdate(
        { roomKey },
        { $pull: { players: socket.userId } }
      );

      logger.info(`SOCKET: ${socket.username} left room ${roomKey}`);

      // Notify others
      socket.to(roomKey).emit('room:player-left', {
        userId: socket.userId,
        username: socket.username,
      });
    } catch (error) {
      logger.error(`Room leave error: ${error.message}`);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (socket.currentRoom) {
      socket.to(socket.currentRoom).emit('room:player-left', {
        userId: socket.userId,
        username: socket.username,
      });
      logger.info(`SOCKET: ${socket.username} disconnected from room ${socket.currentRoom}`);
    }
  });
}
