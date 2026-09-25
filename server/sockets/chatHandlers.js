import Message from '../models/Message.js';
import logger from '../utils/winston.js';

export default function chatHandlers(io, socket) {
  // Send a chat message
  socket.on('chat:message', async ({ roomKey, text }) => {
    try {
      if (!socket.userId || !text?.trim()) return;

      const Room = (await import('../models/Room.js')).default;
      const room = await Room.findOne({ roomKey, isActive: true });
      if (!room) return;

      const message = await Message.create({
        roomId: room._id,
        sender: socket.userId,
        senderName: socket.username,
        text: text.trim(),
      });

      io.to(roomKey).emit('chat:new-message', {
        _id: message._id,
        roomId: message.roomId,
        sender: message.sender,
        senderName: message.senderName,
        text: message.text,
        createdAt: message.createdAt,
      });
    } catch (error) {
      logger.error(`Chat message error: ${error.message}`);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
}
