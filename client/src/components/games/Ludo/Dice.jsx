import { motion } from 'framer-motion';

// Dice face dot layouts
const dotLayouts = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

export default function Dice({ value, rolling }) {
  const dots = value ? dotLayouts[value] || [] : [];

  return (
    <motion.div
      animate={rolling ? {
        rotateX: [0, 360, 720],
        rotateY: [0, 180, 360],
      } : {
        rotateX: 0,
        rotateY: 0,
      }}
      transition={rolling ? {
        duration: 0.6,
        ease: 'easeOut',
      } : {
        duration: 0.3,
      }}
      className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-white/10"
      style={{ perspective: '600px' }}
    >
      {!rolling && value && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-1 p-2 w-full h-full"
        >
          {[0, 1, 2].map(row => (
            [0, 1, 2].map(col => {
              const hasDot = dots.some(([r, c]) => r === row && c === col);
              return (
                <div
                  key={`${row}-${col}`}
                  className="flex items-center justify-center"
                >
                  {hasDot && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.15 + (row * 3 + col) * 0.03 }}
                      className="w-2.5 h-2.5 rounded-full bg-[#0a0a0a]"
                    />
                  )}
                </div>
              );
            })
          )).flat()}
        </motion.div>
      )}
      {!rolling && !value && (
        <span className="text-[#0a0a0a] text-xl font-bold">?</span>
      )}
    </motion.div>
  );
}
