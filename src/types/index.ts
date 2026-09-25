export type InterventionStatus = 
  | 'in_attesa'      // Da fare / Appena inserita
  | 'programmato'    // Fissata data/ora
  | 'in_corso'       // In corso on-site
  | 'completato'     // Già fatto / completato con verbale
  | 'annullato';

export type InterventionPriority = 'bassa' | 'media' | 'alta' | 'urgente';

export interface DefectPhoto {
  id: string;
  url: string; // base64 data url or cloud URL
  name: string;
  uploadedAt: string;
}

export interface TechnicianReport {
  technicianName: string;
  interventionDate: string;
  startTime?: string;
  endTime?: string;
  hoursWorked: number;
  workDone: string;
  materialsUsed?: string;
  technicalNotes?: string;
  statusOutcome: 'risolto' | 'parziale' | 'in_attesa_ricambi';
  pdfDataUri?: string;
  completedAt: string;
}

export interface ClientFeedback {
  submittedAt: string;
  clientName: string;
  rating?: number; // 1 to 5
  feedbackStatus: 'approvato' | 'richiesta_revisione' | 'contestato';
  notes: string;
}

export interface InterventionRequest {
  id: string;
  code: string; // es. INT-2026-001
  projectId?: string; // ID Progetto di appartenenza
  projectName?: string; // Nome Progetto (es. "Workbank")
  title: string;
  siteName: string;
  siteAddress: string;
  clientName: string;
  clientContact: string; // Telefono o email
  description: string; // Spiegazione di cosa serve / guasto riscontrato
  desiredAccessDate: string; // Data di accesso desiderata
  desiredAccessTime: string; // Ora di accesso desiderata
  priority: InterventionPriority;
  defectPhotos: DefectPhoto[];
  notes?: string;
  status: InterventionStatus;
  createdAt: string;
  updatedAt: string;
  assignedTechnician?: string;
  report?: TechnicianReport;
  clientFeedback?: ClientFeedback;
}

export type AppRole = 'admin' | 'tecnico' | 'utente';

export interface UserAccount {
  id: string;
  username: string;
  password: string; // Gestito e assegnato manualmente da Costantino
  name: string;
  role: AppRole; // Solo Costantino è 'admin', gli altri 'tecnico' o 'utente'
  assignedProjectIds: string[]; // ID dei progetti a cui l'utente ha accesso
  createdAt: string;
}

export interface Project {
  id: string;
  code: string; // es. WRKB
  name: string; // es. "Workbank"
  description: string;
  clientName?: string;
  siteAddress?: string;
  createdAt: string;
}
