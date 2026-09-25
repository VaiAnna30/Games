import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Chat from '../components/chat/Chat';
import TicTacToe from '../components/games/TicTacToe';
import LudoGame from '../components/games/Ludo/LudoGame';

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const gameVariants = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.3 } },
};

export default function GameRoom() {
  const { roomKey } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { emit, on, connected } = useSocket();

  const [room, setRoom] = useState(null);
  const [currentGame, setCurrentGame] = useState('none');
  const [gameState, setGameState] = useState(null);
  const [ludoState, setLudoState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Fetch room data
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const { data } = await api.get(`/rooms/${roomKey}`);
        setRoom(data);
        setCurrentGame(data.currentGame || 'none');
        if (data.gameState && data.currentGame === 'tictactoe') {
          setGameState(data.gameState);
        }
        if (data.gameState && data.currentGame === 'ludo') {
          setLudoState(data.gameState);
        }
      } catch {
        toast.error('Room not found');
        navigate('/dashboard');
        return;
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [roomKey]);

  // Socket events
  useEffect(() => {
    if (!connected || !room) return;

    emit('room:join', { roomKey });

    const cleanups = [
      on('room:joined', ({ room: freshRoom }) => {
        setRoom(freshRoom);
      }),
      on('room:player-joined', ({ username }) => {
        toast.success(`${username} joined`);
        api.get(`/rooms/${roomKey}`).then(({ data }) => setRoom(data));
      }),
      on('room:player-left', ({ username }) => {
        toast(`${username} left`, { icon: '👋' });
        api.get(`/rooms/${roomKey}`).then(({ data }) => setRoom(data));
      }),
      on('game:selected', ({ game }) => {
        setCurrentGame(game);
        if (game === 'none') {
          setGameState(null);
          setLudoState(null);
        }
      }),
      on('game:state', ({ gameState: gs }) => {
        setGameState(gs);
      }),
      on('ludo:state', ({ ludoState: ls }) => {
        setLudoState(ls);
      }),
      on('game:over', ({ winner, game }) => {
        if (game === 'ludo') {
          toast.success(
            winner ? `${winner.toUpperCase()} wins! 🎉` : 'Game over!',
            { duration: 5000 }
          );
        }
      }),
    ];

    return () => cleanups.forEach(c => c?.());
  }, [connected, room?._id]);

  const handleLeave = useCallback(() => {
    emit('room:leave', { roomKey });
    navigate('/dashboard');
  }, [roomKey, emit, navigate]);

  const handleSelectGame = useCallback((game) => {
    if (room?.owner?._id !== user?._id) {
      toast.error('Only the room owner can select a game');
      return;
    }
    emit('game:select', { roomKey, game });
  }, [roomKey, room, user, emit]);

  const handleBackToLobby = useCallback(() => {
    emit('game:back-to-lobby', { roomKey });
  }, [roomKey, emit]);

  const copyRoomKey = () => {
    navigator.clipboard.writeText(roomKey);
    toast.success('Copied!');
  };

  const isOwner = room?.owner?._id === user?._id;
  const opponent = room?.players?.find(p => p._id !== user?._id);

  if (loading) {
    return (
      <div className="page-container">
        <div className="w-8 h-8 border-2 border-[#3a3a3a] border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen flex flex-col"
    >
      {/* Top Bar — compact */}
      <div className="border-b border-[#1e1e1e] px-3 py-2.5 flex-shrink-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <button onClick={handleLeave} className="text-[#6b6b6b] hover:text-white transition-colors flex-shrink-0">
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="min-w-0">
              <button onClick={copyRoomKey} className="font-mono font-bold text-xs tracking-widest hover:text-[#d4d4d4] transition-colors flex items-center gap-1.5">
                {roomKey}
                <svg className="w-3 h-3 text-[#3a3a3a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <p className="text-[#6b6b6b] text-[10px] truncate">
                {opponent ? `vs ${opponent.username}` : 'Waiting for player 2...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <button
              onClick={() => { setShowChat(!showChat); setUnreadMessages(0); }}
              className="relative p-1.5 text-[#6b6b6b] hover:text-white transition-colors"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {unreadMessages > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-white text-[#0a0a0a] text-[8px] font-bold rounded-full flex items-center justify-center">
                  {unreadMessages}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full relative overflow-hidden">
        <AnimatePresence mode="wait">
          {/* Lobby */}
          {currentGame === 'none' && (
            <motion.div
              key="lobby"
              variants={gameVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-6"
            >
              {/* Players */}
              <div className="w-full max-w-xs space-y-2">
                <h2 className="text-[10px] font-semibold text-[#6b6b6b] uppercase tracking-wider">Players</h2>
                {room?.players?.map((p) => (
                  <div key={p._id} className="glass-card p-3 flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/5 border border-[#2a2a2a] rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold">{p.username[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.username}</p>
                      <p className="text-[10px] text-[#6b6b6b]">
                        {p._id === room.owner._id ? 'Owner' : 'Player 2'}
                        {p._id === user?._id ? ' · You' : ''}
                      </p>
                    </div>
                  </div>
                ))}
                {room?.players?.length < 2 && (
                  <div className="glass-card p-3 flex items-center gap-3 border-dashed opacity-40">
                    <div className="w-8 h-8 bg-[#141414] border border-[#2a2a2a] rounded-xl flex items-center justify-center">
                      <span className="text-xs text-[#6b6b6b]">?</span>
                    </div>
                    <p className="text-sm text-[#6b6b6b]">Waiting for player 2...</p>
                  </div>
                )}
              </div>

              {/* Game Selection */}
              {isOwner ? (
                <div className="w-full max-w-xs space-y-2">
                  <h2 className="text-[10px] font-semibold text-[#6b6b6b] uppercase tracking-wider">Select Game</h2>
                  <div className="grid grid-cols-2 gap-2">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleSelectGame('tictactoe')}
                      className="glass-card p-4 text-center hover:border-[#3a3a3a] transition-all"
                    >
                      <div className="text-xl mb-1.5">✕○</div>
                      <p className="font-semibold text-xs">Tic-Tac-Toe</p>
                      <p className="text-[#6b6b6b] text-[10px] mt-0.5">Classic</p>
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleSelectGame('ludo')}
                      disabled={room?.players?.length < 2}
                      className="glass-card p-4 text-center hover:border-[#3a3a3a] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <div className="text-xl mb-1.5">🎲</div>
                      <p className="font-semibold text-xs">Ludo</p>
                      <p className="text-[#6b6b6b] text-[10px] mt-0.5">Board Game</p>
                    </motion.button>
                  </div>
                </div>
              ) : (
                <p className="text-[#6b6b6b] text-sm" style={{ animation: 'pulseSoft 2s ease-in-out infinite' }}>
                  Waiting for host to select a game...
                </p>
              )}

              {/* Share Key */}
              <div className="text-center space-y-2 pt-2">
                <p className="text-[#3a3a3a] text-xs">Share this code with your friend</p>
                <button
                  onClick={copyRoomKey}
                  className="font-mono text-lg tracking-[0.3em] font-bold bg-white/[0.03] border border-[#2a2a2a] rounded-2xl px-6 py-2.5 hover:border-[#3a3a3a] transition-all"
                >
                  {roomKey}
                </button>
              </div>
            </motion.div>
          )}

          {/* Tic-Tac-Toe */}
          {currentGame === 'tictactoe' && (
            <motion.div
              key="tictactoe"
              variants={gameVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex-1 flex flex-col"
            >
              <TicTacToe
                gameState={gameState}
                roomKey={roomKey}
                userId={user?._id}
                isOwner={isOwner}
                onBackToLobby={handleBackToLobby}
              />
            </motion.div>
          )}

          {/* Ludo */}
          {currentGame === 'ludo' && (
            <motion.div
              key="ludo"
              variants={gameVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex-1 flex flex-col"
            >
              <LudoGame
                ludoState={ludoState}
                roomKey={roomKey}
                userId={user?._id}
                isOwner={isOwner}
                onBackToLobby={handleBackToLobby}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Panel */}
        <AnimatePresence>
          {showChat && room && (
            <Chat
              roomId={room._id}
              roomKey={roomKey}
              onClose={() => setShowChat(false)}
              onNewMessage={() => {
                if (!showChat) setUnreadMessages(prev => prev + 1);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
