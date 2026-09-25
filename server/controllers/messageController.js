import Message from '../models/Message.js';

// @route   GET /api/messages/:roomId
export const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ roomId: req.params.roomId })
      .sort('createdAt')
      .limit(200);

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
};
