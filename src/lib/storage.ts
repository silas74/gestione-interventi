import { InterventionRequest, UserAccount, Project } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_INTERVENTIONS = 'interventi_data_v3';
const STORAGE_PROJECT_WORKS_SEEDED = 'interventi_project_works_seeded_v7_awash';
const STORAGE_USERS = 'interventi_users_v3';
const STORAGE_PROJECTS = 'interventi_projects_v3';
const STORAGE_SESSION = 'interventi_session_v3';

// 1. Initial Projects with Awash Bank, Eagle Hills, Hilton (GIAA), Panvac & Workbank Projects
const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-awash-bank',
    code: 'AWASH',
    name: 'Awash Bank',
    description: 'Impianto rilevamento CO Parking Area, sistemi Urmet e impianti tecnologici',
    clientName: 'Awash Bank / Dodic',
    siteAddress: 'Awash Bank Building — Parking Area & Floors',
    createdAt: '2026-10-21T09:00:00Z'
  },
  {
    id: 'proj-eagle-hills',
    code: 'EAGLE',
    name: 'Eagle Hills',
    description: 'Automazione BMS, impianti elettrici (Electrical), Water Report e automazioni porte',
    clientName: 'Henok & Mike',
    siteAddress: 'Eagle Hills Compound',
    createdAt: '2026-10-20T09:00:00Z'
  },
  {
    id: 'proj-hilton',
    code: 'HILTON',
    name: 'Hilton (GIAA)',
    description: 'Concept Design Engineering MEP / Electrical, ELV & FLS — Infra Building, HGI (Garden Inn) & Main Tower',
    clientName: 'Lukas Van Vuuren (Hilton) / Pier Paolo Elmi',
    siteAddress: 'Hilton Compound — Infra Building, HGI & Main Tower',
    createdAt: '2026-10-20T14:50:00Z'
  },
  {
    id: 'proj-panvac',
    code: 'PANVAC',
    name: 'Panvac',
    description: 'Impianti elettrici, quadri, media/bassa tensione, generazione e Low Voltage',
    clientName: 'Aby',
    siteAddress: 'Panvac Facility',
    createdAt: '2026-10-01T08:00:00Z'
  },
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

// Helper to create the 9 Panvac approval tracking items awaiting reply from Aby
const PANVAC_APPROVAL_ITEMS: Array<{
  num: string;
  title: string;
  whatIDid: string;
  nextStep: string;
  refDoc: string;
}> = [
  {
    num: '001',
    title: 'Approvazione LPR',
    whatIDid: 'Inviata documentazione tecnica e scheda per approvazione sistema LPR.',
    nextStep: 'Procedere con fornitura e installazione LPR dopo approvazione di Aby.',
    refDoc: 'Submittal_LPR_Panvac.pdf'
  },
  {
    num: '002',
    title: 'Approvazione Cavi Class 1 e Class 2',
    whatIDid: 'Inviate specifiche tecniche e schede cavi Class 1 e Class 2 per approvazione.',
    nextStep: 'Procedere con ordine e posa cavi Class 1 e Class 2 dopo approvazione di Aby.',
    refDoc: 'Spec_Cavi_Class1_Class2.pdf'
  },
  {
    num: '003',
    title: 'Approvazione Impianto di Terra',
    whatIDid: 'Inviato progetto ed elaborati tecnici per approvazione Impianto di Terra.',
    nextStep: 'Avviare esecuzione rete di terra dopo approvazione di Aby.',
    refDoc: 'Schema_Impianto_Terra_Panvac.pdf'
  },
  {
    num: '004',
    title: 'Approvazione Generatore',
    whatIDid: 'Inviata scheda tecnica e dimensionamento del Generatore per approvazione.',
    nextStep: 'Confermare ordine e posizionamento Generatore dopo approvazione di Aby.',
    refDoc: 'Submittal_Generatore_Panvac.pdf'
  },
  {
    num: '005',
    title: 'Approvazione AVS',
    whatIDid: 'Inviata sottomissione tecnica e specifiche AVS (Stabilizzatore di Tensione) per approvazione.',
    nextStep: 'Procedere con fornitura AVS dopo approvazione di Aby.',
    refDoc: 'Submittal_AVS_Panvac.pdf'
  },
  {
    num: '006',
    title: 'Approvazione UPS',
    whatIDid: 'Inviata documentazione tecnica e calcolo autonomia UPS per approvazione.',
    nextStep: 'Confermare fornitura e installazione UPS dopo approvazione di Aby.',
    refDoc: 'Submittal_UPS_Panvac.pdf'
  },
  {
    num: '007',
    title: 'Approvazione Trasformatore',
    whatIDid: 'Inviata scheda tecnica e caratteristiche del Trasformatore per approvazione.',
    nextStep: 'Procedere con approvvigionamento e posa Trasformatore dopo approvazione di Aby.',
    refDoc: 'Submittal_Trasformatore_Panvac.pdf'
  },
  {
    num: '008',
    title: 'Approvazione Quadri Elettrici',
    whatIDid: 'Inviati schemi unifilari, carpenteria e specifiche dei Quadri Elettrici per approvazione.',
    nextStep: 'Avviare cablaggio e fornitura Quadri Elettrici dopo approvazione di Aby.',
    refDoc: 'Schemi_Quadri_Elettrici_Panvac.pdf'
  },
  {
    num: '009',
    title: 'Approvazione Lista First Fix for Low Voltage',
    whatIDid: 'Inviata Lista First Fix for Low Voltage (predisposizioni e tubazioni bassa tensione/speciali) per approvazione.',
    nextStep: 'Avviare attività di First Fix Low Voltage in cantiere dopo approvazione di Aby.',
    refDoc: 'First_Fix_List_Low_Voltage_Panvac.xlsx'
  }
];

