import React, { useState } from 'react';
import { X, Upload, Trash2, Calendar, Clock, AlertTriangle, Building2, User, Phone, FileText } from 'lucide-react';
import { InterventionRequest, InterventionPriority, DefectPhoto } from '../types';
import { generateNextCode } from '../lib/storage';

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newReq: InterventionRequest) => void;
  currentUserName: string;
  existingInterventions: InterventionRequest[];
}

export const NewRequestModal: React.FC<NewRequestModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentUserName,
  existingInterventions,
}) => {
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState(currentUserName || 'Mario Rossi');
  const [clientContact, setClientContact] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [description, setDescription] = useState('');
  const [desiredAccessDate, setDesiredAccessDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [desiredAccessTime, setDesiredAccessTime] = useState('09:00');
  const [priority, setPriority] = useState<InterventionPriority>('media');
  const [notes, setNotes] = useState('');
  const [defectPhotos, setDefectPhotos] = useState<DefectPhoto[]>([]);
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  // Handle image files selection and convert to Base64 data urls
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);

    const files = Array.from(e.target.files);
    let processed = 0;
    const newPhotos: DefectPhoto[] = [];

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newPhotos.push({
            id: 'photo_' + Math.random().toString(36).substring(2, 9),
            url: event.target.result as string,
            name: file.name,
            uploadedAt: new Date().toISOString()
          });
        }
        processed++;
        if (processed === files.length) {
          setDefectPhotos(prev => [...prev, ...newPhotos]);
          setUploading(false);
        }
      };
      reader.onerror = () => {
        processed++;
        if (processed === files.length) setUploading(false);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (id: string) => {
    setDefectPhotos(prev => prev.filter(p => p.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientName.trim() || !siteName.trim() || !description.trim()) {
      alert('Per favore compila tutti i campi obbligatori contrassegnati con *');
      return;
    }

    const newIntervention: InterventionRequest = {
      id: 'int_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      code: generateNextCode(existingInterventions),
      title: title.trim(),
      siteName: siteName.trim(),
      siteAddress: siteAddress.trim(),
      clientName: clientName.trim(),
      clientContact: clientContact.trim(),
      description: description.trim(),
      desiredAccessDate,
      desiredAccessTime,
      priority,
      defectPhotos,
      notes: notes.trim(),
      status: 'in_attesa',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSubmit(newIntervention);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Nuova Richiesta di Intervento</h3>
              <p className="text-xs text-slate-400">Inserisci i dettagli del guasto, data/ora di accesso e foto</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Titolo Guasto / Oggetto */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Oggetto / Titolo Guasto <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="es. Allarme termico compressore linea 2 / Sostituzione pompa"
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sede & Indirizzo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                Sede / Stabilimento <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="es. Magazzino Centrale / Stabilimento A"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Indirizzo Completo
              </label>
              <input
                type="text"
                value={siteAddress}
                onChange={(e) => setSiteAddress(e.target.value)}
                placeholder="Via, Civico, Città"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Richiedente & Contatto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                Nome Richiedente / Referente <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Recapito Telefonico / Email
              </label>
              <input
                type="text"
                value={clientContact}
                onChange={(e) => setClientContact(e.target.value)}
                placeholder="es. +39 039 123456"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Descrizione guasto / Spiegazione */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Spiegazione Dettagliata del Problema / Cosa Serve <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrivi cosa sta accadendo, sintomi dell'anomalia, codice errore a display o cosa serve ripristinare..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Data & Ora Accesso Desiderata + Priorità */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                Data Accesso Desiderata <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={desiredAccessDate}
                onChange={(e) => setDesiredAccessDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Ora Desiderata
              </label>
              <input
                type="time"
                value={desiredAccessTime}
                onChange={(e) => setDesiredAccessTime(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Priorità Intervento
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as InterventionPriority)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="bassa">Bassa (Ordinaria)</option>
                <option value="media">Media (Standard)</option>
                <option value="alta">Alta (Impianto rallentato)</option>
                <option value="urgente">Urgente (Fermo Impianto)</option>
              </select>
            </div>
          </div>

          {/* Caricamento Foto del Difetto */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Immagini / Foto del Difetto (opzionale ma consigliato)
            </label>
            <div className="border-2 border-dashed border-slate-700 hover:border-blue-500/70 rounded-xl p-4 text-center transition bg-slate-800/40">
              <input
                type="file"
                multiple
                accept="image/*"
                id="photo-upload"
                className="hidden"
                onChange={handleFileChange}
              />
              <label
                htmlFor="photo-upload"
                className="cursor-pointer flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-white"
              >
                <Upload className="w-6 h-6 text-blue-400" />
                <span className="text-xs font-medium">
                  {uploading ? 'Caricamento immagini...' : 'Clicca per selezionare o scattare foto del guasto'}
                </span>
                <span className="text-[10px] text-slate-500">Formati supportati: JPG, PNG, WEBP</span>
              </label>
            </div>

            {/* Photos Preview Grid */}
            {defectPhotos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mt-3">
                {defectPhotos.map((photo) => (
                  <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-800 aspect-square">
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(photo.id)}
                      className="absolute top-1 right-1 p-1 rounded-md bg-rose-600/90 text-white opacity-0 group-hover:opacity-100 transition shadow"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-slate-300 px-1 py-0.5 truncate text-center">
                      {photo.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Note speciali / Istruzioni */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Note Varie per il Tecnico (DPI, citofoni, persona da contattare)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="es. Chiedere del Sig. Mario in portineria. Scarpe e casco obbligatori."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow-lg shadow-blue-600/25 active:scale-95"
            >
              Invia Richiesta Intervento
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
