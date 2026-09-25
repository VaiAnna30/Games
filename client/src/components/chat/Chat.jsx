import { useState, useEffect, useRef, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../utils/api';

const Chat = forwardRef(({ roomId, roomKey, onClose, onNewMessage }, ref) => {
  const { user } = useAuth();
  const { emit, on } = useSocket();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  // Fetch chat history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await api.get(`/messages/${roomId}`);
        setMessages(data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [roomId]);

  // Listen for new messages
  useEffect(() => {
    const cleanup = on('chat:new-message', (message) => {
      setMessages(prev => [...prev, message]);
      onNewMessage?.();
    });
    return cleanup;
  }, [on, onNewMessage]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    emit('chat:message', { roomKey, text: text.trim() });
    setText('');
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-y-0 right-0 w-full sm:w-80 bg-arena-dark border-l border-arena-border z-40 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-arena-border">
        <h3 className="font-semibold text-sm">Chat</h3>
        <button
          onClick={onClose}
          className="text-arena-gray hover:text-arena-light transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-arena-muted border-t-arena-white rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-arena-gray text-xs text-center py-8">No messages yet</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === user?._id;
            return (
              <motion.div
                key={msg._id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                {!isMe && (
                  <span className="text-[10px] text-arena-gray mb-0.5 px-1">
                    {msg.senderName}
                  </span>
                )}
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                    isMe
                      ? 'bg-arena-accent text-arena-black rounded-br-md'
                      : 'bg-arena-card border border-arena-border text-arena-white rounded-bl-md'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-arena-gray mt-0.5 px-1">
                  {formatTime(msg.createdAt)}
                </span>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="px-4 py-3 border-t border-arena-border">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            className="input-field flex-1 py-2 text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="bg-arena-accent text-arena-black p-2 rounded-xl disabled:opacity-40 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </motion.div>
  );
});

Chat.displayName = 'Chat';
export default Chat;
