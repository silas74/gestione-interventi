import { InterventionRequest } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const LOCAL_STORAGE_KEY = 'interventi_data_v1';

// Initial sample data if no data exists
const INITIAL_INTERVENTIONS: InterventionRequest[] = [
  {
    id: 'int-101',
    code: 'INT-2026-001',
    title: 'Malfunzionamento Quadro Elettrico e Inverter Linea 2',
    siteName: 'Stabilimento Produzione Nord',
    siteAddress: 'Via delle Industrie 42, Monza (MB)',
    clientName: 'Mario Rossi (Resp. Produzione)',
    clientContact: '+39 039 8899112',
    description: 'Il quadro principale della linea di confezionamento segnala allarme sovraccarico e arresto anomalo dell\'inverter dopo circa 20 minuti di ciclo continuo. Necessaria verifica sul posto e test termografico.',
    desiredAccessDate: '2026-09-28',
    desiredAccessTime: '08:30',
    priority: 'urgente',
    defectPhotos: [
      {
        id: 'p1',
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
        name: 'quadro_allarme_errore.jpg',
        uploadedAt: '2026-09-24T14:20:00Z'
      }
    ],
    notes: 'Suonare al cancello 3 e chiedere del capoturno sig. Brambilla. DPI obbligatori: scarpe antinfortunistiche e casco.',
    status: 'in_corso',
    createdAt: '2026-09-24T14:20:00Z',
    updatedAt: '2026-09-25T08:00:00Z',
    assignedTechnician: 'Costantino'
  },
  {
    id: 'int-102',
    code: 'INT-2026-002',
    title: 'Manutenzione Straordinaria Compressore Aria Impianto 1',
    siteName: 'Logistica & Deposito Merci',
    siteAddress: 'Strada Statale 11, Agrate Brianza',
    clientName: 'Franco Magazzino',
    clientContact: '+39 039 5544332',
    description: 'Pressione insufficiente sulle linee pneumatiche delle rulliere. Filtro separatore intasato e rumore anomalo dalla testata compressore.',
    desiredAccessDate: '2026-09-22',
    desiredAccessTime: '14:00',
    priority: 'alta',
    defectPhotos: [
      {
        id: 'p2',
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
        name: 'manometro_pressione_bassa.jpg',
        uploadedAt: '2026-09-21T09:10:00Z'
      }
    ],
    notes: 'Accesso da rampa carico merci, muletti in movimento.',
    status: 'completato',
    createdAt: '2026-09-21T09:10:00Z',
    updatedAt: '2026-09-22T17:30:00Z',
    assignedTechnician: 'Franco',
    report: {
      technicianName: 'Franco',
      interventionDate: '2026-09-22',
      startTime: '14:00',
      endTime: '17:30',
      hoursWorked: 3.5,
      workDone: 'Sostituzione cartuccia filtro disoleatore e filtro aspirazione. Pulizia radiatore di raffreddamento e ripristino livello olio sintetico ISO VG 46. Serraggio raccordi tubazione mandata e collaudo pressione a 8.5 bar a pieno regime.',
      materialsUsed: '1x Filtro aria mod. AF-22, 1x Separatore disoleatore OS-40, 5L Olio Compressore Sintetico.',
      technicalNotes: 'Impianto pienamente operativo. Consigliato controllo serraggio tra 100 ore di moto.',
      statusOutcome: 'risolto',
      completedAt: '2026-09-22T17:30:00Z'
    },
    clientFeedback: {
      submittedAt: '2026-09-23T10:15:00Z',
      clientName: 'Franco Magazzino',
      rating: 5,
      feedbackStatus: 'approvato',
      notes: 'Intervento perfetto e tempestivo. Pressione rulliere ripristinata e nessun fermo impianto residuo.'
    }
  },
  {
    id: 'int-103',
    code: 'INT-2026-003',
    title: 'Installazione Sensori di Temperatura e Flussimetri Linea 4',
    siteName: 'Polo Farmaceutico',
    siteAddress: 'Viale Europa 15, Cavenago di Brianza',
    clientName: 'Dott.ssa Bianchi (Quality Assurance)',
    clientContact: '+39 02 99887766',
    description: 'Richiesta integrazione di 4 sonde PT100 per monitoraggio temperatura cella fredda e cablaggio su morsettiera PLC esistente.',
    desiredAccessDate: '2026-09-30',
    desiredAccessTime: '09:00',
    priority: 'media',
    defectPhotos: [],
    notes: 'Zona controllata: necessario compilare modulo visitatori alla reception.',
    status: 'in_attesa',
    createdAt: '2026-09-25T07:45:00Z',
    updatedAt: '2026-09-25T07:45:00Z'
  }
];

export async function fetchInterventions(): Promise<InterventionRequest[]> {
  // If Supabase is configured, try Supabase first
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('interventi')
        .select('*')
        .order('createdAt', { ascending: false });

      if (!error && data && data.length > 0) {
        // Map any snake_case to camelCase if needed, or if stored as JSON
        const items = data.map((row: any) => ({
          ...row,
          defectPhotos: Array.isArray(row.defectPhotos) ? row.defectPhotos : (typeof row.defectPhotos === 'string' ? JSON.parse(row.defectPhotos) : []),
          report: typeof row.report === 'string' ? JSON.parse(row.report) : row.report,
          clientFeedback: typeof row.clientFeedback === 'string' ? JSON.parse(row.clientFeedback) : row.clientFeedback,
        }));
        saveLocal(items);
        return items;
      }
    } catch (err) {
      console.warn('Supabase fetch failed or table does not exist yet. Using localStorage fallback.', err);
    }
  }

  // Fallback to localStorage
  const local = loadLocal();
  if (local && local.length > 0) {
    return local;
  }

  // First time initialization
  saveLocal(INITIAL_INTERVENTIONS);
  return INITIAL_INTERVENTIONS;
}

export async function saveIntervention(item: InterventionRequest): Promise<void> {
  const current = loadLocal();
  const index = current.findIndex(i => i.id === item.id);
  let updatedList: InterventionRequest[];

  if (index >= 0) {
    updatedList = [...current];
    updatedList[index] = item;
  } else {
    updatedList = [item, ...current];
  }

  saveLocal(updatedList);

  // Sync to Supabase if configured
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
      console.warn('Could not sync item to Supabase table:', err);
    }
  }
}

export async function deleteIntervention(id: string): Promise<void> {
  const current = loadLocal();
  const updated = current.filter(i => i.id !== id);
  saveLocal(updated);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('interventi').delete().eq('id', id);
    } catch (err) {
      console.warn('Could not delete from Supabase:', err);
    }
  }
}

function loadLocal(): InterventionRequest[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocal(items: InterventionRequest[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save to localStorage', err);
  }
}

export function generateNextCode(currentItems: InterventionRequest[]): string {
  const year = new Date().getFullYear();
  const count = currentItems.length + 1;
  const pad = String(count).padStart(3, '0');
  return `INT-${year}-${pad}`;
}
