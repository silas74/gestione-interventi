import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { 
  InterventionRequest, InterventionStatus, InterventionPriority, UserAccount, Project, TechnicianReport, ClientFeedback, DefectPhoto, RecordCategory, ProjectTrackingEntry 
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
import { subscribePwaInstall, canInstallPwa } from './lib/pwa';
import { FolderKanban, PlusCircle, Inbox, CheckCircle2, AlertCircle, Layers, FileSpreadsheet, Clock, Wrench, ClipboardList, FileDown, MessageCircle } from 'lucide-react';
import { exportInterventionsToExcel } from './lib/excelExport';
import { verifySessionToken } from './lib/authSecurity';

// Lazy-loaded Modals for faster initial page load & smaller main bundle
const NewRequestModal = lazy(() => import('./components/NewRequestModal').then(m => ({ default: m.NewRequestModal })));
const TechnicianReportModal = lazy(() => import('./components/TechnicianReportModal').then(m => ({ default: m.TechnicianReportModal })));
const ClientFeedbackModal = lazy(() => import('./components/ClientFeedbackModal').then(m => ({ default: m.ClientFeedbackModal })));
const ImagePreviewModal = lazy(() => import('./components/ImagePreviewModal').then(m => ({ default: m.ImagePreviewModal })));
const AdminUsersModal = lazy(() => import('./components/AdminUsersModal').then(m => ({ default: m.AdminUsersModal })));
const ProjectManagementModal = lazy(() => import('./components/ProjectManagementModal').then(m => ({ default: m.ProjectManagementModal })));
const PwaInstallModal = lazy(() => import('./components/PwaInstallModal').then(m => ({ default: m.PwaInstallModal })));
const BackupRestoreModal = lazy(() => import('./components/BackupRestoreModal').then(m => ({ default: m.BackupRestoreModal })));
const SmartEmailModal = lazy(() => import('./components/SmartEmailModal').then(m => ({ default: m.SmartEmailModal })));

export function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getCurrentSession());
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [interventions, setInterventions] = useState<InterventionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Main View Tab: 'project_work' (Lavori & Azioni Progetto) | 'intervention' (Interventi & Guasti)
  const [activeCategoryTab, setActiveCategoryTab] = useState<RecordCategory>('project_work');

  // Active Project Filter: 'all' or project.id
  const [activeProjectId, setActiveProjectId] = useState<string>('proj-awash-bank');

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

      const awashProj = loadedProjects.find(
        p =>
          p.id === 'proj-awash-bank' ||
          p.name.toLowerCase().includes('awash') ||
          p.code.toLowerCase().includes('awash')
      );
      if (awashProj) {
        setActiveProjectId(awashProj.id);
      }

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

  // Intervention & Project Work Handlers
  const handleCreateIntervention = async (newReq: InterventionRequest) => {
    await saveIntervention(newReq);
    setInterventions(prev => [newReq, ...prev]);
    const targetCategory: RecordCategory = newReq.recordType === 'project_work' ? 'project_work' : 'intervention';
    setActiveCategoryTab(targetCategory);
    if (newReq.projectId && activeProjectId !== 'all' && activeProjectId !== newReq.projectId) {
      setActiveProjectId(newReq.projectId);
    }
    showToast(
      targetCategory === 'project_work'
        ? `📋 Lavoro/Azione ${newReq.code} creato per ${newReq.projectName || 'il progetto'}!`
        : `🛠️ Richiesta ${newReq.code} creata per ${newReq.projectName || 'il progetto'}!`
    );
  };

  // Interactive Action Steps Checklist Handlers
  const handleToggleActionStep = useCallback(async (interventionId: string, stepId: string) => {
    const item = interventions.find(i => i.id === interventionId);
    if (!item || !item.actionSteps) return;

    const updatedSteps = item.actionSteps.map(step =>
      step.id === stepId
        ? {
            ...step,
            completed: !step.completed,
            completedAt: !step.completed ? new Date().toISOString() : undefined
          }
        : step
    );

    const anyCompleted = updatedSteps.some(s => s.completed);
    let nextStatus = item.status;
    if (anyCompleted && (item.status === 'pending' || item.status === 'in_attesa')) {
      nextStatus = 'in_progress';
    }

    const updated: InterventionRequest = {
      ...item,
      actionSteps: updatedSteps,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    };

    await saveIntervention(updated);
    setInterventions(prev => prev.map(i => i.id === interventionId ? updated : i));
  }, [interventions]);

  const handleAddActionStep = useCallback(async (interventionId: string, text: string) => {
    const item = interventions.find(i => i.id === interventionId);
    if (!item) return;

    const newStep = {
      id: 'act_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      text,
      completed: false
    };

    const updated: InterventionRequest = {
      ...item,
      actionSteps: [...(item.actionSteps || []), newStep],
      updatedAt: new Date().toISOString()
    };

    await saveIntervention(updated);
    setInterventions(prev => prev.map(i => i.id === interventionId ? updated : i));
    showToast(`➕ Nuova azione aggiunta a ${item.code}`);
  }, [interventions]);

  const handleDeleteActionStep = useCallback(async (interventionId: string, stepId: string) => {
    const item = interventions.find(i => i.id === interventionId);
    if (!item || !item.actionSteps) return;

    const updated: InterventionRequest = {
      ...item,
      actionSteps: item.actionSteps.filter(s => s.id !== stepId),
      updatedAt: new Date().toISOString()
    };

    await saveIntervention(updated);
    setInterventions(prev => prev.map(i => i.id === interventionId ? updated : i));
  }, [interventions]);

  // Project Tracking Log Handlers (Cosa ho fatto, Email/WhatsApp, Data, Da chi aspetto risposta)
  const handleAddTrackingEntry = useCallback(async (interventionId: string, entry: Omit<ProjectTrackingEntry, 'id'>) => {
    const item = interventions.find(i => i.id === interventionId);
    if (!item) return;

    const newEntry: ProjectTrackingEntry = {
      ...entry,
      id: 'trk_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    };

    const nextStatus =
      item.status === 'pending' || item.status === 'in_attesa'
        ? 'in_progress'
        : item.status;

    const updated: InterventionRequest = {
      ...item,
      status: nextStatus,
      trackingLogs: [newEntry, ...(item.trackingLogs || [])],
      whatIDidSummary: entry.whatIDid,
      followUpChannel: entry.channel,
      lastActionDate: entry.date,
      waitingReplyFrom: entry.awaitingReply && entry.waitingReplyFrom ? entry.waitingReplyFrom : item.waitingReplyFrom,
      followUpDueDate: entry.followUpDueDate || item.followUpDueDate,
      nextActionToDo: entry.nextStep || item.nextActionToDo,
      updatedAt: new Date().toISOString(),
    };

    await saveIntervention(updated);
    setInterventions(prev => prev.map(i => i.id === interventionId ? updated : i));
    showToast(`📡 Tracking aggiornato su ${item.code}!`);
  }, [interventions]);

  const handleMarkReplyReceived = useCallback(async (interventionId: string, trackingId?: string) => {
    const item = interventions.find(i => i.id === interventionId);
    if (!item) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const updatedLogs = (item.trackingLogs || []).map(log => {
      if (!trackingId || log.id === trackingId) {
        if (log.awaitingReply && !log.replyReceived) {
          return {
            ...log,
            replyReceived: true,
            replyReceivedAt: todayStr,
          };
        }
      }
      return log;
    });

    const stillWaiting = updatedLogs.find(l => l.awaitingReply && !l.replyReceived);

    const updated: InterventionRequest = {
      ...item,
      trackingLogs: updatedLogs,
      waitingReplyFrom: stillWaiting ? stillWaiting.waitingReplyFrom : undefined,
      followUpDueDate: stillWaiting ? stillWaiting.followUpDueDate : undefined,
      updatedAt: new Date().toISOString(),
    };

    await saveIntervention(updated);
    setInterventions(prev => prev.map(i => i.id === interventionId ? updated : i));
    showToast(`✅ Risposta registrata come ricevuta per ${item.code}!`);
  }, [interventions]);

  const handleDeleteTrackingEntry = useCallback(async (interventionId: string, trackingId: string) => {
    const item = interventions.find(i => i.id === interventionId);
    if (!item || !item.trackingLogs) return;

    const updatedLogs = item.trackingLogs.filter(l => l.id !== trackingId);
    const stillWaiting = updatedLogs.find(l => l.awaitingReply && !l.replyReceived);

    const updated: InterventionRequest = {
      ...item,
      trackingLogs: updatedLogs,
      waitingReplyFrom: stillWaiting ? stillWaiting.waitingReplyFrom : undefined,
      updatedAt: new Date().toISOString(),
    };

    await saveIntervention(updated);
    setInterventions(prev => prev.map(i => i.id === interventionId ? updated : i));
  }, [interventions]);

  const handleTakeCharge = useCallback(async (id: string, technicianName: string) => {
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
  }, [interventions]);

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

  const handleDelete = useCallback(async (id: string) => {
    const item = interventions.find(i => i.id === id);
    if (!item) return;
    if (!window.confirm(`Are you sure you want to delete request ${item.code}?`)) return;

    await deleteIntervention(id);
    setInterventions(prev => prev.filter(i => i.id !== id));
    showToast(`Intervention deleted.`);
  }, [interventions]);

  const handleOpenReportModal = useCallback((item: InterventionRequest) => {
    setReportModalIntervention(item);
  }, []);

  const handleOpenFeedbackModal = useCallback((item: InterventionRequest) => {
    setFeedbackModalIntervention(item);
  }, []);

  const handlePreviewPhoto = useCallback((photo: DefectPhoto) => {
    setPreviewPhoto(photo);
  }, []);

  const handleToggleUrgent = useCallback(() => {
    setOnlyUrgent(prev => !prev);
  }, []);

  // Quick inline update on card (Feature #3 & #4)
  const handleQuickUpdateIntervention = useCallback(async (interventionId: string, updates: Partial<InterventionRequest>) => {
    const target = interventions.find(i => i.id === interventionId);
    if (!target) return;
    const updated: InterventionRequest = {
      ...target,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await saveIntervention(updated);
    setInterventions(prev => prev.map(i => i.id === interventionId ? updated : i));
    showToast(`✅ Aggiornato: ${updated.code}`);
  }, [interventions]);

  // Project Summary PDF & WhatsApp (Feature #2)
  const handleDownloadProjectSummaryPDF = async () => {
    const { downloadProjectSummaryPDF } = await import('./lib/pdfGenerator');
    const projTitle = activeProjectObj ? activeProjectObj.name : 'Tutti i Progetti';
    downloadProjectSummaryPDF(projTitle, filteredInterventions);
    showToast(`📊 Riepilogo PDF generato per "${projTitle}"!`);
  };

  const handleShareProjectSummaryWhatsApp = async () => {
    const { shareProjectSummaryViaWhatsApp } = await import('./lib/pdfGenerator');
    const projTitle = activeProjectObj ? activeProjectObj.name : 'Tutti i Progetti';
    shareProjectSummaryViaWhatsApp(projTitle, filteredInterventions);
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
      projectName?: string;
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
        notes: `Creato via Smart Inbound Email da ${sender} in data ${receivedAt} per il progetto ${proj?.name || 'Generale'}.`,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        emailSource: {
          sender,
          receivedAt,
          subject,
          rawSnippet: message.slice(0, 180),
          projectId: proj?.id,
          projectName: proj?.name
        },
        emailHistory: [
          {
            id: `msg-${Date.now()}-1`,
            sender,
            receivedAt,
            subject,
            message: message || newTicket.title,
            action: 'created',
            projectId: proj?.id,
            projectName: proj?.name
          }
        ]
      };

      await saveIntervention(newIntervention);
      setInterventions(prev => [newIntervention, ...prev]);
      if (proj && activeProjectId !== 'all' && activeProjectId !== proj.id) {
        setActiveProjectId(proj.id);
      }
      showToast(`✉️ Creato nuovo intervento [${code}] registrato sul progetto "${proj?.name || 'Generale'}"!`);
    } else if (action === 'follow_up' && targetInterventionId) {
      const item = interventions.find(i => i.id === targetInterventionId);
      if (!item) return;

      const historyEntry = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender,
        receivedAt,
        subject,
        message,
        action: 'follow_up' as const,
        projectId: item.projectId,
        projectName: item.projectName
      };

      const updatedHistory = [...(item.emailHistory || []), historyEntry];
      const appendedNotes = item.notes
        ? `${item.notes}\n\n[Follow-up Email da ${sender} il ${receivedAt} - Progetto: ${item.projectName || 'Generale'}]:\n${message}`
        : `[Follow-up Email da ${sender} il ${receivedAt} - Progetto: ${item.projectName || 'Generale'}]:\n${message}`;

      const nextStatus = item.status === 'pending' || item.status === 'in_attesa' ? 'in_progress' : item.status;

      const updated: InterventionRequest = {
        ...item,
        status: nextStatus,
        notes: appendedNotes,
        updatedAt: new Date().toISOString(),
        emailSource: item.emailSource || { sender, receivedAt, subject, projectId: item.projectId, projectName: item.projectName },
        emailHistory: updatedHistory
      };

      await saveIntervention(updated);
      setInterventions(prev => prev.map(i => i.id === targetInterventionId ? updated : i));
      showToast(`🌸 Follow-up registrato su [${item.code}] (Progetto: ${item.projectName || 'Generale'})!`);
    } else if (action === 'close' && targetInterventionId) {
      const item = interventions.find(i => i.id === targetInterventionId);
      if (!item) return;

      const historyEntry = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender,
        receivedAt,
        subject,
        message,
        action: 'closed' as const,
        projectId: item.projectId,
        projectName: item.projectName
      };

      const updatedHistory = [...(item.emailHistory || []), historyEntry];
      const closeNote = `[Chiuso via Email da ${sender} il ${receivedAt} - Progetto: ${item.projectName || 'Generale'}]: ${message}`;
      const appendedNotes = item.notes ? `${item.notes}\n\n${closeNote}` : closeNote;

      const existingReport: TechnicianReport = item.report || {
        technicianName: currentUser?.name || 'Antigravity AI Assistant',
        interventionDate: receivedAt.split(' ')[0] || new Date().toISOString().split('T')[0],
        hoursWorked: 1,
        workDone: `Risoluzione confermata da email di ${sender} per ${item.projectName || 'il progetto'}.`,
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
        emailSource: item.emailSource || { sender, receivedAt, subject, projectId: item.projectId, projectName: item.projectName },
        emailHistory: updatedHistory
      };

      await saveIntervention(updated);
      setInterventions(prev => prev.map(i => i.id === targetInterventionId ? updated : i));
      showToast(`🟢 Intervento [${item.code}] chiuso da email (Progetto: ${item.projectName || 'Generale'})!`);
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  // Visible projects for this user (Memoized) — excludes Dendi & Workbank under "Lavori & Azioni Progetto"
  const visibleProjects = useMemo(() => {
    if (!currentUser) return [];
    return projects.filter(p => {
      if (activeCategoryTab === 'project_work') {
        const pName = p.name.toLowerCase();
        const pCode = p.code.toLowerCase();
        if (
          p.id === 'proj-workbank' ||
          pName.includes('workbank') ||
          pName.includes('wordbank') ||
          pName.includes('dendi') ||
          pCode.includes('dendi')
        ) {
          return false;
        }
      }
      if (isAdmin || currentUser.assignedProjectIds.includes('*')) return true;
      return currentUser.assignedProjectIds.includes(p.id);
    });
  }, [projects, currentUser, isAdmin, activeCategoryTab]);

  useEffect(() => {
    if (
      activeProjectId !== 'all' &&
      visibleProjects.length > 0 &&
      !visibleProjects.some(p => p.id === activeProjectId)
    ) {
      setActiveProjectId(visibleProjects[0].id);
    }
  }, [activeProjectId, visibleProjects]);

  // Counts for the 2 main tabs (Interventi & Guasti vs Lavori & Azioni Progetto)
  const categoryTabCounts = useMemo(() => {
    if (!currentUser) return { interventionsTotal: 0, interventionsOpen: 0, worksTotal: 0, worksOpen: 0 };
    const hasWildcard = isAdmin || currentUser.assignedProjectIds.includes('*');
    let interventionsTotal = 0;
    let interventionsOpen = 0;
    let worksTotal = 0;
    let worksOpen = 0;

    for (let idx = 0; idx < interventions.length; idx++) {
      const item = interventions[idx];
      if (!hasWildcard && item.projectId && !currentUser.assignedProjectIds.includes(item.projectId)) {
        continue;
      }
      if (activeProjectId !== 'all') {
        if (item.projectId && item.projectId !== activeProjectId) continue;
        if (!item.projectId && activeProjectId !== 'proj-workbank') continue;
      }
      const isWork = item.recordType === 'project_work';
      const isDone = item.status === 'completed' || item.status === 'completato';
      if (isWork) {
        worksTotal++;
        if (!isDone) worksOpen++;
      } else {
        interventionsTotal++;
        if (!isDone) interventionsOpen++;
      }
    }
    return { interventionsTotal, interventionsOpen, worksTotal, worksOpen };
  }, [interventions, currentUser, isAdmin, activeProjectId]);

  // Filter interventions by activeCategoryTab + permissions + active project + search term (Memoized)
  const filteredInterventions = useMemo(() => {
    if (!currentUser) return [];
    const q = searchTerm.trim().toLowerCase();
    const hasWildcard = isAdmin || currentUser.assignedProjectIds.includes('*');

    return interventions.filter(item => {
      // 0. Main View Tab filter ('intervention' vs 'project_work')
      const itemCategory: RecordCategory = item.recordType === 'project_work' ? 'project_work' : 'intervention';
      if (itemCategory !== activeCategoryTab) return false;

      // 1. User permission for project
      if (!hasWildcard) {
        if (item.projectId && !currentUser.assignedProjectIds.includes(item.projectId)) {
          return false;
        }
      }

      // 2. Selected project filter
      if (activeProjectId !== 'all') {
        if (item.projectId && item.projectId !== activeProjectId) return false;
        if (!item.projectId && activeProjectId !== 'proj-workbank') return false;
      }

      // 3. Only urgent
      if (onlyUrgent && item.priority !== 'urgent' && item.priority !== 'urgente') {
        return false;
      }

      // 4. Search query
      if (q) {
        const match = 
          item.code.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.siteName.toLowerCase().includes(q) ||
          item.clientName.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          (item.projectName && item.projectName.toLowerCase().includes(q)) ||
          (item.assignedTechnician && item.assignedTechnician.toLowerCase().includes(q)) ||
          (item.waitingReplyFrom && item.waitingReplyFrom.toLowerCase().includes(q)) ||
          (item.whatIDidSummary && item.whatIDidSummary.toLowerCase().includes(q)) ||
          (item.actionSteps && item.actionSteps.some(s => s.text.toLowerCase().includes(q))) ||
          (item.trackingLogs && item.trackingLogs.some(t => t.whatIDid.toLowerCase().includes(q) || (t.waitingReplyFrom && t.waitingReplyFrom.toLowerCase().includes(q))));
        if (!match) return false;
      }

      return true;
    });
  }, [interventions, currentUser, isAdmin, activeCategoryTab, activeProjectId, searchTerm, onlyUrgent]);

  // ================= SINGLE-PASS TASK DIVISION (TO DO / IN PROGRESS / COMPLETED / WAITING REPLY) =================
  const { pendingInterventions, inProgressInterventions, todoInterventions, completedInterventions, waitingReplyInterventions } = useMemo(() => {
    const pending: InterventionRequest[] = [];
    const inProgress: InterventionRequest[] = [];
    const todo: InterventionRequest[] = [];
    const completed: InterventionRequest[] = [];
    const waitingReply: InterventionRequest[] = [];

    for (let idx = 0; idx < filteredInterventions.length; idx++) {
      const i = filteredInterventions[idx];
      const isDone = i.status === 'completed' || i.status === 'completato';
      const hasWaitingReply = !isDone && Boolean(
        i.waitingReplyFrom || (i.trackingLogs && i.trackingLogs.some(t => t.awaitingReply && !t.replyReceived))
      );
      if (hasWaitingReply) {
        waitingReply.push(i);
      }

      if (isDone) {
        completed.push(i);
      } else {
        pending.push(i);
        const isInProg =
          i.status === 'in_progress' ||
          i.status === 'in_corso' ||
          i.report?.statusOutcome === 'waiting_for_parts' ||
          (i.report?.statusOutcome as string) === 'in_attesa_ricambi';
        if (isInProg) {
          inProgress.push(i);
        } else {
          todo.push(i);
        }
      }
    }

    return {
      pendingInterventions: pending,
      inProgressInterventions: inProgress,
      todoInterventions: todo,
      completedInterventions: completed,
      waitingReplyInterventions: waitingReply,
    };
  }, [filteredInterventions]);

  // Precompute project ticket counts and statuses in a single O(N) pass for the active tab
  const projectStatsMap = useMemo(() => {
    const map = new Map<string, { count: number; hasPending: boolean; hasInProgress: boolean; allResolved: boolean }>();
    for (let idx = 0; idx < interventions.length; idx++) {
      const item = interventions[idx];
      const itemCategory: RecordCategory = item.recordType === 'project_work' ? 'project_work' : 'intervention';
      if (itemCategory !== activeCategoryTab) continue;

      const pid = item.projectId;
      if (!pid) continue;
      let entry = map.get(pid);
      if (!entry) {
        entry = { count: 0, hasPending: false, hasInProgress: false, allResolved: true };
        map.set(pid, entry);
      }
      entry.count++;
      const isDone = item.status === 'completed' || item.status === 'completato';
      if (!isDone) {
        entry.allResolved = false;
      }
      if (item.status === 'in_progress' || item.status === 'in_corso' || item.report?.statusOutcome === 'waiting_for_parts' || (item.report?.statusOutcome as string) === 'in_attesa_ricambi') {
        if (!isDone) entry.hasInProgress = true;
      } else if (!isDone) {
        entry.hasPending = true;
      }
    }
    return map;
  }, [interventions, activeCategoryTab]);

  // If user is not authenticated, show Login screen
  if (!currentUser) {
    return <LoginScreen users={users} onLogin={handleLogin} />;
  }

  const activeProjectObj = projects.find(p => p.id === activeProjectId);

  const todoSectionItems =
    statusFilter === 'attesa_risposta'
      ? waitingReplyInterventions
      : statusFilter === 'all'
        ? todoInterventions
        : pendingInterventions;

  const showTodoSection =
    (statusFilter === 'all' || statusFilter === 'da_fare' || statusFilter === 'attesa_risposta') &&
    todoSectionItems.length > 0;
  const showInProgressSection =
    (statusFilter === 'all' || statusFilter === 'in_lavorazione') &&
    inProgressInterventions.length > 0;
  const showCompletedSection =
    (statusFilter === 'all' || statusFilter === 'fatti') &&
    completedInterventions.length > 0;

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

  // Status colors for Project Pills (using O(1) lookup from projectStatsMap):
  const getProjectStatusStyle = (projectId: string, isSelected: boolean) => {
    const stats = projectStatsMap.get(projectId);
    const count = stats?.count || 0;

    // 1. Rosa se non c'è nulla (0 ticket)
    if (count === 0) {
      return {
        count: 0,
        label: 'Empty (No tickets)',
        dotColor: 'bg-pink-400',
        dotPulse: false,
        btnClass: isSelected
          ? 'bg-pink-600 text-white border-pink-400 shadow-md shadow-pink-600/30 ring-2 ring-pink-400/40'
          : 'bg-pink-950/25 border-pink-500/40 text-pink-300 hover:bg-pink-900/40 hover:border-pink-400',
        badgeClass: isSelected ? 'bg-pink-900 text-white' : 'bg-pink-950/80 text-pink-300 border border-pink-700/50'
      };
    }

    // 2. Verde se è tutto risolto
    if (stats?.allResolved) {
      return {
        count,
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
    if (stats?.hasInProgress) {
      return {
        count,
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
      count,
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

        {/* ================= MAIN VIEW SWITCHER: 1. LAVORI & AZIONI PROGETTO vs 2. INTERVENTI & GUASTI ================= */}
        <div className="mb-4 sm:mb-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-2 sm:p-2.5 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
            {/* TAB 1: LAVORI & AZIONI PROGETTO */}
            <button
              onClick={() => setActiveCategoryTab('project_work')}
              className={`flex items-center justify-between sm:justify-start gap-2.5 px-3 sm:px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition border ${
                activeCategoryTab === 'project_work'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-indigo-400 shadow-lg shadow-indigo-900/40'
                  : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <ClipboardList className="w-4 h-4 shrink-0" />
                <div className="text-left leading-tight min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="truncate">Lavori & Azioni Progetto</span>
                    <span className={`text-[10px] font-mono px-2 py-0.2 rounded-full ${
                      activeCategoryTab === 'project_work'
                        ? 'bg-indigo-950/80 text-indigo-200 border border-indigo-300/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {categoryTabCounts.worksTotal}
                    </span>
                    {categoryTabCounts.worksOpen > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500 text-white">
                        {categoryTabCounts.worksOpen} da fare
                      </span>
                    )}
                  </div>
                  <span className={`hidden lg:block text-[10px] font-normal ${
                    activeCategoryTab === 'project_work' ? 'text-indigo-100' : 'text-slate-500'
                  }`}>
                    Lavori pianificati, attività di cantiere e checklist azioni sui progetti
                  </span>
                </div>
              </div>
            </button>

            {/* TAB 2: INTERVENTI & GUASTI */}
            <button
              onClick={() => setActiveCategoryTab('intervention')}
              className={`flex items-center justify-between sm:justify-start gap-2.5 px-3 sm:px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition border ${
                activeCategoryTab === 'intervention'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white border-blue-400 shadow-lg shadow-blue-900/40'
                  : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Wrench className="w-4 h-4 shrink-0" />
                <div className="text-left leading-tight min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="truncate">Interventi & Guasti</span>
                    <span className={`text-[10px] font-mono px-2 py-0.2 rounded-full ${
                      activeCategoryTab === 'intervention'
                        ? 'bg-blue-950/80 text-blue-200 border border-blue-300/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {categoryTabCounts.interventionsTotal}
                    </span>
                    {categoryTabCounts.interventionsOpen > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500 text-white">
                        {categoryTabCounts.interventionsOpen} aperti
                      </span>
                    )}
                  </div>
                  <span className={`hidden lg:block text-[10px] font-normal ${
                    activeCategoryTab === 'intervention' ? 'text-blue-100' : 'text-slate-500'
                  }`}>
                    Assistenza tecnica, chiamate guasto e riparazioni
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* Quick CTA for Active Tab */}
          <button
            onClick={() => setIsNewModalOpen(true)}
            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition active:scale-95 shrink-0 ${
              activeCategoryTab === 'project_work'
                ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/40'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/40'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>{activeCategoryTab === 'project_work' ? '+ Nuovo Lavoro / Azione' : '+ Nuovo Intervento'}</span>
          </button>
        </div>
        
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

            <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
              {/* Feature #2: 1-Click Project Summary PDF & WhatsApp */}
              {filteredInterventions.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleDownloadProjectSummaryPDF}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow transition active:scale-95"
                    title="Scarica tabella PDF con lo stato aggiornato del progetto selezionato (per riunioni)"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>📊 PDF Stato Progetto</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShareProjectSummaryWhatsApp}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition active:scale-95"
                    title="Invia riepilogo testuale del progetto su WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>💬 Riepilogo WA</span>
                  </button>
                </>
              )}

              {isAdmin && (
                <>
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
                </>
              )}
            </div>
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
              const isSelected = activeProjectId === p.id;
              const style = getProjectStatusStyle(p.id, isSelected);
              const count = style.count;

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

        {/* Filter and Search Bar with Red / Pink / Green / Waiting Reply quick switch */}
        <FilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onlyUrgent={onlyUrgent}
          onToggleUrgent={handleToggleUrgent}
          pendingCount={statusFilter === 'all' ? todoInterventions.length : pendingInterventions.length}
          inProgressCount={inProgressInterventions.length}
          completedCount={completedInterventions.length}
          waitingReplyCount={waitingReplyInterventions.length}
          activeCategoryTab={activeCategoryTab}
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
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertCircle className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                    <span>
                      {statusFilter === 'attesa_risposta'
                        ? '⏳ IN ATTESA DI RISPOSTA (EMAIL / WHATSAPP / CLIENTE)'
                        : activeCategoryTab === 'project_work'
                          ? 'LAVORI & AZIONI DA FARE SUL PROGETTO'
                          : 'TO DO & OPEN INTERVENTIONS'}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-sm">
                      {todoSectionItems.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-rose-300/80">
                    {statusFilter === 'attesa_risposta'
                      ? 'Lavori e interventi in cui stai aspettando risposta da cliente, direzione lavori o fornitore'
                      : activeCategoryTab === 'project_work'
                        ? 'Attività di progetto, modifiche e azioni pianificate da iniziare'
                        : 'Scheduled work, awaiting technician dispatch'}
                  </p>
                </div>
              </div>
            </div>

            {/* Red Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {todoSectionItems.map((intervention) => (
                <InterventionCard
                  key={intervention.id}
                  intervention={intervention}
                  currentRole={currentUser.role}
                  currentUserName={currentUser.name}
                  onTakeCharge={handleTakeCharge}
                  onOpenReportModal={handleOpenReportModal}
                  onOpenFeedbackModal={handleOpenFeedbackModal}
                  onPreviewPhoto={handlePreviewPhoto}
                  onDelete={handleDelete}
                  onToggleActionStep={handleToggleActionStep}
                  onAddActionStep={handleAddActionStep}
                  onDeleteActionStep={handleDeleteActionStep}
                  onAddTrackingEntry={handleAddTrackingEntry}
                  onMarkReplyReceived={handleMarkReplyReceived}
                  onDeleteTrackingEntry={handleDeleteTrackingEntry}
                  onQuickUpdate={handleQuickUpdateIntervention}
                />
              ))}
            </div>
          </section>
        )}

        {/* ================= SECTION 2: 🌸 IN PROGRESS & WAITING FOR PARTS (PINK TONES) ================= */}
        {!loading && showInProgressSection && (
          <section className="mb-10">
            {/* Pink Section Header */}
            <div className="flex items-center justify-between p-3.5 mb-4 rounded-2xl bg-gradient-to-r from-pink-950/70 via-slate-900 to-slate-900 border border-pink-700/50 shadow-lg shadow-pink-950/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 shrink-0">
                  <Clock className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                    <span>{activeCategoryTab === 'project_work' ? 'LAVORI & AZIONI IN CORSO' : 'IN PROGRESS & WAITING FOR PARTS'}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-pink-600 text-white shadow-sm">
                      {inProgressInterventions.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-pink-300/80">
                    {activeCategoryTab === 'project_work'
                      ? 'Lavori di progetto avviati, attività in esecuzione e follow-up attivi'
                      : 'Active on-site tasks, inspections and orders awaiting spare parts'}
                  </p>
                </div>
              </div>
            </div>

            {/* Pink Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inProgressInterventions.map((intervention) => (
                <InterventionCard
                  key={intervention.id}
                  intervention={intervention}
                  currentRole={currentUser.role}
                  currentUserName={currentUser.name}
                  onTakeCharge={handleTakeCharge}
                  onOpenReportModal={handleOpenReportModal}
                  onOpenFeedbackModal={handleOpenFeedbackModal}
                  onPreviewPhoto={handlePreviewPhoto}
                  onDelete={handleDelete}
                  onToggleActionStep={handleToggleActionStep}
                  onAddActionStep={handleAddActionStep}
                  onDeleteActionStep={handleDeleteActionStep}
                  onAddTrackingEntry={handleAddTrackingEntry}
                  onMarkReplyReceived={handleMarkReplyReceived}
                  onDeleteTrackingEntry={handleDeleteTrackingEntry}
                  onQuickUpdate={handleQuickUpdateIntervention}
                />
              ))}
            </div>
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
                    <span>{activeCategoryTab === 'project_work' ? 'LAVORI & AZIONI PROGETTO COMPLETATI' : 'COMPLETED INTERVENTIONS'}</span>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedInterventions.map((intervention) => (
                  <InterventionCard
                    key={intervention.id}
                    intervention={intervention}
                    currentRole={currentUser.role}
                    currentUserName={currentUser.name}
                    onTakeCharge={handleTakeCharge}
                    onOpenReportModal={handleOpenReportModal}
                    onOpenFeedbackModal={handleOpenFeedbackModal}
                    onPreviewPhoto={handlePreviewPhoto}
                    onDelete={handleDelete}
                    onToggleActionStep={handleToggleActionStep}
                    onAddActionStep={handleAddActionStep}
                    onDeleteActionStep={handleDeleteActionStep}
                    onAddTrackingEntry={handleAddTrackingEntry}
                    onMarkReplyReceived={handleMarkReplyReceived}
                    onDeleteTrackingEntry={handleDeleteTrackingEntry}
                    onQuickUpdate={handleQuickUpdateIntervention}
                  />
                ))}
            </div>
          </section>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-4 text-center text-xs text-slate-500">
        Field Service Management &copy; {new Date().getFullYear()} — Administered by Costantino
      </footer>

      {/* Lazy-Loaded Modals (mounted only when active) */}
      <Suspense fallback={null}>
        {isNewModalOpen && (
          <NewRequestModal
            isOpen={isNewModalOpen}
            onClose={() => setIsNewModalOpen(false)}
            onSubmit={handleCreateIntervention}
            currentUserName={currentUser.name}
            existingInterventions={interventions}
            projects={visibleProjects}
            defaultProjectId={activeProjectId !== 'all' ? activeProjectId : undefined}
            defaultRecordType={activeCategoryTab}
            onAddNewProject={isAdmin ? () => {
              setIsNewModalOpen(false);
              setOpenProjectCreateDirectly(true);
              setIsProjectsModalOpen(true);
            } : undefined}
          />
        )}

        {reportModalIntervention && (
          <TechnicianReportModal
            isOpen={Boolean(reportModalIntervention)}
            onClose={() => setReportModalIntervention(null)}
            intervention={reportModalIntervention}
            onSaveReport={handleSaveReport}
            currentTechnicianName={currentUser.name}
          />
        )}

        {feedbackModalIntervention && (
          <ClientFeedbackModal
            isOpen={Boolean(feedbackModalIntervention)}
            onClose={() => setFeedbackModalIntervention(null)}
            intervention={feedbackModalIntervention}
            onSaveFeedback={handleSaveFeedback}
            currentClientName={currentUser.name}
          />
        )}

        {previewPhoto && (
          <ImagePreviewModal
            photo={previewPhoto}
            onClose={() => setPreviewPhoto(null)}
          />
        )}

        {isAdmin && isAdminModalOpen && (
          <AdminUsersModal
            isOpen={isAdminModalOpen}
            onClose={() => setIsAdminModalOpen(false)}
            users={users}
            projects={projects}
            onSaveUser={handleSaveUser}
            onDeleteUser={handleDeleteUser}
          />
        )}

        {isAdmin && isProjectsModalOpen && (
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

        {isInstallModalOpen && (
          <PwaInstallModal
            isOpen={isInstallModalOpen}
            onClose={() => setIsInstallModalOpen(false)}
            onInstalledSuccess={() => showToast('🎉 App successfully installed to your Home Screen!')}
          />
        )}

        {isBackupModalOpen && (
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
        )}

        {isSmartEmailModalOpen && (
          <SmartEmailModal
            isOpen={isSmartEmailModalOpen}
            onClose={() => setIsSmartEmailModalOpen(false)}
            interventions={interventions}
            projects={projects}
            onExecuteEmailAction={handleExecuteEmailAction}
          />
        )}
      </Suspense>

    </div>
  );
}

export default App;
