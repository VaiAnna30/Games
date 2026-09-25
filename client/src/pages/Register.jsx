import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const pageVariants = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, x: -30, transition: { duration: 0.3 } },
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.email || !form.password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      toast.success('Account created!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="page-container"
    >
      <div className="w-full max-w-sm space-y-8">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-arena-gray hover:text-arena-light transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-arena-gray text-sm">Join SyncArena and start playing</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-arena-light text-sm font-medium" htmlFor="reg-username">Username</label>
            <input
              id="reg-username"
              type="text"
              placeholder="Player1"
              className="input-field"
              value={form.username}
              onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <label className="text-arena-light text-sm font-medium" htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              placeholder="you@example.com"
              className="input-field"
              value={form.email}
              onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <label className="text-arena-light text-sm font-medium" htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              placeholder="Min. 6 characters"
              className="input-field"
              value={form.password}
              onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-arena-black/30 border-t-arena-black rounded-full animate-spin" />
                Creating...
              </span>
            ) : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-arena-gray text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-arena-white hover:underline font-medium">
            Sign In
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
