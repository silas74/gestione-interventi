import { InterventionRequest, UserAccount, Project } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_INTERVENTIONS = 'interventi_data_v2';
const STORAGE_USERS = 'interventi_users_v2';
const STORAGE_PROJECTS = 'interventi_projects_v2';
const STORAGE_SESSION = 'interventi_session_v2';

// 1. Progetti Iniziali con Progetto Workbank
const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-workbank',
    code: 'WRKB',
    name: 'Workbank',
    description: 'Impianto Domotico & Automazione Uffici KNX / DALI',
    clientName: 'Workbank Direzione',
    siteAddress: 'Edificio Direzionale, Milano',
    createdAt: '2026-09-01T08:00:00Z'
  },
  {
    id: 'proj-logistica',
    code: 'LOG-N',
    name: 'Logistica Nord',
    description: 'Impianti pneumatici, quadri e rulliere di smistamento',
    clientName: 'ACX Logistica',
    siteAddress: 'Stabilimento 2, Agrate Brianza',
    createdAt: '2026-09-10T08:00:00Z'
  }
];

// 2. Utenti Iniziali (Costantino è SuperAdmin, gli altri hanno privilegi utente/tecnico)
const INITIAL_USERS: UserAccount[] = [
  {
    id: 'usr-costantino',
    username: 'costantino',
    password: 'password123',
    name: 'Costantino',
    role: 'admin', // SuperAdmin: può modificare utenti, password, progetti e privilegi
    assignedProjectIds: ['*'], // Accesso totale a tutti i progetti
    createdAt: '2026-09-01T08:00:00Z'
  },
  {
    id: 'usr-franco',
    username: 'franco',
    password: 'user123',
    name: 'Franco (Tecnico)',
    role: 'tecnico',
    assignedProjectIds: ['proj-workbank', 'proj-logistica'],
    createdAt: '2026-09-02T08:00:00Z'
  },
  {
    id: 'usr-mario',
    username: 'mario',
    password: 'user123',
    name: 'Mario Rossi',
    role: 'utente',
    assignedProjectIds: ['proj-workbank'],
    createdAt: '2026-09-05T08:00:00Z'
  }
];

