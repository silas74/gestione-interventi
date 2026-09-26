export type InterventionStatus = 
  | 'pending'        // In attesa / Da fare
  | 'in_attesa'       // Backward compatibility
  | 'scheduled'      // Programmato
  | 'in_progress'    // In corso on-site
  | 'in_corso'       // Backward compatibility
  | 'completed'      // Completato / Già fatto
  | 'completato'     // Backward compatibility
  | 'cancelled';

export type InterventionPriority = 'low' | 'medium' | 'high' | 'urgent' | 'bassa' | 'media' | 'alta' | 'urgente';

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
  statusOutcome: 'resolved' | 'partial' | 'waiting_for_parts' | 'risolto' | 'parziale' | 'in_attesa_ricambi';
  technicianSignature?: string; // Base64 digital signature PNG
  pdfDataUri?: string;
  completedAt: string;
}

export interface ClientFeedback {
  submittedAt: string;
  clientName: string;
  rating?: number; // 1 to 5 stars
  feedbackStatus: 'approved' | 'revision_requested' | 'disputed' | 'approvato' | 'richiesta_revisione' | 'contestato';
  notes: string;
  clientSignature?: string; // Base64 digital signature PNG
}

export interface InterventionRequest {
  id: string;
  code: string; // e.g. INT-2026-WB1
  projectId?: string;
  projectName?: string; // e.g. "Workbank"
  title: string;
  siteName: string;
  siteAddress: string;
  clientName: string;
  clientContact: string; // Phone or email
  description: string; // Explanation of issue or scope of work
  desiredAccessDate: string; // Desired access date
  desiredAccessTime: string; // Desired access time
  priority: InterventionPriority;
  defectPhotos: DefectPhoto[];
  notes?: string;
  status: InterventionStatus;
  createdAt: string;
  updatedAt: string;
  assignedTechnician?: string;
  report?: TechnicianReport;
  clientFeedback?: ClientFeedback;
  emailSource?: EmailSourceInfo;
  emailHistory?: EmailMessageLog[];
}

export interface EmailSourceInfo {
  sender: string;       // e.g. "Mario Rossi <mario@example.com>"
  receivedAt: string;   // e.g. "2026-09-26 14:35"
  subject?: string;
  rawSnippet?: string;
  projectId?: string;
  projectName?: string;
}

export interface EmailMessageLog {
  id: string;
  sender: string;
  receivedAt: string;
  subject?: string;
  message: string;
  action: 'created' | 'follow_up' | 'closed';
  projectId?: string;
  projectName?: string;
}

export type AppRole = 'admin' | 'technician' | 'user' | 'tecnico' | 'utente';

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string; // Cryptographic SHA-256 salted hash — NEVER plaintext
  salt: string;         // Unique cryptographic salt
  name: string;
  role: AppRole;        // Only Costantino is 'admin'
  phone?: string;       // Contact phone / mobile number
  assignedProjectIds: string[]; // List of project IDs or ['*'] for all
  createdAt: string;
}

export interface Project {
  id: string;
  code: string; // e.g. WRKB
  name: string; // e.g. "Workbank"
  description: string;
  clientName?: string;
  siteAddress?: string;
  createdAt: string;
}