const PANVAC_INITIAL_WORKS: InterventionRequest[] = PANVAC_APPROVAL_ITEMS.map((item) => ({
  id: `lav-panvac-${item.num}`,
  code: `LAV-PANVAC-2026-${item.num}`,
  recordType: 'project_work',
  projectId: 'proj-panvac',
  projectName: 'Panvac',
  title: item.title,
  siteName: 'Panvac Facility',
  siteAddress: 'Panvac Site',
  clientName: 'Aby',
  clientContact: '',
  description: item.whatIDid,
  desiredAccessDate: '2026-10-21',
  desiredAccessTime: '09:00',
  priority: 'high',
  defectPhotos: [],
  notes: 'In attesa di approvazione da Aby.',
  status: 'in_progress',
  createdAt: '2026-10-21T09:00:00Z',
  updatedAt: '2026-10-21T09:00:00Z',
  assignedTechnician: 'Costantino',
  whatIDidSummary: item.whatIDid,
  followUpChannel: 'email',
  lastActionDate: '2026-10-21',
  waitingReplyFrom: 'Aby',
  nextActionToDo: item.nextStep,
  trackingLogs: [
    {
      id: `trk-panvac-${item.num}`,
      date: '2026-10-21',
      time: '09:30',
      whatIDid: item.whatIDid,
      channel: 'email',
      awaitingReply: true,
      waitingReplyFrom: 'Aby',
      nextStep: item.nextStep,
      referenceDoc: item.refDoc
    }
  ],
  actionSteps: [
    {
      id: `act-panvac-${item.num}-1`,
      text: `Inviata richiesta approvazione (${item.title.replace('Approvazione ', '')}) a Aby`,
      completed: true,
      completedAt: '2026-10-21T09:30:00Z'
    },
    {
      id: `act-panvac-${item.num}-2`,
      text: 'Ricezione approvazione / commenti da Aby',
      completed: false
    },
    {
      id: `act-panvac-${item.num}-3`,
      text: item.nextStep,
      completed: false
    }
  ]
}));

