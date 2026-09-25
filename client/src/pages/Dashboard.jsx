import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
};

const cardVariants = {
  initial: { opacity: 0, y: 10 },
  animate: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [joinKey, setJoinKey] = useState('');
  const [myRooms, setMyRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    fetchMyRooms();
  }, []);

  const fetchMyRooms = async () => {
    try {
      const { data } = await api.get('/rooms/user/my-rooms');
      setMyRooms(data);
    } catch {
      // silent
    }
  };

  const handleCreateRoom = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/rooms/create');
      toast.success(`Room created: ${data.roomKey}`);
      navigate(`/room/${data.roomKey}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!joinKey.trim()) {
      toast.error('Enter a room key');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/rooms/join', { roomKey: joinKey.trim() });
      toast.success('Joined room!');
      navigate(`/room/${data.roomKey}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async (roomKey) => {
    try {
      await api.delete(`/rooms/${roomKey}`);
      toast.success('Room deleted');
      fetchMyRooms();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete room');
    }
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen px-4 py-6 max-w-lg mx-auto flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center">
            <span className="text-[#0a0a0a] text-sm font-black">S</span>
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Dashboard</h1>
            <p className="text-[#6b6b6b] text-xs">{user?.username}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="text-[#6b6b6b] hover:text-[#a0a0a0] text-sm transition-colors"
        >
          Sign Out
        </button>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <motion.button
          variants={cardVariants}
          custom={0}
          initial="initial"
          animate="animate"
          whileTap={{ scale: 0.97 }}
          onClick={handleCreateRoom}
          disabled={loading}
          className="glass-card p-5 text-left hover:border-[#3a3a3a] transition-all group"
        >
          <div className="w-10 h-10 bg-white/5 border border-[#2a2a2a] rounded-xl flex items-center justify-center mb-3 group-hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <p className="font-semibold text-sm">Create Room</p>
          <p className="text-[#6b6b6b] text-xs mt-1">Start a new game</p>
        </motion.button>

        <motion.button
          variants={cardVariants}
          custom={1}
          initial="initial"
          animate="animate"
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowJoinModal(true)}
          className="glass-card p-5 text-left hover:border-[#3a3a3a] transition-all group"
        >
          <div className="w-10 h-10 bg-white/5 border border-[#2a2a2a] rounded-xl flex items-center justify-center mb-3 group-hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <p className="font-semibold text-sm">Join Room</p>
          <p className="text-[#6b6b6b] text-xs mt-1">Enter a room key</p>
        </motion.button>
      </div>

      {/* My Rooms */}
      <div className="flex-1">
        <h2 className="text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider mb-3">
          {myRooms.length > 0 ? 'Your Rooms' : ''}
        </h2>
        {myRooms.length > 0 ? (
          <div className="space-y-2">
            {myRooms.map((room, i) => (
              <motion.div
                key={room._id}
                variants={cardVariants}
                custom={i}
                initial="initial"
                animate="animate"
                className="glass-card p-4 flex items-center justify-between"
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => navigate(`/room/${room.roomKey}`)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm tracking-wider">{room.roomKey}</span>
                    <span className="text-[10px] text-[#6b6b6b] bg-white/5 px-1.5 py-0.5 rounded-md">
                      {room.players.length}/2
                    </span>
                  </div>
                  <p className="text-[#6b6b6b] text-xs mt-1">
                    {room.currentGame !== 'none' ? `Playing ${room.currentGame}` : 'Lobby'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/room/${room.roomKey}`)}
                    className="text-xs bg-white/5 text-white px-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    Enter
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room.roomKey); }}
                    className="text-xs text-red-400/60 hover:text-red-400 px-2 py-1.5 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-white/[0.03] border border-[#2a2a2a] rounded-2xl flex items-center justify-center mb-4">
              <span className="text-2xl">🎮</span>
            </div>
            <p className="text-[#6b6b6b] text-sm">No rooms yet</p>
            <p className="text-[#3a3a3a] text-xs mt-1">Create or join a room to start playing</p>
          </div>
        )}
      </div>

      {/* Join Modal */}
      <AnimatePresence>
        {showJoinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
            onClick={() => setShowJoinModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="glass-card p-6 w-full max-w-sm space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold">Join Room</h2>
              <p className="text-[#6b6b6b] text-sm">Enter the 6-character room key shared by your friend.</p>
              <form onSubmit={handleJoinRoom} className="space-y-4">
                <input
                  type="text"
                  placeholder="A1B2C3"
                  className="input-field font-mono text-center uppercase tracking-[0.3em] text-lg py-4"
                  value={joinKey}
                  onChange={(e) => setJoinKey(e.target.value.toUpperCase())}
                  maxLength={6}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowJoinModal(false)} className="btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" disabled={loading || joinKey.length < 4} className="btn-primary flex-1">
                    {loading ? 'Joining...' : 'Join'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
