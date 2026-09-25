import React, { useState, useRef } from 'react';
import { X, Download, Upload, Database, CheckCircle2, AlertTriangle, FileText, Layers, Users } from 'lucide-react';
import { exportBackupToFile, restoreBackupFromJson } from '../lib/storage';
import { InterventionRequest, Project, UserAccount } from '../types';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  interventions: InterventionRequest[];
  projects: Project[];
  users: UserAccount[];
  onDataRestored: (newInterventions: InterventionRequest[], newProjects: Project[], newUsers: UserAccount[]) => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  interventions,
  projects,
  users,
  onDataRestored
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setExportSuccess(null);
    try {
      const res = await exportBackupToFile();
      setExportSuccess(`Backup downloaded: ${res.filename} (${res.sizeKb} KB)`);
    } catch (err: any) {
      alert(`Export failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const confirmed = window.confirm(
        '⚠️ Are you sure you want to restore data from this backup? Existing records will be updated.'
      );
      if (!confirmed) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const result = restoreBackupFromJson(content);
      if (result.success && result.interventions && result.projects) {
        setRestoreStatus({ success: true, message: result.message });
        onDataRestored(
          result.interventions,
          result.projects,
          result.users || users
        );
      } else {
        setRestoreStatus({ success: false, message: result.message });
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative text-left">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
              Backup & Restore System Data
            </h3>
            <p className="text-xs text-slate-400">
              Export complete JSON archive or restore historical records
            </p>
          </div>
        </div>

        {/* Live Data Summary Pills */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-0.5">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Tickets</span>
            </div>
            <div className="text-base font-bold text-white">{interventions.length}</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-0.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Projects</span>
            </div>
            <div className="text-base font-bold text-white">{projects.length}</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-0.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Users</span>
            </div>
            <div className="text-base font-bold text-white">{users.length}</div>
          </div>
        </div>

        {/* SECTION 1: Export Backup */}
        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 mb-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Download className="w-4 h-4 text-blue-400" />
            <span>1. Export Complete Backup (JSON)</span>
          </h4>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            Download a secure, readable `.json` file containing all service tasks, logged hours, signatures, photos, and project records.
          </p>

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition shadow-lg shadow-blue-600/25 active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Generating JSON...' : 'Download Full Backup (.json)'}</span>
          </button>

          {exportSuccess && (
            <div className="mt-2.5 p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-[11px] text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              <span>{exportSuccess}</span>
            </div>
          )}
        </div>

        {/* SECTION 2: Restore from Backup */}
        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>2. Restore Data from Backup</span>
          </h4>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            Upload a previously exported `.json` file to restore or migrate data to this device.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 transition active:scale-95"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Select Backup File to Restore (.json)</span>
          </button>

          {restoreStatus && (
            <div className={`mt-2.5 p-2 rounded-lg border text-[11px] flex items-center gap-1.5 ${
              restoreStatus.success
                ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800/50 text-rose-300'
            }`}>
              {restoreStatus.success ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
              )}
              <span>{restoreStatus.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 mt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