// Helper to create the 9 Hilton (GIAA) Electrical / ELV / FLS Concept Design items from Lukas Van Vuuren's email (20/10/2026) & Submission Form PDF
const HILTON_ELECTRICAL_ITEMS: Array<{
  num: string;
  title: string;
  whatIDid: string;
  nextStep: string;
  refDoc: string;
  steps: string[];
}> = [
  {
    num: '001',
    title: 'Infra Building — Central Transformers & Strategia Espansione Main Tower + HGI',
    whatIDid: 'Trasmesso schema preliminare cabina trasformatori centralizzata nell\'Infra Building (attuale fornitura per HGI con predisposizione espansione futura per Main Tower). Ricevuto riscontro email da Lukas Van Vuuren (20/10/2026): Hilton richiede il Design Report completo che dimostri come verranno aggiunti i futuri trasformatori/quadri per la Main Tower evitando doppi impianti o inefficienze.',
    nextStep: 'Redigere e inviare Design Report e schema dettagliato fasi di espansione trasformatori/quadri (Fase 1 HGI -> Fase 2 Main Tower).',
    refDoc: 'Re: GIAA - Feedbacks required from Hilton Design Team (20/10/2026)',
    steps: [
      'Dimensionamento trasformatori centralizzati per HGI (contratto attuale) e stima carico futuro Main Tower',
      'Schema unifilare e layout Infra Building con spazi dedicati espansione futura senza duplicazione impianti',
      'Invio Design Report infrastruttura elettrica a Lukas Van Vuuren e Kylie Rankin (Hilton)'
    ]
  },
  {
    num: '002',
    title: 'Doc #2 — MEP Concept Report (Electrical, Active Fire Life Safety & ELV Systems)',
    whatIDid: 'Ricevuta richiesta formale da Lukas Van Vuuren (Hilton) il 20/10/2026 con modulo "Hilton Concept Design Engineering Submission Form_Master.pdf": Hilton non revisiona singole parti isolate ma richiede il pacchetto completo MEP/Electrical, Active Fire Life Safety (FLS) ed ELV Concept Report.',
    nextStep: 'Completare la sezione Electrical, Active FLS ed ELV del MEP Concept Report e caricare su Project Hub per revisione Hilton.',
    refDoc: 'Hilton Concept Design Engineering Submission Form_Master.pdf (Doc #2)',
    steps: [
      'Relazione tecnica Concept Design impianti elettrici MT/BT e generazione di emergenza',
      'Relazione tecnica Active Fire Life Safety (FLS) e sistemi speciali ELV',
      'Sottomissione pacchetto completo su Hilton Project Hub'
    ]
  },
  {
    num: '003',
    title: 'Doc #4 — Electrical Distribution Schematic (MT/BT, Quadri & Alimentazioni di Sicurezza)',
    whatIDid: 'Richiesto nel pacchetto Concept Stage Drawings di Hilton (Doc #4 del modulo allegato all\'email del 20/10/2026): schema generale di distribuzione elettrica principale e secondaria.',
    nextStep: 'Preparare e sottomettere lo schema completo di distribuzione elettrica (Electrical Distribution Schematic) per Infra Building e HGI.',
    refDoc: 'Hilton Concept Design Engineering Submission Form_Master.pdf (Doc #4)',
    steps: [
      'Schema distribuzione principale MT/BT da Infra Building a HGI e predisposizione Main Tower',
      'Schema distribuzione normale, preferenziale (Gruppi Elettrogeni) e sotto UPS',
      'Verifica selettività e coordinamento con standard Hilton Brand'
    ]
  },
  {
    num: '004',
    title: 'Doc #5 & #6 — Fire Alarm Schematic & Public Address / Voice Alarm (PAVA) Schematic',
    whatIDid: 'Richiesti nel pacchetto Concept Stage Drawings (Doc #5 e Doc #6 dell\'allegato Hilton del 20/10/2026): schemi a blocchi impianto rivelazione incendi (Fire Alarm) ed evacuazione vocale / diffusione sonora (PAVA).',
    nextStep: 'Elaborare gli schemi Fire Alarm e PAVA secondo gli standard Hilton Fire Life Safety (FLS).',
    refDoc: 'Hilton Concept Design Engineering Submission Form_Master.pdf (Doc #5, #6)',
    steps: [
      'Elaborazione Doc #5: Fire Alarm Schematic (centrali, loop, interfacce comandi sicurezza)',
      'Elaborazione Doc #6: Public Address / Voice Alarm (PAVA) Schematic',
      'Integrazione logica con Smoke Control Schematic (Doc #9) e invio a Hilton FLS Team'
    ]
  },
  {
    num: '005',
    title: 'Doc #16, #17 & #18 — ELV Schematics: Structured Cabling, Audio Visual (AV) & CCTV',
    whatIDid: 'Richiesti nel pacchetto Concept Stage Drawings (Doc #16, #17, #18 dell\'allegato Hilton del 20/10/2026): schemi impianti speciali ELV (Cablaggio Strutturato, Audio/Video e TVCC).',
    nextStep: 'Predisporre gli schemi a blocchi ELV (Structured Cabling, AV e CCTV) conformi agli standard IT/ELV Hilton.',
    refDoc: 'Hilton Concept Design Engineering Submission Form_Master.pdf (Doc #16, #17, #18)',
    steps: [
      'Elaborazione Doc #16: Structured Cabling Schematic (sale server, rack, dorsali fibra/rame, Wi-Fi)',
      'Elaborazione Doc #17: Audio Visual (AV) Schematic per aree comuni, meeting e wellness',
      'Elaborazione Doc #18: CCTV Schematic (videosorveglianza e sicurezza)'
    ]
  },
  {
    num: '006',
    title: 'Doc #19 — Emergency Lighting and Illuminated Egress Signage Schematic',
    whatIDid: 'Richiesto nel pacchetto Concept Stage Drawings (Doc #19 dell\'allegato Hilton del 20/10/2026): schema illuminazione di emergenza e segnaletica luminosa vie di fuga.',
    nextStep: 'Preparare lo schema Emergency Lighting & Illuminated Egress Signage per HGI e Infra Building.',
    refDoc: 'Hilton Concept Design Engineering Submission Form_Master.pdf (Doc #19)',
    steps: [
      'Definizione architettura illuminazione di sicurezza e segnaletica vie di esodo',
      'Verifica autonomie e conformità normativa FLS Hilton',
      'Emissione tavola schematica Doc #19 per approvazione'
    ]
  },
  {
    num: '007',
    title: 'Doc #21 & #24 — Typical Guestroom Electrical/ELV Layouts & Guestroom Energy Management (HGI)',
    whatIDid: 'Ricevuto chiarimento nell\'email di Lukas Van Vuuren (20/10/2026): per HGI le tipologie camere sono solo Accessible (AK1), King (K1B), Twin e Suite (nessuna Junior Suite). Richiesti nel modulo Concept Design i layout tipici camere (Doc #21) e i dettagli del sistema Guestroom Energy Management GRMS (Doc #24).',
    nextStep: 'Completare i layout elettrici/ELV delle camere tipo HGI (Accessible, King, Twin, Suite) e le specifiche Guestroom Energy Management.',
    refDoc: 'Hilton Concept Design Engineering Submission Form_Master.pdf (Doc #21, #24)',
    steps: [
      'Layout impianti elettrici, illuminazione, prese e dati per camere tipo HGI (Accessible, King, Twin, Suite)',
      'Dettagli architettura Guestroom Energy Management System (Doc #24 - controllo accessi/clima/luci camera)',
      'Allineamento con layout architettonici Mecanoo e standard HGI'
    ]
  },
  {
    num: '008',
    title: 'Doc #22 & #23 — Electrical Space Planning, Main Plant Areas, Risers, Incoming Utilities & Deviation List',
    whatIDid: 'Richiesti nel modulo Concept Design Hilton (Doc #22 e Doc #23 dell\'allegato del 20/10/2026): planimetrie spazi tecnici principali, cavedi montanti (risers), percorsi dorsali e ingressi utenze elettriche, oltre alla lista di eventuali deviazioni dagli standard Hilton (Proposed MEP Deviation List).',
    nextStep: 'Definire planimetrie locali tecnici elettrici/ELV, montanti verticali, ingresso fornitura elettrica e compilare la MEP Deviation List.',
    refDoc: 'Hilton Concept Design Engineering Submission Form_Master.pdf (Doc #22, #23)',
    steps: [
      'Planimetrie e block diagrams locali elettrici principali, cabine MT/BT, quadri e cavedi (Doc #22)',
      'Tracciato ingresso utenze elettriche principali e dorsali tra Infra Building, HGI e Main Tower',
      'Compilazione Proposed MEP Deviation List (Doc #23) per la parte elettrica/ELV'
    ]
  },
  {
    num: '009',
    title: 'Doc #3 — Sustainability & Energy Concept Report (Modello Energetico Elettrico kWh/m², CO2 & LCA)',
    whatIDid: 'Richiesto nei Concept Stage Reports (Doc #3 dell\'allegato Hilton del 20/10/2026): report sostenibilità ed energia comprensivo di stima kWh/m² annui, impronta carbonio Kg.CO2/m² e Life Cycle Analysis (LCA) per giustificare le scelte impiantistiche.',
    nextStep: 'Fornire i dati di assorbimento elettrico stimato (kWh/m²), efficienza illuminazione/quadri/pompe di calore e analisi LCA per il report energetico.',
    refDoc: 'Hilton Concept Design Engineering Submission Form_Master.pdf (Doc #3)',
    steps: [
      'Stima consumi elettrici annui (kWh/m²) per illuminazione, forza motrice, cucina, lavanderia e centrale idrica/RO',
      'Analisi Life Cycle (LCA) e calcolo emissioni Kg.CO2/m² a supporto delle scelte impiantistiche',
      'Integrazione nel Sustainability/Energy Concept Report (Doc #3)'
    ]
  }
];

