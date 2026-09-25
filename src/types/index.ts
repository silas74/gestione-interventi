export type InterventionStatus = 
  | 'in_attesa'      // Appena inserita dal richiedente
  | 'programmato'    // Fissata data/ora di accesso
  | 'in_corso'       // Tecnico sul posto
  | 'completato'     // Intervento finito con rapporto PDF
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

export type AppRole = 'tecnico' | 'richiedente';

export interface UserProfile {
  id: string;
  name: string;
  role: AppRole;
  avatarColor: string;
}
