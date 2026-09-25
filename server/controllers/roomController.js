import Room from '../models/Room.js';
import crypto from 'crypto';

// Generate unique room key (6-char alphanumeric)
const generateRoomKey = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
};

// @route   POST /api/rooms/create
export const createRoom = async (req, res) => {
  try {
    let roomKey = generateRoomKey();

    // Ensure uniqueness
    while (await Room.findOne({ roomKey })) {
      roomKey = generateRoomKey();
    }

    const room = await Room.create({
      roomKey,
      owner: req.user._id,
      players: [req.user._id],
    });

    const populated = await Room.findById(room._id)
      .populate('owner', 'username email')
      .populate('players', 'username email');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create room' });
  }
};

// @route   POST /api/rooms/join
export const joinRoom = async (req, res) => {
  try {
    const { roomKey } = req.body;

    const room = await Room.findOne({ roomKey: roomKey.toUpperCase(), isActive: true });
    if (!room) {
      return res.status(404).json({ message: 'Room not found or inactive' });
    }

    // Check if already in room
    const alreadyIn = room.players.some(p => p.toString() === req.user._id.toString());
    if (alreadyIn) {
      const populated = await Room.findById(room._id)
        .populate('owner', 'username email')
        .populate('players', 'username email');
      return res.json(populated);
    }

    // Check capacity
    if (room.players.length >= 2) {
      return res.status(400).json({ message: 'Room is full (max 2 players)' });
    }

    room.players.push(req.user._id);
    await room.save();

    const populated = await Room.findById(room._id)
      .populate('owner', 'username email')
      .populate('players', 'username email');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to join room' });
  }
};

// @route   GET /api/rooms/:roomKey
export const getRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomKey: req.params.roomKey.toUpperCase(), isActive: true })
      .populate('owner', 'username email')
      .populate('players', 'username email');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get room' });
  }
};

// @route   DELETE /api/rooms/:roomKey
export const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomKey: req.params.roomKey.toUpperCase() });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Only owner can delete
    if (room.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the room owner can delete this room' });
    }

    room.isActive = false;
    await room.save();

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete room' });
  }
};

// @route   GET /api/rooms/user/my-rooms
export const getMyRooms = async (req, res) => {
  try {
    const rooms = await Room.find({
      owner: req.user._id,
      isActive: true,
    })
      .populate('owner', 'username email')
      .populate('players', 'username email')
      .sort('-createdAt');

    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get rooms' });
  }
};