// 3. Interventi Iniziali con i 4 interventi richiesti per Workbank (2 già fatti e 2 da fare)
const INITIAL_INTERVENTIONS: InterventionRequest[] = [
  // Intervento già fatto 1 - Workbank
  {
    id: 'int-wb-001',
    code: 'INT-2026-WB1',
    projectId: 'proj-workbank',
    projectName: 'Workbank',
    title: 'Studio della sostituzione o integrazione sensori con MDT SCN-P360D4.03',
    siteName: 'Workbank - Area Uffici',
    siteAddress: 'Edificio Direzionale, Milano',
    clientName: 'Mario Rossi',
    clientContact: '+39 02 8877665',
    description: 'Studio della sostituzione o integrazione dei sensori con MDT SCN-P360D4.03, con maggiore copertura e più settori di rilevamento. Il sensore MDT permette infatti la configurazione indipendente dei canali luce, sensibilità, tempi e modalità operative.',
    desiredAccessDate: '2026-09-18',
    desiredAccessTime: '09:00',
    priority: 'alta',
    defectPhotos: [],
    notes: 'Accesso aree open space e sale riunioni.',
    status: 'completato',
    createdAt: '2026-09-15T08:30:00Z',
    updatedAt: '2026-09-18T16:00:00Z',
    assignedTechnician: 'Costantino',
    report: {
      technicianName: 'Costantino',
      interventionDate: '2026-09-18',
      hoursWorked: 4.5,
      workDone: 'Eseguito sopralluogo tecnico e studio di fattibilità per l\'adozione dei sensori di presenza MDT SCN-P360D4.03. Mappati i settori di copertura perimetrale e interna, analizzate le 4 zone PIR indipendenti. Verificata la piena compatibilità con il bus KNX esistente per il controllo costante della luminosità e la gestione presenza a canali multipli separati.',
      materialsUsed: 'Documentazione tecnica e schemi di calibrazione copertura PIR',
      technicalNotes: 'La sostituzione consentirà una regolazione della luce naturale/artificiale ottimizzata senza zone d\'ombra.',
      statusOutcome: 'risolto',
      completedAt: '2026-09-18T16:00:00Z'
    },
    clientFeedback: {
      submittedAt: '2026-09-19T09:00:00Z',
      clientName: 'Mario Rossi',
      rating: 5,
      feedbackStatus: 'approvato',
      notes: 'Studio completo e dettagliato. Procediamo con il piano stabilito.'
    }
  },

  // Intervento già fatto 2 - Workbank
  {
    id: 'int-wb-002',
    code: 'INT-2026-WB2',
    projectId: 'proj-workbank',
    projectName: 'Workbank',
    title: 'Analisi della regolazione luminosa tramite sensori esistenti Zennio EyeZen',
    siteName: 'Workbank - Settore Est',
    siteAddress: 'Edificio Direzionale, Milano',
    clientName: 'Mario Rossi',
    clientContact: '+39 02 8877665',
    description: 'Analisi della regolazione luminosa tramite sensori esistenti Zennio EyeZen. EyeZen dispone già di misura della luminosità, due canali di constant light control e oggetti KNX per dimming manuale e automatico.',
    desiredAccessDate: '2026-09-21',
    desiredAccessTime: '10:00',
    priority: 'media',
    defectPhotos: [],
    notes: 'Verifica preliminare parametri ETS sui sensori installati a plafone.',
    status: 'completato',
    createdAt: '2026-09-19T11:00:00Z',
    updatedAt: '2026-09-21T15:30:00Z',
    assignedTechnician: 'Costantino',
    report: {
      technicianName: 'Costantino',
      interventionDate: '2026-09-21',
      hoursWorked: 3.5,
      workDone: 'Interrogati i parametri di configurazione dei sensori Zennio EyeZen installati. Testata la risposta del sensore luxmetro integrato e la regolazione a 2 canali proporzionale per il dimmer DALI. Verificato il corretto funzionamento degli oggetti di comunicazione per il passaggio da modalità automatica a comando manuale da pulsantiera.',
      materialsUsed: 'Interfaccia USB/KNX per diagnostica ETS e luxmetro di riferimento',
      technicalNotes: 'I sensori rispondono regolarmente; pronti per la successiva fase di commissioning finale stanza per stanza.',
      statusOutcome: 'risolto',
      completedAt: '2026-09-21T15:30:00Z'
    },
    clientFeedback: {
      submittedAt: '2026-09-22T08:45:00Z',
      clientName: 'Mario Rossi',
      rating: 5,
      feedbackStatus: 'approvato',
      notes: 'Ottima analisi, confermato il comportamento dei sensori EyeZen.'
    }
  },

  // Intervento da fare 1 - Workbank
  {
    id: 'int-wb-003',
    code: 'INT-2026-WB3',
    projectId: 'proj-workbank',
    projectName: 'Workbank',
    title: 'Spostare l’alimentazione KNX dalla rete normale alla linea sotto UPS',
    siteName: 'Workbank - Quadro Generale Servizi',
    siteAddress: 'Edificio Direzionale, Milano',
    clientName: 'Mario Rossi',
    clientContact: '+39 02 8877665',
    description: 'Spostare l’alimentazione KNX dalla rete normale alla linea sotto UPS per garantire la continuità operativa del bus domotico e la sicurezza delle comunicazioni di controllo anche in caso di blackout o microinterruzioni di rete.',
    desiredAccessDate: '2026-09-28',
    desiredAccessTime: '08:00',
    priority: 'alta',
    defectPhotos: [],
    notes: 'Attività da eseguire in orario non di punta per breve sezionamento linee.',
    status: 'in_attesa',
    createdAt: '2026-09-24T10:00:00Z',
    updatedAt: '2026-09-24T10:00:00Z',
    assignedTechnician: 'Costantino'
  },

  // Intervento da fare 2 - Workbank
  {
    id: 'int-wb-004',
    code: 'INT-2026-WB4',
    projectId: 'proj-workbank',
    projectName: 'Workbank',
    title: 'Programmazione e commissioning del sistema KNX/DALI per dimming uffici',
    siteName: 'Workbank - Piano 1 e 2',
    siteAddress: 'Edificio Direzionale, Milano',
    clientName: 'Mario Rossi',
    clientContact: '+39 02 8877665',
    description: 'Programmazione e commissioning del sistema KNX/DALI per l’implementazione del dimming negli uffici, inclusa configurazione ETS, associazione sensori e gruppi DALI, regolazione automatica della luminosità, setpoint, livelli min/max, sensibilità, tempi di presenza, calibrazione lux, feedback, ritorno automatico dopo comando manuale, test funzionali e fine tuning stanza per stanza.',
    desiredAccessDate: '2026-09-29',
    desiredAccessTime: '08:30',
    priority: 'urgente',
    defectPhotos: [],
    notes: 'È richiesto accesso a tutti gli uffici operativi e sale riunioni per collaudo fotometrico.',
    status: 'in_attesa',
    createdAt: '2026-09-24T10:15:00Z',
    updatedAt: '2026-09-24T10:15:00Z',
    assignedTechnician: 'Costantino'
  }
];

