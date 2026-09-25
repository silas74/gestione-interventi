import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';
import { DefectPhoto } from '../types';

interface ImagePreviewModalProps {
  photo: DefectPhoto | null;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ photo, onClose }) => {
  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/70">
          <div>
            <h4 className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
              {photo.name || 'Foto difetto riscontrato'}
            </h4>
            <p className="text-[11px] text-slate-400">
              Caricata il {new Date(photo.uploadedAt).toLocaleString('it-IT')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={photo.url}
              download={photo.name || 'foto_guasto.jpg'}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Scarica foto"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Content */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950">
          <img
            src={photo.url}
            alt={photo.name}
            className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
          />
        </div>

      </div>
    </div>
  );
};
