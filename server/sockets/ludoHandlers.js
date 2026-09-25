import Room from '../models/Room.js';
import logger from '../utils/winston.js';

/*
  2-Player Ludo:
  - Player 1 (Red): Top-Left base, path starts at index 0
  - Player 2 (Blue): Bottom-Right base, path starts at index 26

  Board is a 52-tile circular path. Each player has 4 pieces.
  Safe zones: 0, 8, 13, 21, 26, 34, 39, 47 (star tiles)
  
  Each player has a home stretch of 6 tiles before finishing.
  A piece must travel the full loop + 6 home tiles = 57 steps total.
*/

const SAFE_ZONES = [0, 8, 13, 21, 26, 34, 39, 47];
const TOTAL_PATH = 52;
const HOME_STRETCH = 6;
const TOTAL_STEPS = TOTAL_PATH + HOME_STRETCH; // 58 steps to finish

const PLAYER_CONFIG = {
  red: { startPos: 0, entryIndex: 0, color: 'red' },
  blue: { startPos: 26, entryIndex: 26, color: 'blue' },
};

const createLudoState = (players) => {
  const colors = ['red', 'blue'];
  const playerMap = {};
  const pieces = {};

  players.forEach((p, i) => {
    const id = p._id.toString();
    const color = colors[i];
    playerMap[id] = color;
    pieces[color] = [
      { id: `${color}-0`, position: -1, steps: 0, isHome: true, isFinished: false },
      { id: `${color}-1`, position: -1, steps: 0, isHome: true, isFinished: false },
      { id: `${color}-2`, position: -1, steps: 0, isHome: true, isFinished: false },
      { id: `${color}-3`, position: -1, steps: 0, isHome: true, isFinished: false },
    ];
  });

  return {
    playerMap,        // { [userId]: 'red' | 'blue' }
    pieces,           // { red: [...], blue: [...] }
    currentTurn: players[0]._id.toString(),
    diceValue: null,
    diceRolled: false,
    hasValidMove: true,
    winner: null,
    isOver: false,
    lastAction: null,
  };
};

// Convert steps to board position for a color
const stepsToPosition = (steps, color) => {
  if (steps <= 0) return -1;
  const config = PLAYER_CONFIG[color];
  if (steps > TOTAL_PATH) return -2; // in home stretch
  return (config.startPos + steps - 1) % TOTAL_PATH;
};

// Check if a position is a safe zone
const isSafe = (position) => SAFE_ZONES.includes(position);

// Check if player has any valid moves
const hasValidMoves = (state, color, diceValue) => {
  const playerPieces = state.pieces[color];

  for (const piece of playerPieces) {
    if (piece.isFinished) continue;

    // Piece in base — needs 6 to come out
    if (piece.isHome) {
      if (diceValue === 6) return true;
      continue;
    }

    // Check if move would overshoot finish
    const newSteps = piece.steps + diceValue;
    if (newSteps <= TOTAL_STEPS) return true;
  }

  return false;
};