const HILTON_INITIAL_WORKS: InterventionRequest[] = HILTON_ELECTRICAL_ITEMS.map((item) => ({
  id: `lav-hilton-${item.num}`,
  code: `LAV-HILTON-2026-${item.num}`,
  recordType: 'project_work',
  projectId: 'proj-hilton',
  projectName: 'Hilton (GIAA)',
  title: item.title,
  siteName: 'Hilton Compound — Infra Building & HGI',
  siteAddress: 'Hilton GIAA Site',
  clientName: 'Lukas Van Vuuren (Hilton Design Team)',
  clientContact: 'Lukas.VanVuuren@Hilton.com',
  description: item.whatIDid,
  desiredAccessDate: '2026-10-21',
  desiredAccessTime: '09:00',
  priority: item.num === '001' || item.num === '002' || item.num === '003' ? 'high' : 'medium',
  defectPhotos: [],
  notes: 'Ricevuto via email da Lukas Van Vuuren (Hilton Project Director) il 20/10/2026 ore 14:50 con allegato Hilton Concept Design Engineering Submission Form_Master.pdf.',
  status: 'in_progress',
  createdAt: '2026-10-20T14:50:48Z',
  updatedAt: '2026-10-21T09:00:00Z',
  assignedTechnician: 'Costantino',
  whatIDidSummary: item.whatIDid,
  followUpChannel: 'email',
  lastActionDate: '2026-10-20',
  waitingReplyFrom: 'Lukas Van Vuuren / Kylie Rankin (Hilton Design Team)',
  nextActionToDo: item.nextStep,
  emailSource: {
    sender: 'Lukas Van Vuuren <Lukas.VanVuuren@Hilton.com>',
    receivedAt: '2026-10-20 14:50',
    subject: 'Re: GIAA - Feedbacks required from Hilton Design Team',
    projectId: 'proj-hilton',
    projectName: 'Hilton (GIAA)'
  },
  emailHistory: [
    {
      id: `msg-hilton-${item.num}-1`,
      sender: 'Pier Paolo Elmi <paolo@elmiconstruction.com>',
      receivedAt: '2026-10-16 11:10',
      subject: 'GIAA - Feedbacks required from Hilton Design Team',
      message: 'Inviata strategia preliminare Electrical Infrastructure (trasformatori centrali in Infra Building a servizio di HGI con futura espansione per Main Tower) e richiesta feedback al team Hilton.',
      action: 'created',
      projectId: 'proj-hilton',
      projectName: 'Hilton (GIAA)'
    },
    {
      id: `msg-hilton-${item.num}-2`,
      sender: 'Lukas Van Vuuren <Lukas.VanVuuren@Hilton.com>',
      receivedAt: '2026-10-20 14:50',
      subject: 'Re: GIAA - Feedbacks required from Hilton Design Team',
      message: `${item.whatIDid} (Allegato: Hilton Concept Design Engineering Submission Form_Master.pdf)`,
      action: 'follow_up',
      projectId: 'proj-hilton',
      projectName: 'Hilton (GIAA)'
    }
  ],
  trackingLogs: [
    {
      id: `trk-hilton-${item.num}-1`,
      date: '2026-10-20',
      time: '14:50',
      whatIDid: item.whatIDid,
      channel: 'email',
      awaitingReply: true,
      waitingReplyFrom: 'Lukas Van Vuuren / Kylie Rankin (Hilton Design Team)',
      nextStep: item.nextStep,
      referenceDoc: item.refDoc
    }
  ],
  actionSteps: item.steps.map((text, idx) => ({
    id: `act-hilton-${item.num}-${idx + 1}`,
    text,
    completed: false
  }))
}));

