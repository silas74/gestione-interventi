import React from 'react';
import {
  Shield,
  User,
  PlusCircle,
  LogOut,
  Users,
  FolderKanban,
  FileSpreadsheet,
  Download,
  Smartphone,
  Wifi,
  WifiOff,
  Database,
  Mail,
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
  onOpenSmartEmailModal,
}) => {
  const isAdmin = currentUser.role === 'admin';

  const formatRoleLabel = (role: string) => {
    if (role === 'admin') return 'Amministratore';
    if (role === 'technician' || role === 'tecnico') return 'Tecnico';
    return 'Utente';
  };

  return (
    <header className="sticky top-0 z-30 bg-zinc-950 border-b border-zinc-800 px-4 sm:px-6 lg:px-8 py-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Top Row: Brand & Mobile Quick Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 shrink-0">
              <img src="./logo-3d.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-base font-semibold text-zinc-100 truncate">
                  Gestione interventi
                </h1>
                <span className="font-mono text-xs font-normal px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 shrink-0">
                  Sistema tecnico
                </span>
              </div>
              <p className="text-xs font-normal text-zinc-400 truncate hidden xs:block">
                Monitoraggio progetti, ore lavorate e report
              </p>
            </div>
          </div>

          {/* Mobile Quick Actions */}
          <div className="flex items-center gap-2 sm:hidden shrink-0">
            {onOpenInstallModal && (
              <button
                onClick={onOpenInstallModal}
                className="flex items-center gap-2 px-2 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-normal"
                title="Installa applicazione"
              >
                <Smartphone className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                <span>Installa</span>
              </button>
            )}

            {onOpenBackupModal && (
              <button
                onClick={onOpenBackupModal}
                className="p-2 rounded-lg bg-zinc-900 text-zinc-300 hover:text-zinc-100 border border-zinc-800"
                title="Backup dati"
              >
                <Database className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              </button>
            )}

            {onOpenSmartEmailModal && (
              <button
                onClick={onOpenSmartEmailModal}
                className="p-2 rounded-lg bg-zinc-900 text-zinc-300 hover:text-zinc-100 border border-zinc-800"
                title="Importa da email"
              >
                <Mail className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              </button>
            )}

            <div className="flex items-center gap-2 text-xs px-2 py-2 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              ) : (
                <WifiOff className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              )}
              <span>{isOnline ? 'Connesso' : 'Locale'}</span>
            </div>

            <button
              onClick={onLogout}
              className="p-2 rounded-lg bg-zinc-900 text-zinc-400 hover:text-zinc-100 border border-zinc-800"
              title="Esci"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-2 overflow-x-auto scrollbar-none">
          {/* User profile */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg shrink-0">
            {isAdmin ? (
              <Shield className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
            ) : (
              <User className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
            )}
            <div className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
              <span className="truncate max-w-[100px] sm:max-w-none">{currentUser.name}</span>
              <span className="text-xs font-normal text-zinc-400">
                · {formatRoleLabel(currentUser.role)}
              </span>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={onOpenAdminModal}
              className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-normal px-4 py-2 rounded-lg transition shrink-0"
              title="Gestione utenti e permessi"
            >
              <Users className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              <span>Utenti</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={onOpenProjectsModal}
              className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-normal px-4 py-2 rounded-lg transition shrink-0"
              title="Gestione progetti"
            >
              <FolderKanban className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              <span>Progetti</span>
            </button>
          )}

          <div className="hidden md:flex items-center gap-2 text-xs px-4 py-2 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800 shrink-0">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
            ) : (
              <WifiOff className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
            )}
            <span className="font-normal">{isOnline ? 'Connesso' : 'Modalità locale'}</span>
          </div>

          {onOpenInstallModal && (
            <button
              onClick={onOpenInstallModal}
              className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-normal px-4 py-2 rounded-lg transition shrink-0"
              title="Installa applicazione"
            >
              <Download className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              <span>Installa</span>
            </button>
          )}

          {onOpenBackupModal && (
            <button
              onClick={onOpenBackupModal}
              className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-normal px-4 py-2 rounded-lg transition shrink-0"
              title="Backup e ripristino dati"
            >
              <Database className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              <span>Archivio dati</span>
            </button>
          )}

          {onOpenSmartEmailModal && (
            <button
              onClick={onOpenSmartEmailModal}
              className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-normal px-4 py-2 rounded-lg transition shrink-0"
              title="Importa aggiornamenti da email"
            >
              <Mail className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              <span>Email</span>
            </button>
          )}

          <button
            onClick={onExportExcel}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-normal px-4 py-2 rounded-lg transition shrink-0"
            title="Esporta ore e report"
          >
            <FileSpreadsheet className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
            <span>Esporta ore</span>
          </button>

          <button
            onClick={onOpenNewModal}
            className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-semibold px-4 py-2 rounded-lg transition whitespace-nowrap shrink-0"
          >
            <PlusCircle className="w-4 h-4" strokeWidth={1.75} />
            <span>Nuovo intervento</span>
          </button>

          <button
            onClick={onLogout}
            className="hidden sm:flex p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-800 transition shrink-0"
            title="Esci dall'account"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </header>
  );
};
