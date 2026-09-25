import React, { useState, useEffect } from 'react';
import { 
  InterventionRequest, AppRole, TechnicianReport, ClientFeedback, DefectPhoto 
} from './types';
import { 
  fetchInterventions, saveIntervention, deleteIntervention 
} from './lib/storage';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { FilterBar } from './components/FilterBar';
import { InterventionCard } from './components/InterventionCard';
import { NewRequestModal } from './components/NewRequestModal';
import { TechnicianReportModal } from './components/TechnicianReportModal';
import { ClientFeedbackModal } from './components/ClientFeedbackModal';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { Wrench, PlusCircle, Inbox, Sparkles, CheckCircle2 } from 'lucide-react';

export function App() {
  const [interventions, setInterventions] = useState<InterventionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<AppRole>('tecnico');
  const [currentUserName, setCurrentUserName] = useState<string>('Costantino');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [onlyUrgent, setOnlyUrgent] = useState(false);

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [reportModalIntervention, setReportModalIntervention] = useState<InterventionRequest | null>(null);
  const [feedbackModalIntervention, setFeedbackModalIntervention] = useState<InterventionRequest | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<DefectPhoto | null>(null);

  // Toast / notification message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchInterventions();
      setInterventions(data);
    } catch (err) {
      console.error('Error fetching interventions', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (role: AppRole, name: string) => {
    setCurrentRole(role);
    setCurrentUserName(name);
  };

  // 1. Create New Intervention
  const handleCreateIntervention = async (newReq: InterventionRequest) => {
    await saveIntervention(newReq);
    setInterventions(prev => [newReq, ...prev]);
    showToast(`Richiesta ${newReq.code} creata con successo!`);
  };

  // 2. Technician takes charge
  const handleTakeCharge = async (id: string, technicianName: string) => {
    const item = interventions.find(i => i.id === id);
    if (!item) return;

    const updated: InterventionRequest = {
      ...item,
      status: 'in_corso',
      assignedTechnician: technicianName,
      updatedAt: new Date().toISOString()
    };

    await saveIntervention(updated);
    setInterventions(prev => prev.map(i => i.id === id ? updated : i));
    showToast(`Intervento ${item.code} preso in carico da ${technicianName}`);
  };

  // 3. Save Technician Report (Completes Intervention & Attaches PDF)
  const handleSaveReport = async (interventionId: string, report: TechnicianReport) => {
    const item = interventions.find(i => i.id === interventionId);
    if (!item) return;

    const updated: InterventionRequest = {
      ...item,
      status: 'completato',
      assignedTechnician: report.technicianName,
      report,
      updatedAt: new Date().toISOString()
    };

    await saveIntervention(updated);
    setInterventions(prev => prev.map(i => i.id === interventionId ? updated : i));
    showToast(`Rapporto tecnico salvato e PDF generato per ${item.code}!`);
  };

  // 4. Save Client Feedback
  const handleSaveFeedback = async (interventionId: string, feedback: ClientFeedback) => {
    const item = interventions.find(i => i.id === interventionId);
    if (!item) return;

    const updated: InterventionRequest = {
      ...item,
      clientFeedback: feedback,
      updatedAt: new Date().toISOString()
    };

    await saveIntervention(updated);
    setInterventions(prev => prev.map(i => i.id === interventionId ? updated : i));
    showToast(`Riscontro del cliente registrato per ${item.code}!`);
  };

  // 5. Delete Intervention
  const handleDelete = async (id: string) => {
    const item = interventions.find(i => i.id === id);
    if (!item) return;
    if (!window.confirm(`Sei sicuro di voler eliminare la richiesta ${item.code}?`)) return;

    await deleteIntervention(id);
    setInterventions(prev => prev.filter(i => i.id !== id));
    showToast(`Intervento eliminato con successo.`);
  };

  // Filtered List Computation
  const filteredInterventions = interventions.filter(item => {
    // Search match
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match = 
        item.code.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.siteName.toLowerCase().includes(q) ||
        item.clientName.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.assignedTechnician && item.assignedTechnician.toLowerCase().includes(q));
      if (!match) return false;
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'in_corso') {
        if (item.status !== 'in_corso' && item.status !== 'programmato') return false;
      } else if (item.status !== statusFilter) {
        return false;
      }
    }

    // Urgent filter
    if (onlyUrgent && item.priority !== 'urgente') {
      return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-blue-600 text-white px-4 py-2.5 rounded-xl shadow-xl border border-blue-400/30 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Main App Header */}
      <Header
        currentRole={currentRole}
        currentUserName={currentUserName}
        onRoleChange={handleRoleChange}
        onOpenNewModal={() => setIsNewModalOpen(true)}
        isOnline={true}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        
        {/* Banner with Active View Context */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 p-4 rounded-2xl border border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-300">
                Accesso attuale: <strong className="text-white">{currentUserName}</strong>
              </span>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${
                currentRole === 'tecnico' 
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {currentRole === 'tecnico' ? 'Vista Tecnico Manutentore' : 'Vista Cliente Richiedente'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {currentRole === 'tecnico'
                ? 'Prendi in carico le richieste di guasto, inserisci ore lavorate e compila il rapporto tecnico in PDF con firma.'
                : 'Invia segnalazioni guasto con foto del difetto, monitora l\'avanzamento e rispondi con il tuo riscontro a lavoro ultimato.'}
            </p>
          </div>

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/25 transition active:scale-95 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nuovo Ticket Intervento</span>
          </button>
        </div>

        {/* Quick KPI Stats Cards */}
        <StatsCards interventions={interventions} />

        {/* Filter and Search Bar */}
        <FilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onlyUrgent={onlyUrgent}
          onToggleUrgent={() => setOnlyUrgent(prev => !prev)}
        />

        {/* List of Interventions */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            Caricamento interventi in corso...
          </div>
        ) : filteredInterventions.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30 p-8">
            <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">Nessun intervento trovato</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Non ci sono richieste con i filtri selezionati. Crea un nuovo ticket o modifica la ricerca.
            </p>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Crea Nuova Richiesta</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredInterventions.map((intervention) => (
              <InterventionCard
                key={intervention.id}
                intervention={intervention}
                currentRole={currentRole}
                currentUserName={currentUserName}
                onTakeCharge={handleTakeCharge}
                onOpenReportModal={(item) => setReportModalIntervention(item)}
                onOpenFeedbackModal={(item) => setFeedbackModalIntervention(item)}
                onPreviewPhoto={(photo) => setPreviewPhoto(photo)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-4 text-center text-xs text-slate-500">
        Gestione Interventi On-Site &copy; {new Date().getFullYear()} — Tracciamento Ore, Lavori Eseguiti & Rapporti PDF
      </footer>

      {/* Modals */}
      <NewRequestModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSubmit={handleCreateIntervention}
        currentUserName={currentUserName}
        existingInterventions={interventions}
      />

      <TechnicianReportModal
        isOpen={Boolean(reportModalIntervention)}
        onClose={() => setReportModalIntervention(null)}
        intervention={reportModalIntervention}
        onSaveReport={handleSaveReport}
        currentTechnicianName={currentUserName}
      />

      <ClientFeedbackModal
        isOpen={Boolean(feedbackModalIntervention)}
        onClose={() => setFeedbackModalIntervention(null)}
        intervention={feedbackModalIntervention}
        onSaveFeedback={handleSaveFeedback}
        currentClientName={currentUserName}
      />

      <ImagePreviewModal
        photo={previewPhoto}
        onClose={() => setPreviewPhoto(null)}
      />

    </div>
  );
}

export default App;
