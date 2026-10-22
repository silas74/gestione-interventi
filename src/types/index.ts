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

export type RecordCategory = 'intervention' | 'project_work';

export type FollowUpChannel = 'email' | 'whatsapp' | 'phone' | 'on_site' | 'meeting';

export type SupplyStatus = 'none' | 'ordered' | 'shipping' | 'ready_pickup' | 'delivered';

export interface ActionStep {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
}

export interface ProjectTrackingEntry {
  id: string;
  date: string;                // Data dell'azione / comunicazione (YYYY-MM-DD)
  time?: string;               // Ora opzionale (HH:mm)
  whatIDid: string;            // Cosa ho fatto
  channel: FollowUpChannel;    // Seguito per: 'email' | 'whatsapp' | 'phone' | 'on_site' | 'meeting'
  awaitingReply: boolean;      // Se siamo in attesa di risposta
  waitingReplyFrom?: string;   // Da chi aspetto risposta (es. "Ing. Bianchi", "Mario Rossi", "Fornitore")
  followUpDueDate?: string;    // Data entro cui sollecitare / scadenza risposta
  nextStep?: string;           // Prossima azione da fare
  referenceDoc?: string;       // Riferimento documento, schema, preventivo o file
  replyReceived?: boolean;     // Se la risposta attesa è arrivata
  replyReceivedAt?: string;    // Data in cui hanno risposto
  replyNotes?: string;         // Nota sulla risposta ricevuta
}

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
  reportPhotos?: DefectPhoto[]; // Photos attached directly to report (uploaded or pasted)
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
  code: string; // e.g. INT-2026-WB1 or LAV-2026-WB1
  recordType?: RecordCategory; // 'intervention' (default) | 'project_work' (Lavori & Azioni su Progetto)
  actionSteps?: ActionStep[];  // Checklist di azioni da fare sul progetto/lavoro
  trackingLogs?: ProjectTrackingEntry[]; // Diario di tracking: cosa ho fatto, email/whatsapp, data, da chi aspetto risposta
  waitingReplyFrom?: string;   // Da chi aspetto attualmente risposta
  followUpChannel?: FollowUpChannel; // Ultimo canale usato (email / whatsapp / ecc.)
  lastActionDate?: string;     // Data ultima azione eseguita
  whatIDidSummary?: string;    // Sintesi rapida di cosa ho fatto
  nextActionToDo?: string;     // Prossimo passo operativo
  followUpDueDate?: string;    // Data scadenza / sollecito risposta
  supplyStatus?: SupplyStatus; // Stato fornitura/materiali: 'none' | 'ordered' | 'shipping' | 'ready_pickup' | 'delivered'
  supplyNote?: string;         // Nota su ordine / fornitore / ritiro materiale
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
