import React, { useState, useEffect } from 'react';
import { Lock, User, ArrowRight, Eye, EyeOff, ShieldAlert, ShieldCheck } from 'lucide-react';
import { UserAccount } from '../types';
import {
  verifyPassword,
  checkLockout,
  recordFailedAttempt,
  resetFailedAttempts,
  createSessionToken,
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

  const handleUsernameBlur = () => {
    if (!username.trim()) return;
    const status = checkLockout(username);
    if (status.isLocked) {
      setLockoutRemaining(status.remainingSeconds);
      setError(`Accesso bloccato temporaneamente. Riprova tra ${status.remainingSeconds} secondi.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim().toLowerCase();

    const lockout = checkLockout(cleanUser);
    if (lockout.isLocked) {
      setLockoutRemaining(lockout.remainingSeconds);
      setError(`Troppi tentativi falliti. Riprova tra ${lockout.remainingSeconds} secondi.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const found = users.find((u) => u.username.toLowerCase() === cleanUser);

      if (!found) {
        const attemptStatus = recordFailedAttempt(cleanUser);
        if (attemptStatus.isLocked) {
          setLockoutRemaining(attemptStatus.remainingSeconds);
          setError('Account bloccato per 5 minuti a seguito di tentativi multipli.');
        } else {
          setError(`Credenziali non valide. (${attemptStatus.attemptsLeft} tentativi rimasti)`);
        }
        setIsSubmitting(false);
        return;
      }

      const isValid = await verifyPassword(password, found.salt, found.passwordHash);

      if (isValid) {
        resetFailedAttempts(cleanUser);
        const token = await createSessionToken(found);
        onLogin(found, token);
      } else {
        const attemptStatus = recordFailedAttempt(cleanUser);
        if (attemptStatus.isLocked) {
          setLockoutRemaining(attemptStatus.remainingSeconds);
          setError('Account bloccato per 5 minuti a seguito di tentativi multipli.');
        } else {
          setError(`Credenziali non valide. (${attemptStatus.attemptsLeft} tentativi rimasti)`);
        }
      }
    } catch (err) {
      console.error('Authentication verification error:', err);
      setError('Errore durante la verifica delle credenziali. Riprova.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLocked = lockoutRemaining > 0;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 selection:bg-zinc-700 selection:text-zinc-100">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-lg p-8">
        {/* Logo and title */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 mb-4">
            <img src="./logo-3d.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-100">Gestione interventi</h2>
          <p className="text-xs font-normal text-zinc-400 mt-2 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
            <span>Accesso autenticato al sistema tecnico</span>
          </p>
        </div>

        {/* Error / Lockout notification */}
        {error && (
          <div className="mb-4 p-4 rounded-lg border border-zinc-700 bg-zinc-950 text-xs font-normal text-zinc-200 text-center flex items-center justify-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-zinc-400" strokeWidth={1.75} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              <span>Nome utente</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              disabled={isLocked}
              value={username}
              onBlur={handleUsernameBlur}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Es. costantino"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm font-normal text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              <span>Password</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isLocked}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-4 pr-10 py-2 text-sm font-normal text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition disabled:opacity-50"
              />
              <button
                type="button"
                tabIndex={-1}
                disabled={isLocked}
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 disabled:opacity-40"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" strokeWidth={1.75} />
                ) : (
                  <Eye className="w-4 h-4" strokeWidth={1.75} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLocked || isSubmitting}
            className="w-full py-2 px-4 rounded-lg bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2 transition mt-4"
          >
            {isSubmitting ? (
              <span>Verifica credenziali...</span>
            ) : isLocked ? (
              <span>Bloccato ({lockoutRemaining}s)</span>
            ) : (
              <>
                <span>Accedi</span>
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </>
            )}
          </button>
        </form>

        {/* Footnote */}
        <div className="mt-6 pt-4 border-t border-zinc-800 text-center space-y-2">
          <p className="text-xs font-normal text-zinc-500">
            Autenticazione crittografata (SHA-256 con salt e protezione tentativi).
          </p>
          <p className="text-xs font-normal text-zinc-500">
            Credenziali e permessi gestiti dall'amministratore (Costantino).
          </p>
        </div>
      </div>
    </div>
  );
};
