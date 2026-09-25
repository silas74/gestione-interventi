import React, { useState } from 'react';
import { X, MessageSquare, Star, CheckCircle, AlertCircle, FileDown, ThumbsUp } from 'lucide-react';
import { InterventionRequest, ClientFeedback } from '../types';
import { downloadInterventionPDF } from '../lib/pdfGenerator';
import { SignaturePad } from './SignaturePad';

interface ClientFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  intervention: InterventionRequest | null;
  onSaveFeedback: (interventionId: string, feedback: ClientFeedback) => void;
  currentClientName: string;
}

export const ClientFeedbackModal: React.FC<ClientFeedbackModalProps> = ({
  isOpen,
  onClose,
  intervention,
  onSaveFeedback,
  currentClientName,
}) => {
  if (!isOpen || !intervention) return null;

  const existingFeedback = intervention.clientFeedback;

  const [clientName, setClientName] = useState(
    existingFeedback?.clientName || currentClientName || intervention.clientName
  );
  const [feedbackStatus, setFeedbackStatus] = useState<'approved' | 'revision_requested' | 'disputed'>(
    (existingFeedback?.feedbackStatus as any) === 'approvato' ? 'approved' :
    (existingFeedback?.feedbackStatus as any) === 'richiesta_revisione' ? 'revision_requested' :
    (existingFeedback?.feedbackStatus as any) === 'contestato' ? 'disputed' :
    (existingFeedback?.feedbackStatus as any) || 'approved'
  );
  const [rating, setRating] = useState<number>(existingFeedback?.rating || 5);
  const [notes, setNotes] = useState(existingFeedback?.notes || '');
  const [clientSignature, setClientSignature] = useState<string>(
    existingFeedback?.clientSignature || ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      alert('Please enter a brief comment or feedback on the completed work.');
      return;
    }

    const feedback: ClientFeedback = {
      clientName: clientName.trim(),
      submittedAt: new Date().toISOString(),
      feedbackStatus,
      rating,
      notes: notes.trim(),
      clientSignature,
    };

    onSaveFeedback(intervention.id, feedback);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[94vh] sm:max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Client Acceptance & Feedback</h3>
              <p className="text-xs text-slate-400">Review completed work, rate service and sign for acceptance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Technician Work Summary & PDF Download */}
        <div className="bg-slate-950 p-3.5 sm:p-4 border-b border-slate-800 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-white">Work Performed by: </span>
              {intervention.report?.technicianName || intervention.assignedTechnician || 'Technician'} (
              {intervention.report?.hoursWorked} hrs worked)
            </div>
            <button
              type="button"
              onClick={() => downloadInterventionPDF(intervention)}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 transition self-start sm:self-center"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Download PDF Report</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
            {intervention.report?.workDone || 'On-site technical service completed.'}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* Reviewer Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Client Signer / Representative Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Acceptance Outcome Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Acceptance Status <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFeedbackStatus('approved')}
                className={`p-2.5 rounded-lg text-xs font-semibold border transition text-center flex flex-col items-center gap-1 ${
                  feedbackStatus === 'approved'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>Approved</span>
              </button>

              <button
                type="button"
                onClick={() => setFeedbackStatus('revision_requested')}
                className={`p-2.5 rounded-lg text-xs font-semibold border transition text-center flex flex-col items-center gap-1 ${
                  feedbackStatus === 'revision_requested'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <AlertCircle className="w-4 h-4" />
                <span>Needs Follow-up</span>
              </button>

              <button
                type="button"
                onClick={() => setFeedbackStatus('disputed')}
                className={`p-2.5 rounded-lg text-xs font-semibold border transition text-center flex flex-col items-center gap-1 ${
                  feedbackStatus === 'disputed'
                    ? 'bg-rose-600/20 border-rose-500 text-rose-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <X className="w-4 h-4" />
                <span>Disputed</span>
              </button>
            </div>
          </div>

          {/* Star Rating */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Service Rating
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 text-slate-600 hover:scale-110 transition"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs text-slate-400 ml-2">
                {rating === 5 && 'Excellent'}
                {rating === 4 && 'Very Good'}
                {rating === 3 && 'Satisfactory'}
                {rating === 2 && 'Needs Improvement'}
                {rating === 1 && 'Poor'}
              </span>
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Client Feedback Comments <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. System tested and fully functional. Very satisfied with the prompt on-site resolution..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none leading-relaxed"
            />
          </div>

          {/* ✍️ CLIENT DIGITAL SIGNATURE */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <SignaturePad
              label="Client Acceptance Signature (Sign on screen)"
              initialSignature={clientSignature}
              onChange={setClientSignature}
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/25 active:scale-95"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Submit Feedback & Acceptance</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
