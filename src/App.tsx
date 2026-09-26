import React, { useState, useEffect } from 'react';
import { 
  InterventionRequest, InterventionStatus, InterventionPriority, UserAccount, Project, TechnicianReport, ClientFeedback, DefectPhoto 
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
import { PwaInstallModal } from './components/PwaInstallModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { SmartEmailModal } from './components/SmartEmailModal';
import { subscribePwaInstall, canInstallPwa } from './lib/pwa';
import { FolderKanban, PlusCircle, Inbox, CheckCircle2, AlertCircle, Layers, FileSpreadsheet, Clock } from 'lucide-react';
import { exportInterventionsToExcel } from './lib/excelExport';
import { verifySessionToken } from './lib/authSecurity';

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
  const [openProjectCreateDirectly, setOpenProjectCreateDirectly] = useState(false);
  const [reportModalIntervention, setReportModalIntervention] = useState<InterventionRequest | null>(null);
  const [feedbackModalIntervention, setFeedbackModalIntervention] = useState<InterventionRequest | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<DefectPhoto | null>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isSmartEmailModalOpen, setIsSmartEmailModalOpen] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    loadAllData();

    // Online / Offline tracking
    const handleOnline = () => {
      setIsOnline(true);
      showToast('🟢 Online: Connection active');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('📡 Offline Mode: All actions saved locally');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Track PWA install eligibility
    const unsub = subscribePwaInstall(() => {
      setCanInstall(canInstallPwa());
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsub();
    };
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
        const token = sessionStorage.getItem('auth_session_token');
        if (token) {
          const check = await verifySessionToken(token);
          if (check.valid && check.payload) {
            const found = loadedUsers.find(u => u.id === session.id);
            if (found) setCurrentUser(found);
          } else {
            clearCurrentSession();
            sessionStorage.removeItem('auth_session_token');
            setCurrentUser(null);
          }
        } else {
          const found = loadedUsers.find(u => u.id === session.id);
          if (found) setCurrentUser(found);
        }
      }
    } catch (err) {
      console.error('Error loading data', err);
    } finally {
      setLoading(false);
    }
  };

  // Auth Handlers
  const handleLogin = (user: UserAccount, token?: string) => {
    setCurrentUser(user);
    setCurrentSession(user);
    if (token) {
      sessionStorage.setItem('auth_session_token', token);
    }
    showToast(`Welcome ${user.name}!`);
  };

  const handleLogout = () => {
    clearCurrentSession();
    sessionStorage.removeItem('auth_session_token');
    setCurrentUser(null);
    showToast('Logged out successfully.');
  };

  // User Management (Costantino Only)
  const handleSaveUser = (user: UserAccount) => {
    saveUser(user);
    const updated = fetchUsers();
    setUsers(updated);
    if (currentUser && currentUser.id === user.id) {
      setCurrentUser(user);
      setCurrentSession(user);
    }
    showToast(`User ${user.name} saved successfully.`);
  };

  const handleDeleteUser = (userId: string) => {
    deleteUser(userId);
    setUsers(fetchUsers());
    showToast('User deleted.');
  };

  // Project Management
  const handleSaveProject = (project: Project) => {
    saveProject(project);
    const updated = fetchProjects();
    setProjects(updated);
    setActiveProjectId(project.id);
    showToast(`Project ${project.name} (${project.code}) saved successfully!`);
  };

  const handleDeleteProject = (projectId: string) => {
    deleteProject(projectId);
    setProjects(fetchProjects());
    if (activeProjectId === projectId) setActiveProjectId('all');
    showToast('Project deleted.');
  };

  // Intervention Handlers
  const handleCreateIntervention = async (newReq: InterventionRequest) => {
    await saveIntervention(newReq);
    setInterventions(prev => [newReq, ...prev]);
    showToast(`Request ${newReq.code} created for ${newReq.projectName || 'the project'}!`);
  };

  const handleTakeCharge = async (id: string, technicianName: string) => {
    const item = interventions.find(i => i.id === id);
    if (!item) return;

    const updated: InterventionRequest = {
      ...item,
      status: 'in_progress',
      assignedTechnician: technicianName,
      updatedAt: new Date().toISOString()
    };

    await saveIntervention(updated);
    setInterventions(prev => prev.map(i => i.id === id ? updated : i));
    showToast(`Task ${item.code} taken in charge by ${technicianName}`);
  };

  const handleSaveReport = async (interventionId: string, report: TechnicianReport) => {
    const item = interventions.find(i => i.id === interventionId);
    if (!item) return;

    const isResolved = report.statusOutcome === 'resolved' || (report.statusOutcome as string) === 'risolto';
    const newStatus: InterventionStatus = isResolved ? 'completed' : 'in_progress';

    const updated: InterventionRequest = {
      ...item,
      status: newStatus,
      assignedTechnician: report.technicianName,
      report,
      updatedAt: new Date().toISOString()
    };

    await saveIntervention(updated);
    setInterventions(prev => prev.map(i => i.id === interventionId ? updated : i));

    if (report.statusOutcome === 'waiting_for_parts' || (report.statusOutcome as string) === 'in_attesa_ricambi') {
      showToast(`Report saved: ${item.code} marked as Working in Progress (Waiting for parts) 🌸`);
    } else if (isResolved) {
      showToast(`Report saved and ticket completed for ${item.code}! 🟢`);
    } else {
      showToast(`Report saved: ${item.code} marked as Working in Progress (Partial) 🟡`);
    }
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
    showToast(`Client feedback recorded for ${item.code}!`);
  };

  const handleDelete = async (id: string) => {
    const item = interventions.find(i => i.id === id);
    if (!item) return;
    if (!window.confirm(`Are you sure you want to delete request ${item.code}?`)) return;

    await deleteIntervention(id);
    setInterventions(prev => prev.filter(i => i.id !== id));
    showToast(`Intervention deleted.`);
  };

  // Smart Email Action Handler (Antigravity Inbound Email AI)
  const handleExecuteEmailAction = async (payload: {
    action: 'create' | 'follow_up' | 'close';
    sender: string;
    receivedAt: string;
    subject: string;
    message: string;
    targetInterventionId?: string;
    newTicket?: {
      title: string;
      description: string;
      projectId?: string;
      priority: InterventionPriority;
    };
  }) => {
    const { action, sender, receivedAt, subject, message, targetInterventionId, newTicket } = payload;

    if (action === 'create' && newTicket) {
      const proj = projects.find(p => p.id === newTicket.projectId) || projects[0];
      const now = new Date();
      const codeYear = now.getFullYear();
      const projSuffix = proj ? proj.code.slice(0, 3).toUpperCase() : 'DEF';
      const seq = interventions.length + 1;
      const code = `INT-${codeYear}-${projSuffix}${seq}`;

      const newIntervention: InterventionRequest = {
        id: `int-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        code,
        projectId: proj?.id,
        projectName: proj?.name,
        title: newTicket.title,
        siteName: proj?.name || 'Sede Cliente',
        siteAddress: proj?.siteAddress || '',
        clientName: sender.split('<')[0].trim() || sender,
        clientContact: sender,
        description: newTicket.description || 'Intervento generato automaticamente da ricezione email.',
        desiredAccessDate: receivedAt.split(' ')[0] || new Date().toISOString().split('T')[0],
        desiredAccessTime: receivedAt.split(' ')[1] || '09:00',
        priority: newTicket.priority || 'medium',
        defectPhotos: [],
        notes: `Creato via Smart Inbound Email da ${sender} in data ${receivedAt}.`,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        emailSource: {
          sender,
          receivedAt,
          subject,
          rawSnippet: message.slice(0, 180)
        },
        emailHistory: [
          {
            id: `msg-${Date.now()}-1`,
            sender,
            receivedAt,
            subject,
            message: message || newTicket.title,
            action: 'created'
          }
        ]
      };

      await saveIntervention(newIntervention);
      setInterventions(prev => [newIntervention, ...prev]);
      if (proj && activeProjectId !== 'all' && activeProjectId !== proj.id) {
        setActiveProjectId(proj.id);
      }
      showToast(`✉️ Creato nuovo intervento [${code}] da email di ${sender}!`);
    } else if (action === 'follow_up' && targetInterventionId) {
      const item = interventions.find(i => i.id === targetInterventionId);
      if (!item) return;

      const historyEntry = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender,
        receivedAt,
        subject,
        message,
        action: 'follow_up' as const
      };

      const updatedHistory = [...(item.emailHistory || []), historyEntry];
      const appendedNotes = item.notes
        ? `${item.notes}\n\n[Follow-up Email da ${sender} il ${receivedAt}]:\n${message}`
        : `[Follow-up Email da ${sender} il ${receivedAt}]:\n${message}`;

      const nextStatus = item.status === 'pending' || item.status === 'in_attesa' ? 'in_progress' : item.status;

      const updated: InterventionRequest = {
        ...item,
        status: nextStatus,
        notes: appendedNotes,
        updatedAt: new Date().toISOString(),
        emailSource: item.emailSource || { sender, receivedAt, subject },
        emailHistory: updatedHistory
      };

      await saveIntervention(updated);
      setInterventions(prev => prev.map(i => i.id === targetInterventionId ? updated : i));
      showToast(`🌸 Follow-up registrato su [${item.code}] via Email!`);
    } else if (action === 'close' && targetInterventionId) {
      const item = interventions.find(i => i.id === targetInterventionId);
      if (!item) return;

      const historyEntry = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender,
        receivedAt,
        subject,
        message,
        action: 'closed' as const
      };

      const updatedHistory = [...(item.emailHistory || []), historyEntry];
      const closeNote = `[Chiuso via Email da ${sender} il ${receivedAt}]: ${message}`;
      const appendedNotes = item.notes ? `${item.notes}\n\n${closeNote}` : closeNote;

      const existingReport: TechnicianReport = item.report || {
        technicianName: currentUser?.name || 'Antigravity AI Assistant',
        interventionDate: receivedAt.split(' ')[0] || new Date().toISOString().split('T')[0],
        hoursWorked: 1,
        workDone: `Risoluzione confermata da email di ${sender}.`,
        statusOutcome: 'resolved',
        completedAt: new Date().toISOString()
      };

      const updatedReport: TechnicianReport = {
        ...existingReport,
        statusOutcome: 'resolved',
        completedAt: new Date().toISOString(),
        technicalNotes: existingReport.technicalNotes 
          ? `${existingReport.technicalNotes}\n${closeNote}`
          : closeNote
      };

      const updated: InterventionRequest = {
        ...item,
        status: 'completed',
        report: updatedReport,
        notes: appendedNotes,
        updatedAt: new Date().toISOString(),
        emailSource: item.emailSource || { sender, receivedAt, subject },
        emailHistory: updatedHistory
      };

      await saveIntervention(updated);
      setInterventions(prev => prev.map(i => i.id === targetInterventionId ? updated : i));
      showToast(`🟢 Intervento [${item.code}] chiuso e completato da email!`);
    }
  };

  // If user is not authenticated, show Login screen
  if (!currentUser) {
    return <LoginScreen users={users} onLogin={handleLogin} />;
  }

  const isAdmin = currentUser.role === 'admin';

  // Visible projects for this user
  const visibleProjects = projects.filter(p => {
    if (isAdmin || currentUser.assignedProjectIds.includes('*')) return true;
    return currentUser.assignedProjectIds.includes(p.id);
  });

  // Filter interventions by permissions + active project + search term
  const filteredInterventions = interventions.filter(item => {
    // 1. User permission for project
    if (!isAdmin && !currentUser.assignedProjectIds.includes('*')) {
      if (item.projectId && !currentUser.assignedProjectIds.includes(item.projectId)) {
        return false;
      }
    }

    // 2. Selected project filter
    if (activeProjectId !== 'all') {
      if (item.projectId && item.projectId !== activeProjectId) return false;
      if (!item.projectId && activeProjectId !== 'proj-workbank') return false;
    }

    // 3. Search query
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

    // 4. Only urgent
    if (onlyUrgent && item.priority !== 'urgent' && item.priority !== 'urgente') {
      return false;
    }

    return true;
  });

  // ================= TASK DIVISION (TO DO / IN PROGRESS / COMPLETED) =================
  const pendingInterventions = filteredInterventions.filter(
    i => i.status !== 'completed' && i.status !== 'completato'
  );

  const inProgressInterventions = filteredInterventions.filter(
    i => (i.status === 'in_progress' || i.status === 'in_corso' || 
         i.report?.statusOutcome === 'waiting_for_parts' || 
         (i.report?.statusOutcome as string) === 'in_attesa_ricambi') &&
         (i.status !== 'completed' && i.status !== 'completato')
  );

  const todoInterventions = pendingInterventions.filter(
    i => !inProgressInterventions.some(ip => ip.id === i.id)
  );

  const completedInterventions = filteredInterventions.filter(
    i => i.status === 'completed' || i.status === 'completato'
  );

  const activeProjectObj = projects.find(p => p.id === activeProjectId);

  const showTodoSection = statusFilter === 'all' || statusFilter === 'da_fare';
  const showInProgressSection = statusFilter === 'all' || statusFilter === 'in_lavorazione';
  const showCompletedSection = statusFilter === 'all' || statusFilter === 'fatti';

  const handleExportExcel = () => {
    const targetList = completedInterventions.length > 0 ? completedInterventions : filteredInterventions;
    if (targetList.length === 0) {
      alert('No service tickets available to export.');
      return;
    }
    const projectLabel = activeProjectObj ? activeProjectObj.code : 'All_Projects';
    const result = exportInterventionsToExcel(targetList, `Work_Hours_${projectLabel}`);
    showToast(`Exported ${result.count} tickets (${result.totalHours.toFixed(1)} hrs total) to Excel!`);
  };

  // Status colors for Project Pills:
  // 1. Rosa se non c'è nulla (0 ticket)
  // 2. Giallo se in lavorazione
  // 3. Verde se tutto risolto
  // 4. Rosso se ci sono difetti/interventi aperti non risolti
  const getProjectStatusStyle = (projectId: string, isSelected: boolean) => {
    const projTickets = interventions.filter(i => i.projectId === projectId);
    const count = projTickets.length;

    // 1. Rosa se non c'è nulla (0 ticket)
    if (count === 0) {
      return {
        label: 'Empty (No tickets)',
        dotColor: 'bg-pink-400',
        dotPulse: false,
        btnClass: isSelected
          ? 'bg-pink-600 text-white border-pink-400 shadow-md shadow-pink-600/30 ring-2 ring-pink-400/40'
          : 'bg-pink-950/25 border-pink-500/40 text-pink-300 hover:bg-pink-900/40 hover:border-pink-400',
        badgeClass: isSelected ? 'bg-pink-900 text-white' : 'bg-pink-950/80 text-pink-300 border border-pink-700/50'
      };
    }

    const hasPending = projTickets.some(i => i.status === 'pending' || i.status === 'in_attesa' || i.status === 'scheduled');
    const hasInProgress = projTickets.some(i => i.status === 'in_progress' || i.status === 'in_corso');
    const allResolved = projTickets.every(i => i.status === 'completed' || i.status === 'completato');

    // 2. Verde se è tutto risolto
    if (allResolved) {
      return {
        label: 'All Resolved',
        dotColor: 'bg-emerald-400',
        dotPulse: false,
        btnClass: isSelected
          ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400/40'
          : 'bg-emerald-950/25 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40 hover:border-emerald-400',
        badgeClass: isSelected ? 'bg-emerald-800 text-white' : 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
      };
    }

    // 3. Giallo se è in lavorazione
    if (hasInProgress) {
      return {
        label: 'In Progress (Active Work)',
        dotColor: 'bg-amber-400',
        dotPulse: true,
        btnClass: isSelected
          ? 'bg-amber-500 text-slate-950 font-bold border-amber-300 shadow-md shadow-amber-500/30 ring-2 ring-amber-300/40'
          : 'bg-amber-950/25 border-amber-500/40 text-amber-300 hover:bg-amber-900/40 hover:border-amber-400',
        badgeClass: isSelected ? 'bg-amber-400 text-slate-950 font-black' : 'bg-amber-950/80 text-amber-300 border border-amber-700/50'
      };
    }

    // 4. Rosso se ci sono difetti/interventi non ancora risolti
    return {
      label: 'Open / Unresolved',
      dotColor: 'bg-rose-500',
      dotPulse: true,
      btnClass: isSelected
        ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-600/30 ring-2 ring-rose-400/40'
        : 'bg-rose-950/25 border-rose-500/40 text-rose-300 hover:bg-rose-900/40 hover:border-rose-400',
      badgeClass: isSelected ? 'bg-rose-800 text-white' : 'bg-rose-950/80 text-rose-300 border border-rose-700/50'
    };
  };

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
        onExportExcel={handleExportExcel}
        onLogout={handleLogout}
        isOnline={isOnline}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenSmartEmailModal={() => setIsSmartEmailModalOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6">
        
        {/* Project Selector Bar */}
        <div className="mb-4 sm:mb-6 bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-blue-400" />
              <div>
                <h2 className="text-sm font-bold text-white">Project Defect & Service Classification</h2>
                <p className="text-[11px] text-slate-400">Select a project to view only its dedicated defects and service tasks</p>
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  onClick={() => {
                    setOpenProjectCreateDirectly(true);
                    setIsProjectsModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition active:scale-95"
                  title="Create a new Project"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Add New Project</span>
                </button>
                <button
                  onClick={() => {
                    setOpenProjectCreateDirectly(false);
                    setIsProjectsModalOpen(true);
                  }}
                  className="text-xs text-slate-300 hover:text-white font-semibold px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 transition"
                  title="Manage all projects"
                >
                  <span>Manage</span>
                </button>
              </div>
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
              <span>All Projects</span>
            </button>

            {visibleProjects.map((p) => {
              const count = interventions.filter(i => i.projectId === p.id).length;
              const isSelected = activeProjectId === p.id;
              const style = getProjectStatusStyle(p.id, isSelected);

              return (
                <button
                  key={p.id}
                  onClick={() => setActiveProjectId(p.id)}
                  title={`${p.name} — Status: ${style.label} (${count} tickets)`}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 border ${style.btnClass}`}
                >
                  <span className={`w-2 h-2 rounded-full ${style.dotColor} ${style.dotPulse ? 'animate-pulse' : ''}`}></span>
                  <span>{p.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${style.badgeClass}`}>
                    {count}
                  </span>
                </button>
              );
            })}

            {isAdmin && (
              <button
                onClick={() => {
                  setOpenProjectCreateDirectly(true);
                  setIsProjectsModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 bg-blue-600/15 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 border-dashed active:scale-95 shrink-0"
                title="Create a new Project"
              >
                <PlusCircle className="w-3.5 h-3.5 text-blue-400" />
                <span>+ New Project</span>
              </button>
            )}
          </div>

          {/* Status Color Legend */}
          <div className="flex items-center gap-3.5 text-[11px] text-slate-400 flex-wrap pt-2.5 mt-2.5 border-t border-slate-800/60">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Project Status:</span>
            <span className="flex items-center gap-1.5 bg-rose-950/30 px-2 py-0.5 rounded-md border border-rose-900/40">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-rose-300">Open / Not Resolved</span>
            </span>
            <span className="flex items-center gap-1.5 bg-amber-950/30 px-2 py-0.5 rounded-md border border-amber-900/40">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span className="text-amber-300">In Progress</span>
            </span>
            <span className="flex items-center gap-1.5 bg-emerald-950/30 px-2 py-0.5 rounded-md border border-emerald-900/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-emerald-300">All Resolved</span>
            </span>
            <span className="flex items-center gap-1.5 bg-pink-950/30 px-2 py-0.5 rounded-md border border-pink-900/40">
              <span className="w-2 h-2 rounded-full bg-pink-400"></span>
              <span className="text-pink-300">Empty (No Tasks)</span>
            </span>
          </div>

          {/* Project Focus Header info */}
          {activeProjectObj && (
            <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-300 gap-2">
              <div>
                <span className="font-bold text-white text-sm">{activeProjectObj.name}</span>
                <span className="text-slate-400 ml-2">({activeProjectObj.code}) — {activeProjectObj.description}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                {activeProjectObj.siteAddress && <span>Facility: {activeProjectObj.siteAddress}</span>}
              </div>
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <StatsCards interventions={filteredInterventions} />

        {/* Filter and Search Bar with Red / Pink / Green quick switch */}
        <FilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onlyUrgent={onlyUrgent}
          onToggleUrgent={() => setOnlyUrgent(prev => !prev)}
          pendingCount={statusFilter === 'all' ? todoInterventions.length : pendingInterventions.length}
          inProgressCount={inProgressInterventions.length}
          completedCount={completedInterventions.length}
        />

        {/* Loading state */}
        {loading && (
          <div className="py-20 text-center text-slate-400 text-sm">
            Loading service tasks...
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredInterventions.length === 0 && (
          <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30 p-8">
            <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No service tasks found for this filter</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              There are no service requests matching the selected criteria.
            </p>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Defect / Service Ticket</span>
            </button>
          </div>
        )}

        {/* ================= SECTION 1: 🔴 OPEN & TO DO SERVICE TASKS (RED TONES) ================= */}
        {!loading && showTodoSection && (
          <section className="mb-10">
            {/* Red Section Header */}
            <div className="flex items-center justify-between p-3.5 mb-4 rounded-2xl bg-gradient-to-r from-rose-950/70 via-slate-900 to-slate-900 border border-rose-800/50 shadow-lg shadow-rose-950/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <AlertCircle className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                    <span>TO DO & OPEN INTERVENTIONS</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-sm">
                      {statusFilter === 'all' ? todoInterventions.length : pendingInterventions.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-rose-300/80">Scheduled work, awaiting technician dispatch</p>
                </div>
              </div>

              <button
                onClick={() => setIsNewModalOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow transition active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Defect</span>
              </button>
            </div>

            {/* Red Cards Grid */}
            {(statusFilter === 'all' ? todoInterventions : pendingInterventions).length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-rose-900/30 bg-rose-950/10 text-xs text-rose-300/60">
                No open tasks waiting dispatch for this view.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(statusFilter === 'all' ? todoInterventions : pendingInterventions).map((intervention) => (
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

        {/* ================= SECTION 2: 🌸 IN PROGRESS & WAITING FOR PARTS (PINK TONES) ================= */}
        {!loading && (statusFilter === 'all' ? inProgressInterventions.length > 0 : showInProgressSection) && (
          <section className="mb-10">
            {/* Pink Section Header */}
            <div className="flex items-center justify-between p-3.5 mb-4 rounded-2xl bg-gradient-to-r from-pink-950/70 via-slate-900 to-slate-900 border border-pink-700/50 shadow-lg shadow-pink-950/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
                  <Clock className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                    <span>IN PROGRESS & WAITING FOR PARTS</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-pink-600 text-white shadow-sm">
                      {inProgressInterventions.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-pink-300/80">Active on-site tasks, inspections and orders awaiting spare parts</p>
                </div>
              </div>
            </div>

            {/* Pink Cards Grid */}
            {inProgressInterventions.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-pink-900/30 bg-pink-950/10 text-xs text-pink-300/60">
                No tasks currently in progress or waiting for parts.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inProgressInterventions.map((intervention) => (
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

        {/* ================= SECTION 3: 🟢 COMPLETED & CLOSED SERVICE TASKS (GREEN TONES) ================= */}
        {!loading && showCompletedSection && (
          <section className="mb-10">
            {/* Green Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 mb-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-800/50 shadow-lg shadow-emerald-950/20 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                    <span>COMPLETED INTERVENTIONS</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-extrabold shadow-sm">
                      {completedInterventions.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-emerald-300/80">Finished tasks with logged hours, signed PDF report and client feedback</p>
                </div>
              </div>

              <button
                onClick={handleExportExcel}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 text-xs font-semibold shadow transition active:scale-95 self-start sm:self-center"
                title="Export logged hours and completed reports to Excel / CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
                <span>Export Hours (Excel)</span>
              </button>
            </div>

            {/* Green Cards Grid */}
            {completedInterventions.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-emerald-900/30 bg-emerald-950/10 text-xs text-emerald-300/60">
                No completed interventions yet for the selected filters.
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
        Field Service Management &copy; {new Date().getFullYear()} — Administered by Costantino
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
        onAddNewProject={isAdmin ? () => {
          setIsNewModalOpen(false);
          setOpenProjectCreateDirectly(true);
          setIsProjectsModalOpen(true);
        } : undefined}
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
          onClose={() => {
            setIsProjectsModalOpen(false);
            setOpenProjectCreateDirectly(false);
          }}
          projects={projects}
          onSaveProject={handleSaveProject}
          onDeleteProject={handleDeleteProject}
          initialCreate={openProjectCreateDirectly}
        />
      )}

      {/* PWA Home Screen Installation Modal */}
      <PwaInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        onInstalledSuccess={() => showToast('🎉 App successfully installed to your Home Screen!')}
      />

      {/* Full Database Backup & Restore Modal (JSON) */}
      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        interventions={interventions}
        projects={projects}
        users={users}
        onDataRestored={(newInterventions, newProjects, newUsers) => {
          setInterventions(newInterventions);
          setProjects(newProjects);
          setUsers(newUsers);
          showToast('✅ Database restored successfully from JSON backup!');
        }}
      />

      {/* Smart Inbound Email Assistant Modal */}
      <SmartEmailModal
        isOpen={isSmartEmailModalOpen}
        onClose={() => setIsSmartEmailModalOpen(false)}
        interventions={interventions}
        projects={projects}
        onExecuteEmailAction={handleExecuteEmailAction}
      />

    </div>
  );
}

export default App;
