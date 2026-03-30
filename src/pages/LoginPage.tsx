import { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from ?? '/manage';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(101, 93, 79, 0.03) 0%, rgba(237, 225, 207, 0.08) 100%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2.5">
            <img src="/logo.png" alt="VersaHome" className="h-10 w-auto" />
            <span className="font-display font-700 text-2xl text-on-surface tracking-tight">
              VersaHome
            </span>
          </a>
          <p className="mt-3 font-body text-sm text-on-surface/50">
            Management Portal — Staff Access Only
          </p>
        </div>

        {/* Card */}
        <div
          className="bg-surface-lowest rounded-[0.5rem] p-8"
          style={{
            boxShadow: '0 10px 40px rgba(48, 51, 47, 0.08), 0 4px 12px rgba(48, 51, 47, 0.04)',
          }}
        >
          <h1 className="font-display font-700 text-xl text-on-surface mb-6">
            Sign in to your account
          </h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block font-body text-sm font-medium text-on-surface/70 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@versahome.com.my"
                className="w-full px-4 py-2.5 rounded-[0.375rem] border font-body text-sm text-on-surface bg-surface placeholder:text-on-surface/30 outline-none transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary"
                style={{ borderColor: 'var(--color-outline-variant)' }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block font-body text-sm font-medium text-on-surface/70 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-11 rounded-[0.375rem] border font-body text-sm text-on-surface bg-surface placeholder:text-on-surface/30 outline-none transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  style={{ borderColor: 'var(--color-outline-variant)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface/40 hover:text-on-surface/70 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="text-right">
              <a
                href="/forgot-password"
                className="font-body text-xs text-primary hover:opacity-70 transition-opacity"
              >
                Forgot password?
              </a>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 py-3 rounded-[0.375rem] bg-red-50 border border-red-200"
              >
                <p className="font-body text-sm text-red-600">{error}</p>
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2.5 bg-primary text-on-primary px-6 py-3 rounded-[0.375rem] font-body font-medium text-sm transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center font-body text-xs text-on-surface/30 mt-6">
          &copy; {new Date().getFullYear()} VersaHome. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
