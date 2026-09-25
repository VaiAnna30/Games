import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';

const cellVariants = {
  initial: { scale: 0, rotate: -180 },
  animate: { scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 200, damping: 15 } },
};

export default function TicTacToe({ gameState, roomKey, userId, isOwner, onBackToLobby }) {
  const { emit } = useSocket();

  const handleMove = useCallback((index) => {
    if (!gameState || gameState.isOver) return;
    if (gameState.currentTurn !== userId) {
      toast.error("Not your turn");
      return;
    }
    if (gameState.board[index] !== null) return;

    emit('game:move', { roomKey, move: { index } });
  }, [gameState, roomKey, userId, emit]);

  const handleReset = useCallback(() => {
    emit('game:reset', { roomKey });
  }, [roomKey, emit]);

  if (!gameState) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#3a3a3a] border-t-[#f5f5f5] rounded-full animate-spin" />
      </div>
    );
  }

  const mySymbol = gameState.players[userId];
  const isMyTurn = gameState.currentTurn === userId;
  const opponentId = Object.keys(gameState.players).find(id => id !== userId);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 space-y-6">
      {/* Game Header */}
      <div className="flex items-center justify-between w-full max-w-xs">
        <button
          onClick={onBackToLobby}
          className="text-[#6b6b6b] hover:text-[#a0a0a0] transition-colors text-xs flex items-center gap-1"
          disabled={!isOwner}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Lobby
        </button>
        <h2 className="text-sm font-semibold">Tic-Tac-Toe</h2>
        <div className="w-12" />
      </div>

      {/* Turn Indicator */}
      <motion.div
        key={gameState.currentTurn}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        {gameState.isOver ? (
          <p className="text-lg font-bold">
            {gameState.isDraw ? "It's a draw!" : (
              gameState.winner === mySymbol ? '🎉 You win!' : 'You lost'
            )}
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isMyTurn ? 'bg-green-400 animate-pulse' : 'bg-[#3a3a3a]'}`} />
            <p className="text-sm text-[#a0a0a0]">
              {isMyTurn ? 'Your turn' : "Opponent's turn"} 
              <span className="text-[#6b6b6b] ml-1">({mySymbol})</span>
            </p>
          </div>
        )}
      </motion.div>

      {/* Board */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-[280px]">
        {gameState.board.map((cell, index) => {
          const isWinCell = gameState.winLine?.includes(index);
          return (
            <motion.button
              key={index}
              whileTap={!cell && isMyTurn && !gameState.isOver ? { scale: 0.95 } : {}}
              onClick={() => handleMove(index)}
              disabled={!!cell || !isMyTurn || gameState.isOver}
              className={`
                aspect-square rounded-2xl border text-3xl font-light flex items-center justify-center
                transition-all duration-300
                ${isWinCell
                  ? 'bg-white/20 border-white/50'
                  : cell
                    ? 'bg-[#1a1a1a] border-[#2a2a2a]'
                    : 'bg-[#141414] border-[#2a2a2a] hover:border-[#3a3a3a] hover:bg-[#1a1a1a]/50 cursor-pointer'
                }
                ${!cell && isMyTurn && !gameState.isOver ? '' : 'cursor-default'}
              `}
            >
              <AnimatePresence>
                {cell && (
                  <motion.span
                    variants={cellVariants}
                    initial="initial"
                    animate="animate"
                    className={cell === 'X' ? 'text-white' : 'text-[#6b6b6b]'}
                  >
                    {cell}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* Actions */}
      {gameState.isOver && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3"
        >
          <button onClick={handleReset} className="btn-primary text-sm py-2 px-5">
            Play Again
          </button>
          {isOwner && (
            <button onClick={onBackToLobby} className="btn-secondary text-sm py-2 px-5">
              Back to Lobby
            </button>
          )}
        </motion.div>
      )}

      {/* Symbol Legend */}
      <div className="flex items-center gap-6 text-xs text-[#6b6b6b]">
        <div className="flex items-center gap-1.5">
          <span className="text-white font-medium">X</span>
          <span>Player 1</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[#6b6b6b] font-medium">O</span>
          <span>Player 2</span>
        </div>
      </div>
    </div>
  );
}
