import React from 'react';
import { Shield, User, PlusCircle, LogOut, Users, FolderKanban } from 'lucide-react';
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
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 lg:px-8 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Top Row: Logo, Brand & Mobile Quick Actions */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl overflow-hidden shadow-lg shadow-blue-500/25 border border-slate-700/80 shrink-0">
              <img src="./logo-3d.png" alt="Logo Interventi 3D" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-white truncate">
                  FIELD SERVICE
                </h1>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                  On-Site
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate hidden xs:block">
                Project Tracking, Hours & PDF Reports
              </p>
            </div>
          </div>

          {/* Quick sync & Logout button on mobile */}
          <div className="flex items-center gap-1.5 sm:hidden shrink-0">
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-300 border border-slate-700 active:scale-95"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Second Row on Mobile / Right side on Tablet & Desktop */}
        <div className="flex items-center justify-between sm:justify-end gap-2 overflow-x-auto scrollbar-none pb-0.5">
          
          {/* User profile pill */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/80 px-2.5 py-1.5 rounded-xl shrink-0">
            <div className={`p-1 rounded-lg ${
              isAdmin ? 'bg-amber-500/20 text-amber-300' :
              (currentUser.role === 'technician' || currentUser.role === 'tecnico') ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'
            }`}>
              {isAdmin ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
            </div>
            <div className="text-left leading-tight">
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <span className="truncate max-w-[90px] sm:max-w-none">{currentUser.name}</span>
                <span className={`text-[8px] uppercase px-1 py-0.2 rounded font-mono ${
                  isAdmin ? 'bg-amber-400 text-slate-950 font-extrabold' :
                  (currentUser.role === 'technician' || currentUser.role === 'tecnico') ? 'bg-blue-600 text-white font-bold' : 'bg-slate-700 text-slate-200'
                }`}>
                  {currentUser.role}
                </span>
              </div>
            </div>
          </div>

          {/* ADMIN ONLY: Users & Permissions */}
          {isAdmin && (
            <button
              onClick={onOpenAdminModal}
              className="flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl transition active:scale-95 shadow-sm shrink-0"
              title="User & Permission Management"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] sm:text-xs">Users</span>
            </button>
          )}

          {/* ADMIN ONLY: Projects */}
          {isAdmin && (
            <button
              onClick={onOpenProjectsModal}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl transition active:scale-95 shadow-sm shrink-0"
              title="Project Management"
            >
              <FolderKanban className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px] sm:text-xs">Projects</span>
            </button>
          )}

          {/* New Request Ticket */}
          <button
            onClick={onOpenNewModal}
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold px-3 py-1.5 sm:py-2 rounded-xl shadow-md transition active:scale-95 whitespace-nowrap shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="text-[11px] sm:text-xs">New Ticket</span>
          </button>

          {/* Logout button (tablet & desktop) */}
          <button
            onClick={onLogout}
            className="hidden sm:flex p-2 rounded-xl bg-slate-800/80 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700 transition active:scale-95 shrink-0"
            title="Log out account"
          >
            <LogOut className="w-4 h-4" />
          </button>

        </div>

      </div>
    </header>
  );
};