// Helper for Eagle Hills / Heagle Hills tracking items
const EAGLE_HILLS_INITIAL_WORKS: InterventionRequest[] = [
  {
    id: 'lav-eagle-001',
    code: 'LAV-EAGLE-2026-001',
    recordType: 'project_work',
    projectId: 'proj-eagle-hills',
    projectName: 'Eagle Hills',
    title: 'Alimentatore Porta Scorrevole',
    siteName: 'Eagle Hills Facility',
    siteAddress: 'Eagle Hills Compound',
    clientName: 'Franco',
    clientContact: '+39 335 9988776',
    description: 'Ordinato a voce a Franco ieri (20/10/2026) l\'alimentatore per la porta scorrevole.',
    desiredAccessDate: '2026-10-20',
    desiredAccessTime: '11:00',
    priority: 'high',
    defectPhotos: [],
    notes: 'Ordinato a voce a Franco il 20/10/2026.',
    status: 'in_progress',
    createdAt: '2026-10-20T11:00:00Z',
    updatedAt: '2026-10-21T09:00:00Z',
    assignedTechnician: 'Costantino',
    whatIDidSummary: 'Ordinato a voce a Franco ieri (20/10/2026) l\'alimentatore per la porta scorrevole.',
    followUpChannel: 'phone',
    lastActionDate: '2026-10-20',
    waitingReplyFrom: 'Franco',
    nextActionToDo: 'Ricevere alimentatore porta scorrevole da Franco e procedere con installazione e collaudo.',
    trackingLogs: [
      {
        id: 'trk-eagle-001-1',
        date: '2026-10-20',
        time: '11:00',
        whatIDid: 'Ordinato a voce a Franco l\'alimentatore per la porta scorrevole.',
        channel: 'phone',
        awaitingReply: true,
        waitingReplyFrom: 'Franco',
        nextStep: 'Ricevere alimentatore da Franco e procedere con sostituzione/collaudo porta scorrevole.'
      }
    ],
    actionSteps: [
      {
        id: 'act-eagle-001-1',
        text: 'Ordinato alimentatore porta scorrevole a voce a Franco (20/10/2026)',
        completed: true,
        completedAt: '2026-10-20T11:00:00Z'
      },
      {
        id: 'act-eagle-001-2',
        text: 'Conferma arrivo / consegna alimentatore da Franco',
        completed: false
      },
      {
        id: 'act-eagle-001-3',
        text: 'Installazione e collaudo alimentatore porta scorrevole',
        completed: false
      }
    ]
  },
  {
    id: 'lav-eagle-002',
    code: 'LAV-EAGLE-2026-002',
    recordType: 'project_work',
    projectId: 'proj-eagle-hills',
    projectName: 'Eagle Hills',
    title: 'BMS — Istruzioni d\'Uso per Electrical & Water Report',
    siteName: 'Eagle Hills Facility',
    siteAddress: 'Eagle Hills Compound',
    clientName: 'Henok & Mike',
    clientContact: 'henokb@elmiconstruction.com',
    description: 'Mandato ieri (20/10/2026) per email a Henok e Mike le istruzioni d\'uso BMS per Electrical e il Water Report. In attesa di feedback da loro.',
    desiredAccessDate: '2026-10-20',
    desiredAccessTime: '15:30',
    priority: 'high',
    defectPhotos: [],
    notes: 'Inviato per email ieri 20/10/2026 a Henok e Mike — in attesa di feedback.',
    status: 'in_progress',
    createdAt: '2026-10-20T15:30:00Z',
    updatedAt: '2026-10-21T09:00:00Z',
    assignedTechnician: 'Costantino',
    whatIDidSummary: 'Mandato ieri (20/10/2026) per email a Henok e Mike le istruzioni d\'uso BMS per Electrical e il Water Report.',
    followUpChannel: 'email',
    lastActionDate: '2026-10-20',
    waitingReplyFrom: 'Henok e Mike',
    nextActionToDo: 'Attendere feedback da Henok e Mike su istruzioni d\'uso BMS (Electrical) e Water Report.',
    trackingLogs: [
      {
        id: 'trk-eagle-002-1',
        date: '2026-10-20',
        time: '15:30',
        whatIDid: 'Mandato per email a Henok e Mike le istruzioni d\'uso BMS per Electrical e il Water Report.',
        channel: 'email',
        awaitingReply: true,
        waitingReplyFrom: 'Henok e Mike',
        nextStep: 'Ricevere feedback / approvazione da Henok e Mike.',
        referenceDoc: 'BMS_Istruzioni_Uso_Electrical_&_Water_Report.pdf'
      }
    ],
    actionSteps: [
      {
        id: 'act-eagle-002-1',
        text: 'Inviate per email a Henok e Mike le istruzioni d\'uso BMS per Electrical e Water Report (20/10/2026)',
        completed: true,
        completedAt: '2026-10-20T15:30:00Z'
      },
      {
        id: 'act-eagle-002-2',
        text: 'Ricezione feedback da Henok e Mike',
        completed: false
      },
      {
        id: 'act-eagle-002-3',
        text: 'Eventuale revisione / emissione finale documentazione BMS',
        completed: false
      }
    ]
  }
];

