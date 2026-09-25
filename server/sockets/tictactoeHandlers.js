import Room from '../models/Room.js';
import logger from '../utils/winston.js';

// Initial game state
const createTTTState = () => ({
  board: Array(9).fill(null),
  currentTurn: null, // will be set to first player's ID
  players: {}, // { [userId]: 'X' | 'O' }
  winner: null,
  winLine: null,
  isDraw: false,
  isOver: false,
});

// Check win
const checkWinner = (board) => {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6],             // diags
  ];

  for (const line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], winLine: line };
    }
  }

  if (board.every(cell => cell !== null)) {
    return { winner: null, winLine: null, isDraw: true };
  }

  return null;
};

export default function tictactoeHandlers(io, socket) {
  // Game selection
  socket.on('game:select', async ({ roomKey, game }) => {
    try {
      const room = await Room.findOne({ roomKey, isActive: true })
        .populate('players', 'username');

      if (!room) return;

      // Only owner can select game
      if (room.owner.toString() !== socket.userId) {
        socket.emit('error', { message: 'Only the room owner can select a game' });
        return;
      }

      if (game === 'tictactoe') {
        const state = createTTTState();

        // Assign X and O
        if (room.players.length >= 1) {
          state.players[room.players[0]._id.toString()] = 'X';
          state.currentTurn = room.players[0]._id.toString();
        }
        if (room.players.length >= 2) {
          state.players[room.players[1]._id.toString()] = 'O';
        }

        room.currentGame = 'tictactoe';
        room.gameState = state;
        await room.save();

        io.to(roomKey).emit('game:selected', { game: 'tictactoe' });
        io.to(roomKey).emit('game:state', { gameState: state });
      } else {
        // For ludo, handled in ludoHandlers
        room.currentGame = game;
        await room.save();
        io.to(roomKey).emit('game:selected', { game });
      }

      logger.info(`Game selected in room ${roomKey}: ${game}`);
    } catch (error) {
      logger.error(`Game select error: ${error.message}`);
      socket.emit('error', { message: 'Failed to select game' });
    }
  });

  // Tic-Tac-Toe move
  socket.on('game:move', async ({ roomKey, move }) => {
    try {
      const room = await Room.findOne({ roomKey, isActive: true });
      if (!room || room.currentGame !== 'tictactoe') return;

      const state = room.gameState;
      if (!state || state.isOver) return;

      const { index } = move;

      // Validate turn
      if (state.currentTurn !== socket.userId) {
        socket.emit('error', { message: 'Not your turn' });
        socket.emit('game:state', { gameState: state }); // rollback
        return;
      }

      // Validate move
      if (index < 0 || index > 8 || state.board[index] !== null) {
        socket.emit('error', { message: 'Invalid move' });
        socket.emit('game:state', { gameState: state }); // rollback
        return;
      }

      // Apply move
      const symbol = state.players[socket.userId];
      state.board[index] = symbol;

      // Check result
      const result = checkWinner(state.board);
      if (result) {
        if (result.isDraw) {
          state.isDraw = true;
          state.isOver = true;
        } else {
          state.winner = symbol;
          state.winLine = result.winLine;
          state.isOver = true;
        }
      } else {
        // Switch turns
        const playerIds = Object.keys(state.players);
        state.currentTurn = playerIds.find(id => id !== socket.userId);
      }

      room.gameState = state;
      room.markModified('gameState');
      await room.save();

      io.to(roomKey).emit('game:state', { gameState: state });

      if (state.isOver) {
        io.to(roomKey).emit('game:over', {
          winner: state.winner,
          winLine: state.winLine,
          isDraw: state.isDraw,
        });
      }
    } catch (error) {
      logger.error(`TTT move error: ${error.message}`);
      socket.emit('error', { message: 'Move failed, please retry' });
    }
  });

  // Reset game
  socket.on('game:reset', async ({ roomKey }) => {
    try {
      const room = await Room.findOne({ roomKey, isActive: true })
        .populate('players', 'username');
      if (!room) return;

      const state = createTTTState();
      if (room.players.length >= 1) {
        state.players[room.players[0]._id.toString()] = 'X';
        state.currentTurn = room.players[0]._id.toString();
      }
      if (room.players.length >= 2) {
        state.players[room.players[1]._id.toString()] = 'O';
      }

      room.gameState = state;
      room.markModified('gameState');
      await room.save();

      io.to(roomKey).emit('game:state', { gameState: state });
      logger.info(`Game reset in room ${roomKey}`);
    } catch (error) {
      logger.error(`Game reset error: ${error.message}`);
    }
  });

  // Back to lobby
  socket.on('game:back-to-lobby', async ({ roomKey }) => {
    try {
      const room = await Room.findOne({ roomKey, isActive: true });
      if (!room) return;

      if (room.owner.toString() !== socket.userId) {
        socket.emit('error', { message: 'Only the owner can return to lobby' });
        return;
      }

      room.currentGame = 'none';
      room.gameState = null;
      await room.save();

      io.to(roomKey).emit('game:selected', { game: 'none' });
      io.to(roomKey).emit('game:state', { gameState: null });
    } catch (error) {
      logger.error(`Back to lobby error: ${error.message}`);
    }
  });
}