export default function ludoHandlers(io, socket) {
  // Initialize ludo when selected
  socket.on('game:select', async ({ roomKey, game }) => {
    if (game !== 'ludo') return;

    try {
      const room = await Room.findOne({ roomKey, isActive: true })
        .populate('players', 'username');

      if (!room || room.owner.toString() !== socket.userId) return;

      if (room.players.length < 2) {
        socket.emit('error', { message: 'Need 2 players to start Ludo' });
        return;
      }

      const state = createLudoState(room.players);
      room.currentGame = 'ludo';
      room.gameState = state;
      room.markModified('gameState');
      await room.save();

      io.to(roomKey).emit('game:selected', { game: 'ludo' });
      io.to(roomKey).emit('ludo:state', { ludoState: state });

      logger.info(`Ludo started in room ${roomKey}`);
    } catch (error) {
      logger.error(`Ludo init error: ${error.message}`);
    }
  });

  // Roll dice
  socket.on('ludo:roll-dice', async ({ roomKey }) => {
    try {
      const room = await Room.findOne({ roomKey, isActive: true });
      if (!room || room.currentGame !== 'ludo') return;

      const state = room.gameState;
      if (!state || state.isOver) return;

      if (state.currentTurn !== socket.userId) {
        socket.emit('error', { message: 'Not your turn' });
        return;
      }

      if (state.diceRolled) {
        socket.emit('error', { message: 'Already rolled, make a move' });
        return;
      }

      const value = Math.floor(Math.random() * 6) + 1;
      state.diceValue = value;
      state.diceRolled = true;

      const color = state.playerMap[socket.userId];
      state.hasValidMove = hasValidMoves(state, color, value);

      // If no valid moves, auto-pass turn
      if (!state.hasValidMove) {
        if (value !== 6) {
          const playerIds = Object.keys(state.playerMap);
          state.currentTurn = playerIds.find(id => id !== socket.userId);
        }
        state.diceRolled = false;
        state.diceValue = value; // keep for animation
        state.lastAction = `${socket.username} rolled ${value} — no valid moves`;
      }

      room.gameState = state;
      room.markModified('gameState');
      await room.save();

      io.to(roomKey).emit('ludo:dice-result', {
        value,
        playerId: socket.userId,
        hasValidMove: state.hasValidMove,
      });
      io.to(roomKey).emit('ludo:state', { ludoState: state });
    } catch (error) {
      logger.error(`Dice roll error: ${error.message}`);
      socket.emit('error', { message: 'Failed to roll dice' });
    }
  });

  // Move piece
  socket.on('ludo:move-piece', async ({ roomKey, pieceId }) => {
    try {
      const room = await Room.findOne({ roomKey, isActive: true });
      if (!room || room.currentGame !== 'ludo') return;

      const state = room.gameState;
      if (!state || state.isOver) return;

      if (state.currentTurn !== socket.userId) {
        socket.emit('error', { message: 'Not your turn' });
        return;
      }

      if (!state.diceRolled) {
        socket.emit('error', { message: 'Roll the dice first' });
        return;
      }

      const color = state.playerMap[socket.userId];
      const piece = state.pieces[color].find(p => p.id === pieceId);
      if (!piece || piece.isFinished) {
        socket.emit('error', { message: 'Invalid piece' });
        io.to(roomKey).emit('ludo:state', { ludoState: state }); // rollback
        return;
      }

      const diceValue = state.diceValue;

      // Moving from base
      if (piece.isHome) {
        if (diceValue !== 6) {
          socket.emit('error', { message: 'Need 6 to leave base' });
          io.to(roomKey).emit('ludo:state', { ludoState: state });
          return;
        }
        piece.isHome = false;
        piece.steps = 1;
        piece.position = PLAYER_CONFIG[color].startPos;
        state.lastAction = `${socket.username} brought a piece out`;
      } else {
        const newSteps = piece.steps + diceValue;

        // Check overshoot
        if (newSteps > TOTAL_STEPS) {
          socket.emit('error', { message: 'Move overshoots the finish' });
          io.to(roomKey).emit('ludo:state', { ludoState: state });
          return;
        }

        piece.steps = newSteps;

        if (newSteps === TOTAL_STEPS) {
          // Piece finished!
          piece.isFinished = true;
          piece.position = -2;
          state.lastAction = `${socket.username} finished a piece!`;
        } else if (newSteps > TOTAL_PATH) {
          // In home stretch
          piece.position = -2;
          state.lastAction = `${socket.username} moved to home stretch`;
        } else {
          piece.position = stepsToPosition(newSteps, color);

          // Check capture
          if (!isSafe(piece.position)) {
            const opponentColor = color === 'red' ? 'blue' : 'red';
            const captured = state.pieces[opponentColor].find(
              op => !op.isHome && !op.isFinished && op.position === piece.position
            );
            if (captured) {
              captured.isHome = true;
              captured.position = -1;
              captured.steps = 0;
              state.lastAction = `${socket.username} captured a piece!`;
            } else {
              state.lastAction = `${socket.username} moved a piece`;
            }
          } else {
            state.lastAction = `${socket.username} moved to a safe zone`;
          }
        }
      }

      // Check win condition
      const allFinished = state.pieces[color].every(p => p.isFinished);
      if (allFinished) {
        state.winner = color;
        state.isOver = true;
        state.lastAction = `${socket.username} wins!`;
      }

      // Next turn
      state.diceRolled = false;
      if (diceValue === 6 && !state.isOver) {
        // Extra turn for rolling 6
        state.diceValue = null;
      } else if (!state.isOver) {
        const playerIds = Object.keys(state.playerMap);
        state.currentTurn = playerIds.find(id => id !== socket.userId);
        state.diceValue = null;
      }

      room.gameState = state;
      room.markModified('gameState');
      await room.save();

      io.to(roomKey).emit('ludo:state', { ludoState: state });

      if (state.isOver) {
        io.to(roomKey).emit('game:over', {
          winner: state.winner,
          game: 'ludo',
        });
      }
    } catch (error) {
      logger.error(`Ludo move error: ${error.message}`);
      socket.emit('error', { message: 'Move failed, please retry' });
    }
  });
}