// Helper for Awash Bank tracking items
const AWASH_BANK_INITIAL_WORKS: InterventionRequest[] = [
  {
    id: 'lav-awash-001',
    code: 'LAV-AWASH-2026-001',
    recordType: 'project_work',
    projectId: 'proj-awash-bank',
    projectName: 'Awash Bank',
    title: 'Materiale Rilevamento CO per Parking Area (Ritiro da Dodic)',
    siteName: 'Awash Bank — Parking Area',
    siteAddress: 'Awash Bank Building',
    clientName: 'Dodic',
    clientContact: '',
    description: 'Ordinato il materiale per il sistema di rilevamento CO sulla Parking Area. Il materiale deve essere ritirato da Dodic.',
    desiredAccessDate: '2026-10-21',
    desiredAccessTime: '09:00',
    priority: 'high',
    defectPhotos: [],
    notes: 'Materiale rilevamento CO Parking Area ordinato — deve essere ritirato da Dodic.',
    status: 'in_progress',
    createdAt: '2026-10-21T09:00:00Z',
    updatedAt: '2026-10-21T09:00:00Z',
    assignedTechnician: 'Costantino',
    whatIDidSummary: 'Ordinato il materiale per il rilevamento CO sulla Parking Area. Deve essere ritirato da Dodic.',
    followUpChannel: 'phone',
    lastActionDate: '2026-10-21',
    waitingReplyFrom: 'Dodic (Ritiro materiale rilevamento CO)',
    nextActionToDo: 'Ritiro del materiale per rilevamento CO da parte di Dodic e consegna in cantiere (Parking Area).',
    trackingLogs: [
      {
        id: 'trk-awash-001-1',
        date: '2026-10-21',
        time: '09:30',
        whatIDid: 'Ordinato il materiale per il rilevamento CO sulla Parking Area. Da ritirare da Dodic.',
        channel: 'phone',
        awaitingReply: true,
        waitingReplyFrom: 'Dodic (Ritiro materiale rilevamento CO)',
        nextStep: 'Ritiro materiale da Dodic e avvio installazione rilevamento CO nella Parking Area.'
      }
    ],
    actionSteps: [
      {
        id: 'act-awash-001-1',
        text: 'Ordinato materiale per rilevamento CO sulla Parking Area',
        completed: true,
        completedAt: '2026-10-21T09:30:00Z'
      },
      {
        id: 'act-awash-001-2',
        text: 'Ritiro del materiale da parte di Dodic',
        completed: false
      },
      {
        id: 'act-awash-001-3',
        text: 'Installazione e collaudo impianto rilevamento CO in Parking Area',
        completed: false
      }
    ]
  },
  {
    id: 'lav-awash-002',
    code: 'LAV-AWASH-2026-002',
    recordType: 'project_work',
    projectId: 'proj-awash-bank',
    projectName: 'Awash Bank',
    title: 'Fornitura Materiale Urmet (In Arrivo)',
    siteName: 'Awash Bank',
    siteAddress: 'Awash Bank Building',
    clientName: 'Fornitore Urmet',
    clientContact: '',
    description: 'Ordinato materiale Urmet per Awash Bank — materiale attualmente in arrivo.',
    desiredAccessDate: '2026-10-21',
    desiredAccessTime: '09:30',
    priority: 'medium',
    defectPhotos: [],
    notes: 'Materiale Urmet ordinato ed in arrivo.',
    status: 'in_progress',
    createdAt: '2026-10-21T09:30:00Z',
    updatedAt: '2026-10-21T09:30:00Z',
    assignedTechnician: 'Costantino',
    whatIDidSummary: 'Ordinato materiale Urmet per Awash Bank — il materiale è attualmente in arrivo.',
    followUpChannel: 'email',
    lastActionDate: '2026-10-21',
    waitingReplyFrom: 'Fornitore / Spedizione (Arrivo materiale Urmet)',
    nextActionToDo: 'Attendere consegna del materiale Urmet in arrivo e procedere con installazione.',
    trackingLogs: [
      {
        id: 'trk-awash-002-1',
        date: '2026-10-21',
        time: '09:45',
        whatIDid: 'Ordinato materiale Urmet per il progetto Awash Bank — spedizione / materiale in arrivo.',
        channel: 'email',
        awaitingReply: true,
        waitingReplyFrom: 'Fornitore / Spedizione (Arrivo materiale Urmet)',
        nextStep: 'Verifica merce all\'arrivo e avvio installazione Urmet.'
      }
    ],
    actionSteps: [
      {
        id: 'act-awash-002-1',
        text: 'Ordinato materiale Urmet per Awash Bank',
        completed: true,
        completedAt: '2026-10-21T09:45:00Z'
      },
      {
        id: 'act-awash-002-2',
        text: 'Arrivo e ricezione materiale Urmet',
        completed: false
      },
      {
        id: 'act-awash-002-3',
        text: 'Installazione e messa in funzione sistema Urmet',
        completed: false
      }
    ]
  }
];