// ================= GESTIONE PROGETTI =================

export function fetchProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_PROJECTS);
    if (!raw) {
      localStorage.setItem(STORAGE_PROJECTS, JSON.stringify(INITIAL_PROJECTS));
      return INITIAL_PROJECTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_PROJECTS;
  }
}

export function saveProject(project: Project): void {
  const current = fetchProjects();
  const idx = current.findIndex(p => p.id === project.id);
  let updated: Project[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = project;
  } else {
    updated = [project, ...current];
  }
  localStorage.setItem(STORAGE_PROJECTS, JSON.stringify(updated));
}

export function deleteProject(id: string): void {
  const current = fetchProjects();
  const updated = current.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_PROJECTS, JSON.stringify(updated));
}

// ================= GESTIONE UTENTI & PRIVILEGI =================

export function fetchUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_USERS;
  }
}

export function saveUser(user: UserAccount): void {
  const current = fetchUsers();
  const idx = current.findIndex(u => u.id === user.id);
  let updated: UserAccount[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = user;
  } else {
    updated = [...current, user];
  }
  localStorage.setItem(STORAGE_USERS, JSON.stringify(updated));
}

export function deleteUser(id: string): void {
  const current = fetchUsers();
  // Impedisci l'eliminazione di Costantino
  const updated = current.filter(u => u.id !== id || u.username === 'costantino');
  localStorage.setItem(STORAGE_USERS, JSON.stringify(updated));
}

// ================= SESSIONE / LOGIN =================

export function getCurrentSession(): UserAccount | null {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCurrentSession(user: UserAccount): void {
  localStorage.setItem(STORAGE_SESSION, JSON.stringify(user));
}

export function clearCurrentSession(): void {
  localStorage.removeItem(STORAGE_SESSION);
}

// ================= GESTIONE INTERVENTI =================

export async function fetchInterventions(): Promise<InterventionRequest[]> {
  try {
    const raw = localStorage.getItem(STORAGE_INTERVENTIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_INTERVENTIONS, JSON.stringify(INITIAL_INTERVENTIONS));
      return INITIAL_INTERVENTIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_INTERVENTIONS;
  }
}

export async function saveIntervention(item: InterventionRequest): Promise<void> {
  const current = await fetchInterventions();
  const index = current.findIndex(i => i.id === item.id);
  let updatedList: InterventionRequest[];

  if (index >= 0) {
    updatedList = [...current];
    updatedList[index] = item;
  } else {
    updatedList = [item, ...current];
  }

  localStorage.setItem(STORAGE_INTERVENTIONS, JSON.stringify(updatedList));

  // Sync su Supabase se configurato
  if (isSupabaseConfigured) {
    try {
      await supabase.from('interventi').upsert({
        id: item.id,
        code: item.code,
        title: item.title,
        siteName: item.siteName,
        siteAddress: item.siteAddress,
        clientName: item.clientName,
        clientContact: item.clientContact,
        description: item.description,
        desiredAccessDate: item.desiredAccessDate,
        desiredAccessTime: item.desiredAccessTime,
        priority: item.priority,
        defectPhotos: item.defectPhotos,
        notes: item.notes,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        assignedTechnician: item.assignedTechnician,
        report: item.report,
        clientFeedback: item.clientFeedback
      });
    } catch (err) {
      console.warn('Could not sync to Supabase table:', err);
    }
  }
}

export async function deleteIntervention(id: string): Promise<void> {
  const current = await fetchInterventions();
  const updated = current.filter(i => i.id !== id);
  localStorage.setItem(STORAGE_INTERVENTIONS, JSON.stringify(updated));

  if (isSupabaseConfigured) {
    try {
      await supabase.from('interventi').delete().eq('id', id);
    } catch (err) {
      console.warn('Could not delete from Supabase:', err);
    }
  }
}

export function generateNextCode(currentItems: InterventionRequest[], projectCode = 'INT'): string {
  const year = new Date().getFullYear();
  const count = currentItems.length + 1;
  const pad = String(count).padStart(3, '0');
  return `${projectCode}-${year}-${pad}`;
}
