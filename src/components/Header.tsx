import React from 'react';
import { Wrench, Shield, User, PlusCircle, CheckCircle2 } from 'lucide-react';
import { AppRole } from '../types';

interface HeaderProps {
  currentRole: AppRole;
  currentUserName: string;
  onRoleChange: (role: AppRole, name: string) => void;
  onOpenNewModal: () => void;
  isOnline: boolean;
}

const PRESET_USERS = [
  { name: 'Costantino', role: 'tecnico' as AppRole, label: 'Costantino (Tecnico)' },
  { name: 'Franco', role: 'tecnico' as AppRole, label: 'Franco (Tecnico)' },
  { name: 'Mario Rossi', role: 'richiedente' as AppRole, label: 'Mario Rossi (Cliente / Resp. Prod.)' },
  { name: 'Franco Magazzino', role: 'richiedente' as AppRole, label: 'Franco Magazzino (Cliente)' },
  { name: 'Dott.ssa Bianchi', role: 'richiedente' as AppRole, label: 'Dott.ssa Bianchi (Cliente QA)' }
];

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  currentUserName,
  onRoleChange,
  onOpenNewModal,
  isOnline
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 lg:px-8 py-3.5 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Logo & Brand */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">INTERVENTI TECH</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  On-Site
                </span>
              </div>
              <p className="text-xs text-slate-400">Tracciamento Lavori, Ore & Rapporti PDF</p>
            </div>
          </div>

          {/* Sync indicator (mobile) */}
          <div className="sm:hidden flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{isOnline ? 'Sync Attivo' : 'Offline'}</span>
          </div>
        </div>

        {/* User Role Switcher & New Ticket Action */}
        <div className="flex items-center flex-wrap gap-2.5 w-full sm:w-auto justify-end">
          
          {/* Sync indicator (desktop) */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{isOnline ? 'Cloud Sync Attivo' : 'Locale'}</span>
          </div>

          {/* Role selector dropdown */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-1">
            <button
              onClick={() => onRoleChange('tecnico', currentRole === 'tecnico' ? currentUserName : 'Costantino')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                currentRole === 'tecnico'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Tecnico</span>
            </button>
            <button
              onClick={() => onRoleChange('richiedente', currentRole === 'richiedente' ? currentUserName : 'Mario Rossi')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                currentRole === 'richiedente'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Richiedente</span>
            </button>
          </div>

          {/* User selector */}
          <select
            value={currentUserName}
            onChange={(e) => {
              const selected = PRESET_USERS.find(u => u.name === e.target.value);
              if (selected) {
                onRoleChange(selected.role, selected.name);
              }
            }}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {PRESET_USERS.map((u) => (
              <option key={u.name} value={u.name}>
                {u.label}
              </option>
            ))}
          </select>

          {/* New Request Button */}
          <button
            onClick={onOpenNewModal}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-md transition active:scale-95 whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nuova Richiesta</span>
          </button>

        </div>

      </div>
    </header>
  );
};
