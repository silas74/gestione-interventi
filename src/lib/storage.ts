import { InterventionRequest, UserAccount, Project } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_INTERVENTIONS = 'interventi_data_v3';
const STORAGE_USERS = 'interventi_users_v3';
const STORAGE_PROJECTS = 'interventi_projects_v3';
const STORAGE_SESSION = 'interventi_session_v3';

// 1. Initial Projects with Workbank Project
const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-workbank',
    code: 'WRKB',
    name: 'Workbank',
    description: 'Smart Building & Office Automation KNX / DALI',
    clientName: 'Workbank Headquarters',
    siteAddress: 'Corporate Office Building, Milan',
    createdAt: '2026-09-01T08:00:00Z'
  },
  {
    id: 'proj-logistica',
    code: 'LOG-N',
    name: 'North Logistics',
    description: 'Industrial sorting conveyors, pneumatic lines and electrical distribution',
    clientName: 'ACX Logistics Ltd',
    siteAddress: 'Facility 2, Agrate Brianza',
    createdAt: '2026-09-10T08:00:00Z'
  }
];

// 2. Initial Users with Cryptographic Salted SHA-256 Hashes (Zero Plaintext in bundle)
const INITIAL_USERS: UserAccount[] = [
  {
    id: 'usr-costantino',
    username: 'costantino',
    passwordHash: '6db744f3da10edfeec0bb0e25057d94b6fd3f15d7f4f323171cc3f81153302dc',
    salt: '7f8a9b2c3d4e5f60',
    name: 'Costantino',
    role: 'admin', // SuperAdmin: can edit everything, create users, assign passwords & projects
    phone: '+39 348 1122334',
    assignedProjectIds: ['*'], // Full access to all projects
    createdAt: '2026-09-01T08:00:00Z'
  },
  {
    id: 'usr-franco',
    username: 'franco',
    passwordHash: '7301917269638bc8bd6644876f6115c7079dc0eeb1d9098d931c55c549a3e4e9',
    salt: '1a2b3c4d5e6f7a8b',
    name: 'Franco (Technician)',
    role: 'technician',
    phone: '+39 335 9988776',
    assignedProjectIds: ['proj-workbank', 'proj-logistica'],
    createdAt: '2026-09-02T08:00:00Z'
  },
  {
    id: 'usr-mario',
    username: 'mario',
    passwordHash: '022cff92801067e57d8ebe0ef66eb89ed2832e8f2161679b981489e06bc14628',
    salt: '9e8d7c6b5a4f3e2d',
    name: 'Mario Rossi',
    role: 'user',
    phone: '+39 340 5566778',
    assignedProjectIds: ['proj-workbank'],
    createdAt: '2026-09-05T08:00:00Z'
  }
];

