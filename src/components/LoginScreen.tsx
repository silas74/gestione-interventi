import React, { useState, useEffect } from 'react';
import { Lock, User, ArrowRight, Eye, EyeOff, ShieldAlert, ShieldCheck } from 'lucide-react';
import { UserAccount } from '../types';
import { 
  verifyPassword, 
  checkLockout, 
  recordFailedAttempt, 
  resetFailedAttempts, 
  createSessionToken 
} from '../lib/authSecurity';

interface LoginScreenProps {
  users: UserAccount[];
  onLogin: (user: UserAccount, token?: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ users, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // Active countdown timer for lockout
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const interval = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutRemaining]);

  // Check lockout on username blur or change
  const handleUsernameBlur = () => {
    if (!username.trim()) return;
    const status = checkLockout(username);
    if (status.isLocked) {
      setLockoutRemaining(status.remainingSeconds);
      setError(`Account locked due to consecutive failed attempts. Try again in ${status.remainingSeconds}s.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim().toLowerCase();

    // 1. Verify brute force lockout
    const lockout = checkLockout(cleanUser);
    if (lockout.isLocked) {
      setLockoutRemaining(lockout.remainingSeconds);
      setError(`Too many failed attempts. Login temporarily disabled for ${lockout.remainingSeconds}s.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const found = users.find(u => u.username.toLowerCase() === cleanUser);

      if (!found) {
        const attemptStatus = recordFailedAttempt(cleanUser);
        if (attemptStatus.isLocked) {
          setLockoutRemaining(attemptStatus.remainingSeconds);
          setError(`Account locked for 5 minutes due to multiple failed attempts.`);
        } else {
          setError(`Invalid username or password. (${attemptStatus.attemptsLeft} attempts remaining)`);
        }
        setIsSubmitting(false);
        return;
      }

      // 2. Cryptographic Salted SHA-256 verification (Zero plaintext match)
      const isValid = await verifyPassword(password, found.salt, found.passwordHash);

      if (isValid) {
        // Reset rate limiter on successful auth
        resetFailedAttempts(cleanUser);

        // 3. Issue cryptographically signed session token with expiry
        const token = await createSessionToken(found);

        onLogin(found, token);
      } else {
        const attemptStatus = recordFailedAttempt(cleanUser);
        if (attemptStatus.isLocked) {
          setLockoutRemaining(attemptStatus.remainingSeconds);
          setError(`Account locked for 5 minutes due to multiple failed attempts.`);
        } else {
          setError(`Invalid credentials. (${attemptStatus.attemptsLeft} attempts remaining before temporary lockout)`);
        }
      }
    } catch (err) {
      console.error('Authentication verification error:', err);
      setError('An error occurred during authentication. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLocked = lockoutRemaining > 0;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-3 sm:p-4 selection:bg-blue-600 selection:text-white">
      
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
        
        {/* Logo and title */}
        <div className="text-center mb-5 sm:mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/30 border border-slate-700/80 mb-2.5 sm:mb-3">
            <img src="./logo-3d.png" alt="Logo 3D Interventi" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
            <span>FIELD SERVICE</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Secure Authentication & Access Gateway</span>
          </p>
        </div>

        {/* Error / Lockout notification */}
        {error && (
          <div className={`mb-4 p-3 rounded-xl border text-xs font-medium text-center flex items-center justify-center gap-2 ${
            isLocked 
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-200' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-400" />
              Username
            </label>
            <input
              type="text"
              required
              autoFocus
              disabled={isLocked}
              value={username}
              onBlur={handleUsernameBlur}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. costantino"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isLocked}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
              />
              <button
                type="button"
                tabIndex={-1}
                disabled={isLocked}
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 disabled:opacity-40"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLocked || isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition active:scale-98 mt-2"
          >
            {isSubmitting ? (
              <span>Verifying Credentials...</span>
            ) : isLocked ? (
              <span>Locked ({lockoutRemaining}s)</span>
            ) : (
              <>
                <span>Secure Log In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

        </form>

        {/* Footnote */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center space-y-1">
          <p className="text-[11px] text-slate-500">
            Encrypted Authentication (SHA-256 + Salt, Token Session & Rate Limiting).
          </p>
          <p className="text-[10px] text-slate-600">
            User credentials and access are provisioned exclusively by administrator (Costantino).
          </p>
        </div>

      </div>

    </div>
  );
};
