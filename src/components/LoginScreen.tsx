import React, { useState } from 'react';
import { Lock, User, KeyRound, Wrench, Shield, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { UserAccount } from '../types';

interface LoginScreenProps {
  users: UserAccount[];
  onLogin: (user: UserAccount) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ users, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const found = users.find(
      u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
    );

    if (found) {
      onLogin(found);
    } else {
      setError('Credenziali non valide. Verifica username e password o chiedi a Costantino.');
    }
  };

  const handleQuickLogin = (u: UserAccount) => {
    setUsername(u.username);
    setPassword(u.password);
    onLogin(u);
  };

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
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">GESTIONE INTERVENTI</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Accesso Riservato — Inserisci le tue credenziali
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium text-center">
            {error}
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
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="es. costantino"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition active:scale-98 mt-2"
          >
            <span>Accedi al Sistema</span>
            <ArrowRight className="w-4 h-4" />
          </button>

        </form>

        {/* Quick Demo Access Helpers */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
            Accesso Rapido Account Demo
          </p>
          <div className="grid grid-cols-1 gap-2">
            {users.map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleQuickLogin(u)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-left transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${
                    u.role === 'admin' ? 'bg-amber-500/10 text-amber-400' :
                    u.role === 'tecnico' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {u.role === 'admin' ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">{u.name}</div>
                    <div className="text-[10px] text-slate-400">User: <code className="text-slate-300 font-mono">{u.username}</code> | Pass: <code className="text-slate-300 font-mono">{u.password}</code></div>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  u.role === 'admin' ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' :
                  u.role === 'tecnico' ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                }`}>
                  {u.role.toUpperCase()}
                </span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 text-center mt-3">
            Solo <strong>Costantino (Admin)</strong> può creare nuovi utenti, cambiare password e assegnare progetti.
          </p>
        </div>

      </div>

    </div>
  );
};
