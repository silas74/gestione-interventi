import React from 'react';
import { X, Download, Smartphone, WifiOff, CheckCircle2, Share2, PlusSquare } from 'lucide-react';
import { canInstallPwa, promptPwaInstall, isIOSSafari } from '../lib/pwa';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstalledSuccess?: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  onInstalledSuccess
}) => {
  if (!isOpen) return null;

  const canInstall = canInstallPwa();
  const isIOS = isIOSSafari();

  const handleInstallClick = async () => {
    const success = await promptPwaInstall();
    if (success) {
      if (onInstalledSuccess) onInstalledSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative text-left">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with App 3D Logo */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-blue-500/40 shadow-lg shadow-blue-500/20 shrink-0">
            <img src="./logo-3d.png" alt="App Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
              Install on Home Screen
            </h3>
            <p className="text-xs text-blue-400 font-medium">
              Progressive Web App (PWA) Offline-Ready
            </p>
          </div>
        </div>

        {/* Benefits list */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 mb-5 space-y-2.5 text-xs text-slate-300">
          <div className="flex items-start gap-2.5">
            <div className="p-1 rounded bg-blue-500/15 text-blue-400 shrink-0 mt-0.5">
              <Smartphone className="w-3.5 h-3.5" />
            </div>
            <div>
              <strong className="text-white block font-semibold">1-Tap Screen Launch</strong>
              Opens directly in standalone full screen without browser URL bars or tabs.
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="p-1 rounded bg-emerald-500/15 text-emerald-400 shrink-0 mt-0.5">
              <WifiOff className="w-3.5 h-3.5" />
            </div>
            <div>
              <strong className="text-white block font-semibold">Full Offline Capability</strong>
              Works in underground basements, plant rooms, and remote sites with zero cell service.
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="p-1 rounded bg-purple-500/15 text-purple-400 shrink-0 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <strong className="text-white block font-semibold">Instant Local Storage Sync</strong>
              Fill reports, collect on-screen digital signatures, and export PDFs anytime.
            </div>
          </div>
        </div>

        {/* Installation Instructions for iOS vs Direct One-Click Install for Android/Chrome */}
        {isIOS ? (
          <div className="bg-blue-950/30 border border-blue-800/50 rounded-xl p-3.5 mb-4 text-xs text-blue-200 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-blue-300">
              <Share2 className="w-4 h-4" />
              <span>How to install on iPhone & iPad (Safari):</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1 leading-relaxed">
              <li>Tap the <strong className="text-white font-semibold">Share button</strong> (square with arrow icon) at the bottom of Safari.</li>
              <li>Scroll down and tap <strong className="text-white font-semibold">"Add to Home Screen"</strong> (<PlusSquare className="w-3 h-3 inline text-blue-400" />).</li>
              <li>Tap <strong className="text-white font-semibold">Add</strong> in top right corner.</li>
            </ol>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            {isIOS ? 'Got it' : 'Later'}
          </button>

          {canInstall && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition shadow-lg shadow-blue-600/30 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Install App Now</span>
            </button>
          )}

          {!canInstall && !isIOS && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-700/60"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Already Installed or Ready</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