// 3. Initial Interventions with the 4 Workbank tasks (2 completed, 2 to do)
const INITIAL_INTERVENTIONS: InterventionRequest[] = [
  // Completed Task 1 - Workbank
  {
    id: 'int-wb-001',
    code: 'INT-2026-WB1',
    projectId: 'proj-workbank',
    projectName: 'Workbank',
    title: 'Study of sensor replacement or integration with MDT SCN-P360D4.03',
    siteName: 'Workbank - Office Areas',
    siteAddress: 'Corporate Office Building, Milan',
    clientName: 'Mario Rossi',
    clientContact: '+39 347 8877665',
    description: 'Study of sensor replacement or integration with MDT SCN-P360D4.03, providing wider coverage and multiple detection sectors. The MDT sensor enables independent configuration of light channels, sensitivity, delay times, and operating modes.',
    desiredAccessDate: '2026-09-18',
    desiredAccessTime: '09:00',
    priority: 'high',
    defectPhotos: [],
    notes: 'Access to open spaces and executive conference rooms.',
    status: 'completed',
    createdAt: '2026-09-15T08:30:00Z',
    updatedAt: '2026-09-18T16:00:00Z',
    assignedTechnician: 'Costantino',
    report: {
      technicianName: 'Costantino',
      interventionDate: '2026-09-18',
      hoursWorked: 4.5,
      workDone: 'Performed on-site survey and feasibility study for deploying MDT SCN-P360D4.03 presence sensors. Mapped internal and perimeter coverage zones, analyzed 4 independent PIR detection sectors. Confirmed full compatibility with existing KNX bus for daylight harvesting and multi-channel presence logic.',
      materialsUsed: 'Technical documentation and PIR coverage calibration diagrams',
      technicalNotes: 'Sensor upgrade will enable optimized daylight regulation without shadow blind spots.',
      statusOutcome: 'resolved',
      completedAt: '2026-09-18T16:00:00Z'
    },
    clientFeedback: {
      submittedAt: '2026-09-19T09:00:00Z',
      clientName: 'Mario Rossi',
      rating: 5,
      feedbackStatus: 'approved',
      notes: 'Thorough and well-documented study. Approved to proceed as scheduled.'
    }
  },

  // Completed Task 2 - Workbank
  {
    id: 'int-wb-002',
    code: 'INT-2026-WB2',
    projectId: 'proj-workbank',
    projectName: 'Workbank',
    title: 'Analysis of light regulation using existing Zennio EyeZen sensors',
    siteName: 'Workbank - East Wing',
    siteAddress: 'Corporate Office Building, Milan',
    clientName: 'Mario Rossi',
    clientContact: '+39 347 8877665',
    description: 'Analysis of light regulation using existing Zennio EyeZen sensors. EyeZen features built-in illuminance measurement, dual constant light control channels, and KNX communication objects for manual and automatic dimming.',
    desiredAccessDate: '2026-09-21',
    desiredAccessTime: '10:00',
    priority: 'medium',
    defectPhotos: [],
    notes: 'Preliminary verification of ETS parameters on ceiling flush sensors.',
    status: 'completed',
    createdAt: '2026-09-19T11:00:00Z',
    updatedAt: '2026-09-21T15:30:00Z',
    assignedTechnician: 'Costantino',
    report: {
      technicianName: 'Costantino',
      interventionDate: '2026-09-21',
      hoursWorked: 3.5,
      workDone: 'Audited configuration parameters of installed Zennio EyeZen sensors. Tested built-in lux meter response and 2-channel proportional regulation for DALI dimmers. Confirmed correct telegram exchange for switching between automatic presence dimming and manual push-button override.',
      materialsUsed: 'USB/KNX interface for ETS diagnostics and calibrated reference lux meter',
      technicalNotes: 'Sensors operate reliably; ready for subsequent room-by-room commissioning phase.',
      statusOutcome: 'resolved',
      completedAt: '2026-09-21T15:30:00Z'
    },
    clientFeedback: {
      submittedAt: '2026-09-22T08:45:00Z',
      clientName: 'Mario Rossi',
      rating: 5,
      feedbackStatus: 'approved',
      notes: 'Excellent assessment, confirmed the expected behavior of EyeZen units.'
    }
  },

  // To Do Task 1 - Workbank
  {
    id: 'int-wb-003',
    code: 'INT-2026-WB3',
    projectId: 'proj-workbank',
    projectName: 'Workbank',
    title: 'Relocate KNX power supply from regular mains to UPS backed line',
    siteName: 'Workbank - Main Electrical Distribution Panel',
    siteAddress: 'Corporate Office Building, Milan',
    clientName: 'Mario Rossi',
    clientContact: '+39 347 8877665',
    description: 'Relocate KNX power supply from regular mains to UPS backed line to ensure uninterruptible bus operation and secure automated controls during grid outages or micro-interruptions.',
    desiredAccessDate: '2026-09-28',
    desiredAccessTime: '08:00',
    priority: 'high',
    defectPhotos: [],
    notes: 'Schedule during low-traffic hours for short electrical panel isolation.',
    status: 'pending',
    createdAt: '2026-09-24T10:00:00Z',
    updatedAt: '2026-09-24T10:00:00Z',
    assignedTechnician: 'Costantino'
  },

  // To Do Task 2 - Workbank
  {
    id: 'int-wb-004',
    code: 'INT-2026-WB4',
    projectId: 'proj-workbank',
    projectName: 'Workbank',
    title: 'Programming and commissioning of KNX/DALI system for office dimming',
    siteName: 'Workbank - Floor 1 & 2',
    siteAddress: 'Corporate Office Building, Milan',
    clientName: 'Mario Rossi',
    clientContact: '+39 347 8877665',
    description: 'Programming and commissioning of the KNX/DALI system for office daylight harvesting and dimming, including ETS configuration, sensor and DALI group bindings, automatic lux regulation, setpoints, min/max thresholds, sensitivity, presence delay timers, lux calibration, status feedback, automatic return after manual override, functional testing, and room-by-room fine-tuning.',
    desiredAccessDate: '2026-09-29',
    desiredAccessTime: '08:30',
    priority: 'urgent',
    defectPhotos: [],
    notes: 'Access required to all operational offices and meeting rooms for photometric testing.',
    status: 'pending',
    createdAt: '2026-09-24T10:15:00Z',
    updatedAt: '2026-09-24T10:15:00Z',
    assignedTechnician: 'Costantino'
  }
];

