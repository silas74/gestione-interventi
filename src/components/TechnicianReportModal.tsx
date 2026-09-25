import React, { useState } from 'react';
import { X, CheckCircle2, Clock, Wrench, FileDown, AlertCircle, PhoneCall, MessageCircle, Share2, Tag } from 'lucide-react';
import { InterventionRequest, TechnicianReport } from '../types';
import { downloadInterventionPDF, getInterventionPDFDataUri, shareInterventionPDFViaWhatsApp } from '../lib/pdfGenerator';
import { SignaturePad } from './SignaturePad';
import { getTelUri, getClientWhatsAppUri } from '../lib/contactUtils';
import { COMMON_MATERIALS } from '../lib/materialsData';

interface TechnicianReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  intervention: InterventionRequest | null;
  onSaveReport: (interventionId: string, report: TechnicianReport) => void;
  currentTechnicianName: string;
}

export const TechnicianReportModal: React.FC<TechnicianReportModalProps> = ({
  isOpen,
  onClose,
  intervention,
  onSaveReport,
  currentTechnicianName,
}) => {
  if (!isOpen || !intervention) return null;

  const existingReport = intervention.report;

  const [technicianName, setTechnicianName] = useState(
    existingReport?.technicianName || currentTechnicianName || 'Costantino'
  );
  const [interventionDate, setInterventionDate] = useState(
    existingReport?.interventionDate || new Date().toISOString().split('T')[0]
  );
  const [hoursWorked, setHoursWorked] = useState<number>(
    existingReport?.hoursWorked ?? 2
  );
  const [workDone, setWorkDone] = useState(
    existingReport?.workDone || ''
  );
  const [materialsUsed, setMaterialsUsed] = useState(
    existingReport?.materialsUsed || ''
  );
  const [technicalNotes, setTechnicalNotes] = useState(
    existingReport?.technicalNotes || ''
  );
  const [statusOutcome, setStatusOutcome] = useState<'resolved' | 'partial' | 'waiting_for_parts'>(
    (existingReport?.statusOutcome as any) === 'risolto' ? 'resolved' :
    (existingReport?.statusOutcome as any) === 'parziale' ? 'partial' :
    (existingReport?.statusOutcome as any) === 'in_attesa_ricambi' ? 'waiting_for_parts' :
    (existingReport?.statusOutcome as any) || 'resolved'
  );
  const [technicianSignature, setTechnicianSignature] = useState<string>(
    existingReport?.technicianSignature || ''
  );

  const handlePreviewPDF = () => {
    const tempReport: TechnicianReport = {
      technicianName,
      interventionDate,
      hoursWorked: Number(hoursWorked),
      workDone: workDone.trim() || 'On-site technical inspection, testing and maintenance performed.',
      materialsUsed: materialsUsed.trim(),
      technicalNotes: technicalNotes.trim(),
      statusOutcome,
      technicianSignature,
      completedAt: new Date().toISOString(),
    };

    const tempIntervention: InterventionRequest = {
      ...intervention,
      status: 'completed',
      assignedTechnician: technicianName,
      report: tempReport
    };

    downloadInterventionPDF(tempIntervention);
  };

  const handleShareWhatsAppPDF = async () => {
    const tempReport: TechnicianReport = {
      technicianName,
      interventionDate,
      hoursWorked: Number(hoursWorked),
      workDone: workDone.trim() || 'On-site technical inspection, testing and maintenance performed.',
      materialsUsed: materialsUsed.trim(),
      technicalNotes: technicalNotes.trim(),
      statusOutcome,
      technicianSignature,
      completedAt: new Date().toISOString(),
    };

    const tempIntervention: InterventionRequest = {
      ...intervention,
      status: 'completed',
      assignedTechnician: technicianName,
      report: tempReport
    };

    await shareInterventionPDFViaWhatsApp(tempIntervention);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!workDone.trim()) {
      alert('Please enter a description of the work performed on-site.');
      return;
    }

    const report: TechnicianReport = {
      technicianName,
      interventionDate,
      hoursWorked: Number(hoursWorked),
      workDone: workDone.trim(),
      materialsUsed: materialsUsed.trim(),
      technicalNotes: technicalNotes.trim(),
      statusOutcome,
      technicianSignature,
      completedAt: new Date().toISOString(),
    };

    // Attach PDF Data URI
    try {
      const tempIntervention: InterventionRequest = {
        ...intervention,
        status: 'completed',
        assignedTechnician: technicianName,
        report
      };
      report.pdfDataUri = getInterventionPDFDataUri(tempIntervention);
    } catch (err) {
      console.warn('PDF data URI generation skipped', err);
    }

    onSaveReport(intervention.id, report);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[94vh] sm:max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Technical Execution Report</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-700/50">
                  {intervention.code}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Site: {intervention.siteName} — Client: {intervention.clientName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Problem Reminder Callout with Quick Call & WhatsApp */}
        <div className="bg-slate-950/80 px-4 sm:px-6 py-2.5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Reported Issue / Task: </span>
              <span>{intervention.title} — {intervention.description}</span>
            </div>
          </div>

          {intervention.clientContact && (
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
              {getTelUri(intervention.clientContact) && (
                <a
                  href={getTelUri(intervention.clientContact)!}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/35 text-blue-300 border border-blue-500/35 text-[11px] font-semibold transition active:scale-95 shadow-sm"
                  title={`Call client ${intervention.clientName}`}
                >
                  <PhoneCall className="w-3 h-3 text-blue-400" />
                  <span>Call Client</span>
                </a>
              )}
              <a
                href={getClientWhatsAppUri(intervention)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold transition active:scale-95 shadow-sm"
                title={`WhatsApp client ${intervention.clientName}`}
              >
                <MessageCircle className="w-3 h-3 text-emerald-400" />
                <span>WhatsApp</span>
              </a>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* Technician, Date & Hours Worked */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/50 p-3 sm:p-3.5 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Technician Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Execution Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={interventionDate}
                onChange={(e) => setInterventionDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Hours Worked <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                required
                value={hoursWorked}
                onChange={(e) => setHoursWorked(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Work Done Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Detailed Description of Work Performed <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={workDone}
              onChange={(e) => setWorkDone(e.target.value)}
              placeholder="Specify the exact technical work carried out: inspections, component replacement, calibrations, functional tests..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
            />
          </div>

          {/* Replaced Parts and Materials with Quick-Pick Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">
                Replaced Parts & Materials Used (optional)
              </label>
              <span className="text-[10px] text-slate-400">Tap below to add common items</span>
            </div>

            {/* Quick Pick Chips */}
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5 mb-2 text-[11px] text-blue-400 font-semibold">
                <Tag className="w-3.5 h-3.5" />
                <span>Quick-Pick Common Spare Parts (Click to add):</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {COMMON_MATERIALS.map((mat) => (
                  <button
                    key={mat.id}
                    type="button"
                    onClick={() => {
                      setMaterialsUsed(prev => {
                        const trimmed = prev.trim();
                        if (!trimmed) return `1x ${mat.name}`;
                        if (trimmed.includes(mat.name)) return trimmed;
                        return `${trimmed}, 1x ${mat.name}`;
                      });
                    }}
                    className="px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-blue-600/30 text-slate-300 hover:text-blue-300 border border-slate-700/60 transition active:scale-95 flex items-center gap-1.5"
                    title={`Add ${mat.name}`}
                  >
                    <span className="text-blue-400 font-bold">+</span>
                    <span>{mat.name}</span>
                    <span className="text-[9px] px-1 rounded bg-slate-900 text-slate-400 font-mono">
                      {mat.category}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={materialsUsed}
              onChange={(e) => setMaterialsUsed(e.target.value)}
              placeholder="e.g. 1x KNX 640mA Power Supply, 2x Relay modules 24V, 10m bus cable..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Technical Recommendations */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Technical Recommendations for Client
            </label>
            <textarea
              rows={2}
              value={technicalNotes}
              onChange={(e) => setTechnicalNotes(e.target.value)}
              placeholder="e.g. System operating within nominal limits. Recommended follow-up inspection in 6 months..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
            />
          </div>

          {/* Outcome Status */}
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Intervention Outcome
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatusOutcome('resolved')}
                className={`p-2 rounded-lg text-xs font-semibold border transition text-center ${
                  statusOutcome === 'resolved'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                Resolved
              </button>
              <button
                type="button"
                onClick={() => setStatusOutcome('partial')}
                className={`p-2 rounded-lg text-xs font-semibold border transition text-center ${
                  statusOutcome === 'partial'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                Partially Complete
              </button>
              <button
                type="button"
                onClick={() => setStatusOutcome('waiting_for_parts')}
                className={`p-2 rounded-lg text-xs font-semibold border transition text-center ${
                  statusOutcome === 'waiting_for_parts'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                Waiting for Parts
              </button>
            </div>
          </div>

          {/* ✍️ DIGITAL SIGNATURE ON SCREEN (Touch / Penna) */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <SignaturePad
              label="Technician Digital Signature (Sign on screen)"
              initialSignature={technicianSignature}
              onChange={setTechnicianSignature}
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3.5 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePreviewPDF}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
                title="Generate and download PDF preview with your signature"
              >
                <FileDown className="w-4 h-4 text-blue-400" />
                <span>PDF Preview</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsAppPDF}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 transition active:scale-95"
                title="Share PDF report directly on WhatsApp"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>Share PDF (WhatsApp)</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-[2] sm:flex-none flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 sm:py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/25 active:scale-95 text-center"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save & Complete Ticket</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
