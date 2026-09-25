import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const pageVariants = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
};

export default function Landing() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="page-container relative overflow-hidden"
    >
      {/* Subtle background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center space-y-8">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex items-center justify-center gap-3"
        >
          <div className="w-10 h-10 bg-arena-accent rounded-xl flex items-center justify-center">
            <span className="text-arena-black text-lg font-black">S</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">SyncArena</h1>
        </motion.div>

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <p className="text-arena-light text-lg leading-relaxed">
            Real-time 2-player gaming.
            <br />
            <span className="text-arena-white font-medium">Clean. Fast. Together.</span>
          </p>
          <p className="text-arena-gray text-sm">
            Tic-Tac-Toe &bull; Ludo &bull; Live Chat
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-3 justify-center pt-4"
        >
          <Link to="/login" className="btn-primary text-center">
            Sign In
          </Link>
          <Link to="/register" className="btn-secondary text-center">
            Create Account
          </Link>
        </motion.div>

        {/* Decorative grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="pt-12"
        >
          <div className="grid grid-cols-3 gap-2 max-w-[120px] mx-auto opacity-20">
            {Array(9).fill(null).map((_, i) => (
              <div
                key={i}
                className="w-8 h-8 border border-arena-border rounded-lg"
              />
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