// 4. Initial Project Works & Action Items (Lavori & Azioni sui Progetti)
const INITIAL_PROJECT_WORKS: InterventionRequest[] = [
  ...AWASH_BANK_INITIAL_WORKS,
  ...EAGLE_HILLS_INITIAL_WORKS,
  ...HILTON_INITIAL_WORKS,
  ...PANVAC_INITIAL_WORKS,
  {
    id: 'lav-log-001',
    code: 'LAV-LOG-N-2026-001',
    recordType: 'project_work',
    projectId: 'proj-logistica',
    projectName: 'North Logistics',
    title: 'Adeguamento selettività magnetotermici e verifica linea pneumatica smistamento',
    siteName: 'North Logistics - Linea Smistamento B2',
    siteAddress: 'Facility 2, Agrate Brianza',
    clientName: 'ACX Logistics Ltd',
    clientContact: '+39 039 6543210',
    description: 'Controllo serraggi sbarre quadro distribuzione principale, verifica taratura relè termici nastri trasportatori e controllo pressione attuatori pneumatici.',
    desiredAccessDate: '2026-10-25',
    desiredAccessTime: '07:30',
    priority: 'high',
    defectPhotos: [],
    notes: 'Attività programmata prima dell\'avvio del turno mattutino.',
    status: 'pending',
    createdAt: '2026-10-20T08:15:00Z',
    updatedAt: '2026-10-20T08:15:00Z',
    assignedTechnician: 'Costantino',
    whatIDidSummary: 'Inviato schema aggiornato quadro QG-02 e richiesto permesso di lavoro fuori turno.',
    followUpChannel: 'email',
    lastActionDate: '2026-10-20',
    waitingReplyFrom: 'Resp. Manutenzione ACX Logistics (Ing. Galli)',
    followUpDueDate: '2026-10-24',
    nextActionToDo: 'Verifica termografica e taratura protezioni motori linea B2.',
    trackingLogs: [
      {
        id: 'trk-log-301',
        date: '2026-10-20',
        time: '09:30',
        whatIDid: 'Inviata email con piano operativo, DUVRI aggiornato e schema selettività quadro QG-02.',
        channel: 'email',
        awaitingReply: true,
        waitingReplyFrom: 'Resp. Manutenzione ACX Logistics (Ing. Galli)',
        followUpDueDate: '2026-10-24',
        nextStep: 'Conferma fermo impianto sabato mattina 07:30',
        referenceDoc: 'Schema_QG02_Selettivita.pdf'
      }
    ],
    actionSteps: [
      { id: 'act-301', text: 'Controllo termografico interruttori quadro generale QG-02', completed: false },
      { id: 'act-302', text: 'Verifica taratura protezioni motori nastri linea B2', completed: false },
      { id: 'act-303', text: 'Test arresto di emergenza e ripristino sicurezza PLC', completed: false }
    ]
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
    let parsed: Project[] = JSON.parse(raw);
    let modified = false;

    const hasPanvac = parsed.some(
      p =>
        p.id === 'proj-panvac' ||
        p.name.toLowerCase().includes('panva') ||
        p.code.toLowerCase().includes('panva')
    );
    if (!hasPanvac) {
      const panvacDefault = INITIAL_PROJECTS.find(p => p.id === 'proj-panvac');
      if (panvacDefault) {
        parsed = [panvacDefault, ...parsed];
        modified = true;
      }
    }

    const hasHilton = parsed.some(
      p =>
        p.id === 'proj-hilton' ||
        p.name.toLowerCase().includes('hilton') ||
        p.code.toLowerCase().includes('hilton')
    );
    if (!hasHilton) {
      const hiltonDefault = INITIAL_PROJECTS.find(p => p.id === 'proj-hilton');
      if (hiltonDefault) {
        parsed = [hiltonDefault, ...parsed];
        modified = true;
      }
    }

    const hasEagleHills = parsed.some(
      p =>
        p.id === 'proj-eagle-hills' ||
        p.name.toLowerCase().includes('eagle') ||
        p.code.toLowerCase().includes('eagle')
    );
    if (!hasEagleHills) {
      const eagleDefault = INITIAL_PROJECTS.find(p => p.id === 'proj-eagle-hills');
      if (eagleDefault) {
        parsed = [eagleDefault, ...parsed];
        modified = true;
      }
    }

    const hasAwash = parsed.some(
      p =>
        p.id === 'proj-awash-bank' ||
        p.name.toLowerCase().includes('awash') ||
        p.code.toLowerCase().includes('awash')
    );
    if (!hasAwash) {
      const awashDefault = INITIAL_PROJECTS.find(p => p.id === 'proj-awash-bank');
      if (awashDefault) {
        parsed = [awashDefault, ...parsed];
        modified = true;
      }
    }

    if (modified) {
      localStorage.setItem(STORAGE_PROJECTS, JSON.stringify(parsed));
    }
    return parsed;
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
    const projects = fetchProjects();
    const panvacProj =
      projects.find(
        p =>
          p.id === 'proj-panvac' ||
          p.name.toLowerCase().includes('panva') ||
          p.code.toLowerCase().includes('panva')
      ) || INITIAL_PROJECTS.find(p => p.id === 'proj-panvac')!;

    const hiltonProj =
      projects.find(
        p =>
          p.id === 'proj-hilton' ||
          p.name.toLowerCase().includes('hilton') ||
          p.code.toLowerCase().includes('hilton')
      ) || INITIAL_PROJECTS.find(p => p.id === 'proj-hilton')!;

    const eagleProj =
      projects.find(
        p =>
          p.id === 'proj-eagle-hills' ||
          p.name.toLowerCase().includes('eagle') ||
          p.code.toLowerCase().includes('eagle')
      ) || INITIAL_PROJECTS.find(p => p.id === 'proj-eagle-hills')!;

    const awashProj =
      projects.find(
        p =>
          p.id === 'proj-awash-bank' ||
          p.name.toLowerCase().includes('awash') ||
          p.code.toLowerCase().includes('awash')
      ) || INITIAL_PROJECTS.find(p => p.id === 'proj-awash-bank')!;

    const normalizedWorks = INITIAL_PROJECT_WORKS.map(w => {
      if (w.projectId === 'proj-panvac') {
        return { ...w, projectId: panvacProj.id, projectName: panvacProj.name };
      }
      if (w.projectId === 'proj-hilton') {
        return { ...w, projectId: hiltonProj.id, projectName: hiltonProj.name };
      }
      if (w.projectId === 'proj-eagle-hills') {
        return { ...w, projectId: eagleProj.id, projectName: eagleProj.name };
      }
      if (w.projectId === 'proj-awash-bank') {
        return { ...w, projectId: awashProj.id, projectName: awashProj.name };
      }
      return w;
    });

    const raw = localStorage.getItem(STORAGE_INTERVENTIONS);
    if (!raw) {
      const combined = [... normalizedWorks, ...INITIAL_INTERVENTIONS];
      localStorage.setItem(STORAGE_INTERVENTIONS, JSON.stringify(combined));
      localStorage.setItem(STORAGE_PROJECT_WORKS_SEEDED, 'true');
      return combined;
    }
    const parsed: InterventionRequest[] = JSON.parse(raw);
    // Filter out any project_work items for Dendi or Workbank as requested
    const cleanedParsed = parsed.filter(item => {
      if (item.recordType === 'project_work') {
        const pName = (item.projectName || '').toLowerCase();
        if (
          item.id === 'lav-wb-001' ||
          item.id === 'lav-wb-002' ||
          item.projectId === 'proj-workbank' ||
          pName.includes('workbank') ||
          pName.includes('wordbank') ||
          pName.includes('dendi')
        ) {
          return false;
        }
      }
      return true;
    });

    if (!localStorage.getItem(STORAGE_PROJECT_WORKS_SEEDED)) {
      const sampleMap = new Map(normalizedWorks.map(w => [w.id, w]));
      const existingIds = new Set(cleanedParsed.map(i => i.id));
      const upgraded = cleanedParsed.map(item => {
        const sample = sampleMap.get(item.id);
        if (sample && (!item.trackingLogs || item.trackingLogs.length === 0)) {
          return { ...sample, ...item, trackingLogs: sample.trackingLogs, waitingReplyFrom: sample.waitingReplyFrom, followUpChannel: sample.followUpChannel, lastActionDate: sample.lastActionDate, whatIDidSummary: sample.whatIDidSummary, nextActionToDo: sample.nextActionToDo, followUpDueDate: sample.followUpDueDate };
        }
        return item;
      });
      const missingSamples = normalizedWorks.filter(w => !existingIds.has(w.id));
      const merged = [...missingSamples, ...upgraded];
      localStorage.setItem(STORAGE_INTERVENTIONS, JSON.stringify(merged));
      localStorage.setItem(STORAGE_PROJECT_WORKS_SEEDED, 'true');
      return merged;
    }
    if (cleanedParsed.length !== parsed.length) {
      localStorage.setItem(STORAGE_INTERVENTIONS, JSON.stringify(cleanedParsed));
    }
    return cleanedParsed;
  } catch {
    return [...INITIAL_PROJECT_WORKS, ...INITIAL_INTERVENTIONS];
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

