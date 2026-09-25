import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomKey: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  currentGame: {
    type: String,
    enum: ['none', 'tictactoe', 'ludo'],
    default: 'none',
  },
  gameState: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Virtual to check if room is full
roomSchema.virtual('isFull').get(function () {
  return this.players.length >= 2;
});

// Ensure virtuals are serialized
roomSchema.set('toJSON', { virtuals: true });
roomSchema.set('toObject', { virtuals: true });

const Room = mongoose.model('Room', roomSchema);
export default Room;
