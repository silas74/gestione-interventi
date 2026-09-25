import React from 'react';
import { Wrench, Shield, User, PlusCircle, LogOut, Users, FolderKanban } from 'lucide-react';
import { UserAccount } from '../types';

interface HeaderProps {
  currentUser: UserAccount;
  onOpenNewModal: () => void;
  onOpenAdminModal: () => void;
  onOpenProjectsModal: () => void;
  onLogout: () => void;
  isOnline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenNewModal,
  onOpenAdminModal,
  onOpenProjectsModal,
  onLogout,
  isOnline
}) => {
  const isAdmin = currentUser.role === 'admin';

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 lg:px-8 py-3.5 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Logo & Brand */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden shadow-lg shadow-blue-500/25 border border-slate-700/80 shrink-0">
              <img src="./logo-3d.png" alt="Logo Interventi 3D" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">GESTIONE INTERVENTI</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  On-Site
                </span>
              </div>
              <p className="text-xs text-slate-400">Classificazione Progetti, Ore Lavorate & Rapporti PDF</p>
            </div>
          </div>

          {/* Sync indicator (mobile) */}
          <div className="md:hidden flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>

        {/* User bar & Actions */}
        <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto justify-end">
          
          {/* User profile pill */}
          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-xl">
            <div className={`p-1 rounded-lg ${
              isAdmin ? 'bg-amber-500/20 text-amber-300' :
              currentUser.role === 'tecnico' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'
            }`}>
              {isAdmin ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{currentUser.name}</span>
                <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono ${
                  isAdmin ? 'bg-amber-400 text-slate-950 font-extrabold' :
                  currentUser.role === 'tecnico' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-700 text-slate-200'
                }`}>
                  {currentUser.role}
                </span>
              </div>
            </div>
          </div>

          {/* ADMIN ONLY: Gestione Utenti & Privilegi */}
          {isAdmin && (
            <button
              onClick={onOpenAdminModal}
              className="flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-semibold px-3 py-2 rounded-xl transition active:scale-95 shadow-sm"
              title="Gestisci utenti, modifica privilegi, assegna password e progetti (Solo Costantino)"
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Utenti & Privilegi</span>
            </button>
          )}

          {/* ADMIN ONLY: Gestione Progetti */}
          {isAdmin && (
            <button
              onClick={onOpenProjectsModal}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition active:scale-95 shadow-sm"
              title="Aggiungi o modifica progetti"
            >
              <FolderKanban className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">Progetti</span>
            </button>
          )}

          {/* Nuova Richiesta Ticket */}
          <button
            onClick={onOpenNewModal}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-md transition active:scale-95 whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nuovo Ticket</span>
          </button>

          {/* Logout button */}
          <button
            onClick={onLogout}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700 transition"
            title="Disconnetti account"
          >
            <LogOut className="w-4 h-4" />
          </button>

        </div>

      </div>
    </header>
  );
};
