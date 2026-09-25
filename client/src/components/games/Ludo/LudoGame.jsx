import { useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSocket } from '../../../context/SocketContext';
import toast from 'react-hot-toast';
import LudoBoard from './LudoBoard';
import Dice from './Dice';

export default function LudoGame({ ludoState, roomKey, userId, isOwner, onBackToLobby }) {
  const { emit } = useSocket();
  const [diceRolling, setDiceRolling] = useState(false);
  const [lastDice, setLastDice] = useState(null);
  const [selectablePieces, setSelectablePieces] = useState([]);

  const myColor = ludoState?.playerMap?.[userId];
  const isMyTurn = ludoState?.currentTurn === userId;
  const diceRolled = ludoState?.diceRolled;

  // Determine selectable pieces after dice roll
  useEffect(() => {
    if (!ludoState || !isMyTurn || !diceRolled || !myColor) {
      setSelectablePieces([]);
      return;
    }

    const pieces = ludoState.pieces[myColor] || [];
    const diceValue = ludoState.diceValue;
    const selectable = [];

    for (const piece of pieces) {
      if (piece.isFinished) continue;
      if (piece.isHome && diceValue === 6) {
        selectable.push(piece.id);
      } else if (!piece.isHome) {
        const newSteps = piece.steps + diceValue;
        if (newSteps <= 58) {
          selectable.push(piece.id);
        }
      }
    }

    setSelectablePieces(selectable);
  }, [ludoState, isMyTurn, diceRolled, myColor]);

  // Update last dice display
  useEffect(() => {
    if (ludoState?.diceValue != null) {
      setLastDice(ludoState.diceValue);
      setDiceRolling(false);
    }
  }, [ludoState?.diceValue]);

  const handleRollDice = useCallback(() => {
    if (!isMyTurn || diceRolled) return;
    setDiceRolling(true);
    emit('ludo:roll-dice', { roomKey });
    setTimeout(() => setDiceRolling(false), 2000);
  }, [isMyTurn, diceRolled, roomKey, emit]);

  const handleMovePiece = useCallback((pieceId) => {
    if (!isMyTurn || !diceRolled) return;
    if (!selectablePieces.includes(pieceId)) {
      toast.error('Cannot move this piece');
      return;
    }
    emit('ludo:move-piece', { roomKey, pieceId });
    setSelectablePieces([]);
  }, [isMyTurn, diceRolled, selectablePieces, roomKey, emit]);

  if (!ludoState) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#3a3a3a] border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center px-3 py-3 gap-3 overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between w-full max-w-md">
        {isOwner ? (
          <button
            onClick={onBackToLobby}
            className="text-[#6b6b6b] hover:text-[#a0a0a0] transition-colors text-xs flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Lobby
          </button>
        ) : <div />}
        <h2 className="text-sm font-semibold">Ludo</h2>
        <div className="flex items-center gap-1.5">
          <div className={`w-2.5 h-2.5 rounded-full ${myColor === 'red' ? 'bg-red-500' : 'bg-blue-500'}`} />
          <span className="text-[11px] text-[#6b6b6b] capitalize">{myColor}</span>
        </div>
      </div>

      {/* Status Line */}
      <div className="text-center">
        {ludoState.isOver ? (
          <p className="text-base font-bold">
            {ludoState.winner === myColor ? '🎉 You win!' : 'You lost'}
          </p>
        ) : (
          <p className="text-xs text-[#a0a0a0]">
            {isMyTurn
              ? (diceRolled ? 'Tap a highlighted piece to move' : 'Your turn — roll the dice')
              : "Opponent's turn"
            }
          </p>
        )}

        {ludoState.lastAction && (
          <motion.p
            key={ludoState.lastAction}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[11px] text-[#6b6b6b] italic mt-0.5"
          >
            {ludoState.lastAction}
          </motion.p>
        )}
      </div>

      {/* Board */}
      <LudoBoard
        ludoState={ludoState}
        myColor={myColor}
        selectablePieces={selectablePieces}
        onMovePiece={handleMovePiece}
      />

      {/* Dice + Controls */}
      <div className="flex items-center gap-4">
        <Dice value={lastDice} rolling={diceRolling} />

        <div className="flex flex-col items-start gap-1">
          <button
            onClick={handleRollDice}
            disabled={!isMyTurn || diceRolled || ludoState.isOver || diceRolling}
            className="btn-primary text-xs py-2 px-6"
          >
            {diceRolling ? 'Rolling...' : diceRolled ? `Rolled ${lastDice}` : 'Roll Dice'}
          </button>

          {/* Score row */}
          <div className="flex gap-4 text-[10px] text-[#6b6b6b]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              {ludoState.pieces.red.filter(p => p.isFinished).length}/4
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              {ludoState.pieces.blue.filter(p => p.isFinished).length}/4
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
