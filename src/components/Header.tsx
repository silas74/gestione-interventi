import React from 'react';
import { 
  Shield, User, PlusCircle, LogOut, Users, FolderKanban, 
  FileSpreadsheet, Download, Smartphone, Wifi, WifiOff, Database, Mail 
} from 'lucide-react';
import { UserAccount } from '../types';

interface HeaderProps {
  currentUser: UserAccount;
  onOpenNewModal: () => void;
  onOpenAdminModal: () => void;
  onOpenProjectsModal: () => void;
  onExportExcel: () => void;
  onLogout: () => void;
  isOnline: boolean;
  onOpenInstallModal?: () => void;
  onOpenBackupModal?: () => void;
  onOpenSmartEmailModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenNewModal,
  onOpenAdminModal,
  onOpenProjectsModal,
  onExportExcel,
  onLogout,
  isOnline,
  onOpenInstallModal,
  onOpenBackupModal,
  onOpenSmartEmailModal
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
                  PWA Ready
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate hidden xs:block">
                Project Tracking, Hours & PDF Reports
              </p>
            </div>
          </div>

          {/* Quick sync & Logout button on mobile */}
          <div className="flex items-center gap-1.5 sm:hidden shrink-0">
            {onOpenInstallModal && (
              <button
                onClick={onOpenInstallModal}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[11px] font-semibold active:scale-95"
                title="Install app on mobile screen"
              >
                <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                <span>Install</span>
              </button>
            )}

            {onOpenBackupModal && (
              <button
                onClick={onOpenBackupModal}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 active:scale-95"
                title="Backup & Restore System Data (JSON)"
              >
                <Database className="w-3.5 h-3.5 text-blue-400" />
              </button>
            )}

            {onOpenSmartEmailModal && (
              <button
                onClick={onOpenSmartEmailModal}
                className="p-1.5 rounded-lg bg-blue-600/25 text-blue-300 hover:text-white border border-blue-500/40 active:scale-95"
                title="Smart Inbound Email Assistant"
              >
                <Mail className="w-3.5 h-3.5 text-blue-400" />
              </button>
            )}

            <div className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border ${
              isOnline 
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                : 'text-amber-400 bg-amber-500/20 border-amber-500/40'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
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

          {/* Online / Offline status badge (Tablet & Desktop) */}
          <div className={`hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border shrink-0 ${
            isOnline 
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' 
              : 'bg-amber-950/50 text-amber-300 border-amber-700/60'
          }`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
            <span className="text-[11px] font-semibold">{isOnline ? 'Online' : 'Offline Mode'}</span>
          </div>

          {/* PWA Install Button */}
          {onOpenInstallModal && (
            <button
              onClick={onOpenInstallModal}
              className="flex items-center gap-1.5 bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 border border-blue-500/40 text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl transition active:scale-95 shadow-sm shrink-0"
              title="Install App on Screen (PWA)"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px] sm:text-xs">Install App</span>
            </button>
          )}

          {/* Backup & Restore (JSON) */}
          {onOpenBackupModal && (
            <button
              onClick={onOpenBackupModal}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl transition active:scale-95 shadow-sm shrink-0"
              title="Backup & Restore System Data (JSON)"
            >
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px] sm:text-xs">Backup JSON</span>
            </button>
          )}

          {/* Smart Inbound Email Assistant */}
          {onOpenSmartEmailModal && (
            <button
              onClick={onOpenSmartEmailModal}
              className="flex items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl transition active:scale-95 shadow-sm shrink-0"
              title="Smart Inbound Email: crea ticket, follow-up o chiusura automatica"
            >
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px] sm:text-xs">Smart Email</span>
            </button>
          )}

          {/* Export Hours & Reports to Excel */}
          <button
            onClick={onExportExcel}
            className="flex items-center gap-1.5 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border border-emerald-500/40 text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl transition active:scale-95 shadow-sm shrink-0"
            title="Export Service Hours & Reports to Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] sm:text-xs">Export Hours</span>
          </button>

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
