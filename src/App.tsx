import React, { useState, useEffect } from 'react';
import { 
  InterventionRequest, UserAccount, Project, TechnicianReport, ClientFeedback, DefectPhoto 
} from './types';
import { 
  fetchInterventions, saveIntervention, deleteIntervention,
  fetchProjects, saveProject, deleteProject,
  fetchUsers, saveUser, deleteUser,
  getCurrentSession, setCurrentSession, clearCurrentSession
} from './lib/storage';
import { LoginScreen } from './components/LoginScreen';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { FilterBar } from './components/FilterBar';
import { InterventionCard } from './components/InterventionCard';
import { NewRequestModal } from './components/NewRequestModal';
import { TechnicianReportModal } from './components/TechnicianReportModal';
import { ClientFeedbackModal } from './components/ClientFeedbackModal';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { AdminUsersModal } from './components/AdminUsersModal';
import { ProjectManagementModal } from './components/ProjectManagementModal';
import { FolderKanban, PlusCircle, Inbox, CheckCircle2, AlertCircle, Layers } from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getCurrentSession());
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [interventions, setInterventions] = useState<InterventionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Project Filter: 'all' or project.id
  const [activeProjectId, setActiveProjectId] = useState<string>('proj-workbank');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'da_fare' | 'fatti'
  const [onlyUrgent, setOnlyUrgent] = useState(false);

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [reportModalIntervention, setReportModalIntervention] = useState<InterventionRequest | null>(null);
  const [feedbackModalIntervention, setFeedbackModalIntervention] = useState<InterventionRequest | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<DefectPhoto | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const loadedUsers = fetchUsers();
      const loadedProjects = fetchProjects();
      const loadedInterventions = await fetchInterventions();

      setUsers(loadedUsers);
      setProjects(loadedProjects);
      setInterventions(loadedInterventions);

      const session = getCurrentSession();
      if (session) {
        const found = loadedUsers.find(u => u.id === session.id);
        if (found) setCurrentUser(found);
      }
    } catch (err) {
      console.error('Error loading data', err);
    } finally {
      setLoading(false);
    }
  };

  // Auth Handlers
  const handleLogin = (user: UserAccount) => {
    setCurrentUser(user);
    setCurrentSession(user);
    showToast(`Benvenuto ${user.name}!`);
  };

  const handleLogout = () => {
    clearCurrentSession();
    setCurrentUser(null);
    showToast('Disconnesso con successo.');
  };

  // User Management (Solo Costantino)
  const handleSaveUser = (user: UserAccount) => {
    saveUser(user);
    const updated = fetchUsers();
    setUsers(updated);
    if (currentUser && currentUser.id === user.id) {
      setCurrentUser(user);
      setCurrentSession(user);
    }
    showToast(`Utente ${user.name} salvato con successo.`);
  };

  const handleDeleteUser = (userId: string) => {
    deleteUser(userId);
    setUsers(fetchUsers());
    showToast('Utente eliminato.');
  };

  // Project Management
  const handleSaveProject = (project: Project) => {
    saveProject(project);
    setProjects(fetchProjects());
    showToast(`Progetto ${project.name} salvato.`);
  };

  const handleDeleteProject = (projectId: string) => {
    deleteProject(projectId);
    setProjects(fetchProjects());
    if (activeProjectId === projectId) setActiveProjectId('all');
    showToast('Progetto eliminato.');
  };

  // Intervention Handlers
  const handleCreateIntervention = async (newReq: InterventionRequest) => {
    await saveIntervention(newReq);
    setInterventions(prev => [newReq, ...prev]);
    showToast(`Richiesta ${newReq.code} creata per ${newReq.projectName || 'il progetto'}!`);
  };

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
    showToast(`Rapporto salvato e verbale PDF generato per ${item.code}!`);
  };

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
    showToast(`Riscontro registrato per ${item.code}!`);
  };

  const handleDelete = async (id: string) => {
    const item = interventions.find(i => i.id === id);
    if (!item) return;
    if (!window.confirm(`Sei sicuro di voler eliminare la richiesta ${item.code}?`)) return;

    await deleteIntervention(id);
    setInterventions(prev => prev.filter(i => i.id !== id));
    showToast(`Intervento eliminato.`);
  };

  // Se l'utente non è autenticato, mostra schermata di Login
  if (!currentUser) {
    return <LoginScreen users={users} onLogin={handleLogin} />;
  }

  const isAdmin = currentUser.role === 'admin';

  // Progetti visibili per questo utente
  const visibleProjects = projects.filter(p => {
    if (isAdmin || currentUser.assignedProjectIds.includes('*')) return true;
    return currentUser.assignedProjectIds.includes(p.id);
  });

  // Filtro interventi per permessi progetto + filtro attivo + ricerca
  const filteredInterventions = interventions.filter(item => {
    // 1. Permesso utente sul progetto
    if (!isAdmin && !currentUser.assignedProjectIds.includes('*')) {
      if (item.projectId && !currentUser.assignedProjectIds.includes(item.projectId)) {
        return false;
      }
    }

    // 2. Filtro Progetto selezionato
    if (activeProjectId !== 'all') {
      if (item.projectId && item.projectId !== activeProjectId) return false;
      if (!item.projectId && activeProjectId !== 'proj-workbank') return false;
    }

    // 3. Ricerca
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match = 
        item.code.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.siteName.toLowerCase().includes(q) ||
        item.clientName.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.projectName && item.projectName.toLowerCase().includes(q)) ||
        (item.assignedTechnician && item.assignedTechnician.toLowerCase().includes(q));
      if (!match) return false;
    }

    // 4. Solo urgenti
    if (onlyUrgent && item.priority !== 'urgente') {
      return false;
    }

    return true;
  });

  // ================= DIVISIONE ROSSO (DA FARE) / VERDE (FATTI) =================
  const pendingInterventions = filteredInterventions.filter(i => i.status !== 'completato');
  const completedInterventions = filteredInterventions.filter(i => i.status === 'completato');

  const activeProjectObj = projects.find(p => p.id === activeProjectId);

  const showPendingSection = statusFilter === 'all' || statusFilter === 'da_fare';
  const showCompletedSection = statusFilter === 'all' || statusFilter === 'fatti';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-blue-600 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-blue-400/30 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        currentUser={currentUser}
        onOpenNewModal={() => setIsNewModalOpen(true)}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onOpenProjectsModal={() => setIsProjectsModalOpen(true)}
        onLogout={handleLogout}
        isOnline={true}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        
        {/* Project Selector Bar */}
        <div className="mb-6 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-blue-400" />
              <div>
                <h2 className="text-sm font-bold text-white">Classificazione Difetti & Interventi per Progetto</h2>
                <p className="text-[11px] text-slate-400">Seleziona il progetto per visualizzare solo i suoi difetti specifici</p>
              </div>
            </div>

            {isAdmin && (
              <button
                onClick={() => setIsProjectsModalOpen(true)}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 self-start sm:self-center"
              >
                <span>Gestisci o Aggiungi Progetti &rarr;</span>
              </button>
            )}
          </div>

          {/* Project Pills Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveProjectId('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                activeProjectId === 'all'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tutti i Progetti</span>
            </button>

            {visibleProjects.map((p) => {
              const count = interventions.filter(i => i.projectId === p.id).length;
              const isSelected = activeProjectId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveProjectId(p.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/50'
                  }`}
                >
                  <span>{p.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-blue-800 text-white' : 'bg-slate-900 text-slate-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Project Focus Header info */}
          {activeProjectObj && (
            <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-300 gap-2">
              <div>
                <span className="font-bold text-white text-sm">{activeProjectObj.name}</span>
                <span className="text-slate-400 ml-2">({activeProjectObj.code}) — {activeProjectObj.description}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                {activeProjectObj.siteAddress && <span>Sede: {activeProjectObj.siteAddress}</span>}
              </div>
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <StatsCards interventions={filteredInterventions} />

        {/* Filter and Search Bar with Red / Green quick switch */}
        <FilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onlyUrgent={onlyUrgent}
          onToggleUrgent={() => setOnlyUrgent(prev => !prev)}
          pendingCount={pendingInterventions.length}
          completedCount={completedInterventions.length}
        />

        {/* Loading state */}
        {loading && (
          <div className="py-20 text-center text-slate-400 text-sm">
            Caricamento interventi in corso...
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredInterventions.length === 0 && (
          <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30 p-8">
            <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">Nessun intervento trovato per questo filtro</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Non ci sono richieste con i parametri selezionati.
            </p>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Inserisci Nuovo Guasto / Intervento</span>
            </button>
          </div>
        )}

        {/* ================= SEZIONE 1: 🔴 INTERVENTI DA FARE (TONALITÀ ROSSO) ================= */}
        {!loading && showPendingSection && (
          <section className="mb-10">
            {/* Header Sezione Rosso */}
            <div className="flex items-center justify-between p-3.5 mb-4 rounded-2xl bg-gradient-to-r from-rose-950/70 via-slate-900 to-slate-900 border border-rose-800/50 shadow-lg shadow-rose-950/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <AlertCircle className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                    <span>INTERVENTI DA FARE & APERTI</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-sm">
                      {pendingInterventions.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-rose-300/80">Lavori pianificati, in attesa di intervento tecnico o in corso on-site</p>
                </div>
              </div>

              <button
                onClick={() => setIsNewModalOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow transition active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Aggiungi Guasto</span>
              </button>
            </div>

            {/* Griglia Card Da Fare */}
            {pendingInterventions.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-rose-900/30 bg-rose-950/10 text-xs text-rose-300/60">
                Nessun intervento da fare al momento in questa vista. Tutti i lavori sono completati!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingInterventions.map((intervention) => (
                  <InterventionCard
                    key={intervention.id}
                    intervention={intervention}
                    currentRole={currentUser.role}
                    currentUserName={currentUser.name}
                    onTakeCharge={handleTakeCharge}
                    onOpenReportModal={(item) => setReportModalIntervention(item)}
                    onOpenFeedbackModal={(item) => setFeedbackModalIntervention(item)}
                    onPreviewPhoto={(photo) => setPreviewPhoto(photo)}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ================= SEZIONE 2: 🟢 INTERVENTI GIÀ FATTI (TONALITÀ VERDE) ================= */}
        {!loading && showCompletedSection && (
          <section className="mb-10">
            {/* Header Sezione Verde */}
            <div className="flex items-center justify-between p-3.5 mb-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-800/50 shadow-lg shadow-emerald-950/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                    <span>INTERVENTI GIÀ FATTI & COMPLETATI</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-extrabold shadow-sm">
                      {completedInterventions.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-emerald-300/80">Lavori terminati con ore consuntivate, verbale tecnico PDF e riscontro cliente</p>
                </div>
              </div>
            </div>

            {/* Griglia Card Fatti */}
            {completedInterventions.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-emerald-900/30 bg-emerald-950/10 text-xs text-emerald-300/60">
                Nessun intervento completato ancora per i filtri selezionati.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedInterventions.map((intervention) => (
                  <InterventionCard
                    key={intervention.id}
                    intervention={intervention}
                    currentRole={currentUser.role}
                    currentUserName={currentUser.name}
                    onTakeCharge={handleTakeCharge}
                    onOpenReportModal={(item) => setReportModalIntervention(item)}
                    onOpenFeedbackModal={(item) => setFeedbackModalIntervention(item)}
                    onPreviewPhoto={(photo) => setPreviewPhoto(photo)}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </section>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-4 text-center text-xs text-slate-500">
        Gestione Interventi &copy; {new Date().getFullYear()} — Amministrato da Costantino
      </footer>

      {/* Modals */}
      <NewRequestModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSubmit={handleCreateIntervention}
        currentUserName={currentUser.name}
        existingInterventions={interventions}
        projects={visibleProjects}
        defaultProjectId={activeProjectId !== 'all' ? activeProjectId : undefined}
      />

      <TechnicianReportModal
        isOpen={Boolean(reportModalIntervention)}
        onClose={() => setReportModalIntervention(null)}
        intervention={reportModalIntervention}
        onSaveReport={handleSaveReport}
        currentTechnicianName={currentUser.name}
      />

      <ClientFeedbackModal
        isOpen={Boolean(feedbackModalIntervention)}
        onClose={() => setFeedbackModalIntervention(null)}
        intervention={feedbackModalIntervention}
        onSaveFeedback={handleSaveFeedback}
        currentClientName={currentUser.name}
      />

      <ImagePreviewModal
        photo={previewPhoto}
        onClose={() => setPreviewPhoto(null)}
      />

      {isAdmin && (
        <AdminUsersModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          users={users}
          projects={projects}
          onSaveUser={handleSaveUser}
          onDeleteUser={handleDeleteUser}
        />
      )}

      {isAdmin && (
        <ProjectManagementModal
          isOpen={isProjectsModalOpen}
          onClose={() => setIsProjectsModalOpen(false)}
          projects={projects}
          onSaveProject={handleSaveProject}
          onDeleteProject={handleDeleteProject}
        />
      )}

    </div>
  );
}

export default App;