// ================= PROJECT MANAGEMENT =================

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

// ================= USER MANAGEMENT & PERMISSIONS =================

export function fetchUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    const parsed = JSON.parse(raw);
    // Automatic security migration: if legacy plaintext passwords are found, upgrade immediately
    if (Array.isArray(parsed) && parsed.some((u: any) => !u.passwordHash || u.password)) {
      localStorage.setItem(STORAGE_USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return parsed;
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
  // Prevent deleting Costantino
  const updated = current.filter(u => u.id !== id || u.username === 'costantino');
  localStorage.setItem(STORAGE_USERS, JSON.stringify(updated));
}

// ================= SESSION / AUTH =================

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

// ================= INTERVENTION MANAGEMENT =================

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

  // Sync with Supabase if configured
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

// ================= BACKUP & RESTORE (JSON) =================

export interface FullBackupPayload {
  version: string;
  exportedAt: string;
  app: string;
  interventions: InterventionRequest[];
  projects: Project[];
  users: UserAccount[];
}

export async function createFullBackupPayload(): Promise<FullBackupPayload> {
  const interventions = await fetchInterventions();
  const projects = fetchProjects();
  const users = fetchUsers();

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    app: 'FieldService_Interventi',
    interventions,
    projects,
    users
  };
}

export async function exportBackupToFile(): Promise<{ filename: string; sizeKb: number }> {
  const payload = await createFullBackupPayload();
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `interventi_backup_${dateStr}.json`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);

  return {
    filename,
    sizeKb: Math.round(blob.size / 1024)
  };
}

export function restoreBackupFromJson(jsonString: string): {
  success: boolean;
  message: string;
  interventions?: InterventionRequest[];
  projects?: Project[];
  users?: UserAccount[];
} {
  try {
    const data = JSON.parse(jsonString);

    if (!data || typeof data !== 'object') {
      return { success: false, message: 'Invalid JSON file format.' };
    }

    if (!Array.isArray(data.interventions) && !Array.isArray(data.projects)) {
      return { success: false, message: 'JSON file does not contain valid interventions or projects.' };
    }

    const restoredInterventions: InterventionRequest[] = Array.isArray(data.interventions) ? data.interventions : [];
    const restoredProjects: Project[] = Array.isArray(data.projects) ? data.projects : [];
    const restoredUsers: UserAccount[] = Array.isArray(data.users) ? data.users : [];

    if (restoredInterventions.length > 0) {
      localStorage.setItem(STORAGE_INTERVENTIONS, JSON.stringify(restoredInterventions));
    }
    if (restoredProjects.length > 0) {
      localStorage.setItem(STORAGE_PROJECTS, JSON.stringify(restoredProjects));
    }
    if (restoredUsers.length > 0) {
      localStorage.setItem(STORAGE_USERS, JSON.stringify(restoredUsers));
    }

    return {
      success: true,
      message: `Successfully restored ${restoredInterventions.length} interventions, ${restoredProjects.length} projects, and ${restoredUsers.length} users.`,
      interventions: restoredInterventions,
      projects: restoredProjects,
      users: restoredUsers
    };
  } catch (err: any) {
    return { success: false, message: `Failed to parse backup JSON: ${err?.message || 'Syntax error'}` };
  }
}

