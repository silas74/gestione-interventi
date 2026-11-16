import { DailySiteReport, InterventionRequest, PdfLanguage } from '../types';

export type AiProvider = 'deepseek' | 'ollama';

export interface AiSettings {
  provider: AiProvider;
  deepseekApiKey: string;
  deepseekBaseUrl: string;
  deepseekModel: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
}

const STORAGE_AI_SETTINGS = 'interventi_ai_settings_v1';

const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: 'deepseek',
  deepseekApiKey: '',
  deepseekBaseUrl: 'https://api.deepseek.com',
  deepseekModel: 'deepseek-chat',
  ollamaBaseUrl: 'http://127.0.0.1:11434',
  ollamaModel: 'qwen2.5:1.5b',
};

export function getAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(STORAGE_AI_SETTINGS);
    if (!raw) return DEFAULT_AI_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_AI_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveAiSettings(settings: AiSettings): void {
  localStorage.setItem(STORAGE_AI_SETTINGS, JSON.stringify(settings));
}

export function isAiConfigured(): boolean {
  const s = getAiSettings();
  if (s.provider === 'deepseek') {
    return Boolean(s.deepseekApiKey && s.deepseekApiKey.trim().length > 5);
  }
  return Boolean(s.ollamaBaseUrl && s.ollamaBaseUrl.trim().length > 0 && s.ollamaModel.trim().length > 0);
}

/**
 * Returns candidate base URLs including the automatic local CORS bridge ports
 * (11436 for Ollama 11434, 8082 for llama.cpp 8080) so HTTPS GitHub Pages never gets 403 CORS blocked.
 */
function getCandidateLocalUrls(rawBaseUrl?: string): string[] {
  const cleanBase = (rawBaseUrl || getAiSettings().ollamaBaseUrl || 'http://127.0.0.1:11434')
    .trim()
    .replace(/\/+$/, '');
  const candidates: string[] = [];

  if (cleanBase.includes(':11434')) {
    candidates.push('http://127.0.0.1:11436');
    candidates.push(cleanBase);
  } else if (cleanBase.includes(':8080')) {
    candidates.push('http://127.0.0.1:8082');
    candidates.push(cleanBase);
    candidates.push('http://127.0.0.1:11436');
  } else {
    candidates.push(cleanBase);
    candidates.push('http://127.0.0.1:11436');
    candidates.push('http://127.0.0.1:8082');
  }

  return Array.from(new Set(candidates));
}

/**
 * Queries the local Ollama (/api/tags) or llama.cpp (/v1/models) instance to list all installed models on the PC
 */
export async function fetchLocalOllamaModels(baseUrl?: string): Promise<string[]> {
  const candidates = getCandidateLocalUrls(baseUrl);
  let lastError = '';

  for (const candidate of candidates) {
    // 1. Try Ollama /api/tags
    try {
      const res = await fetch(`${candidate}/api/tags`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.models) && data.models.length > 0) {
          return data.models.map((m: any) => m.name || m.model).filter(Boolean);
        }
      } else {
        lastError = `HTTP ${res.status}`;
      }
    } catch (e: any) {
      lastError = e?.message || 'Connessione rifiutata';
    }

    // 2. Try OpenAI-compatible /v1/models (supported by both Ollama and llama.cpp / NVIDIA Personal AI Router)
    try {
      const resV1 = await fetch(`${candidate}/v1/models`, { method: 'GET' });
      if (resV1.ok) {
        const dataV1 = await resV1.json();
        if (dataV1 && Array.isArray(dataV1.data) && dataV1.data.length > 0) {
          return dataV1.data.map((m: any) => m.id).filter(Boolean);
        }
      }
    } catch {
      // ignore and try next candidate
    }
  }

  throw new Error(
    `Impossibile contattare il server AI locale (${lastError || 'Failed to fetch'}). Assicurati che Ollama / NVIDIA Personal AI Router sia attivo.`
  );
}

/**
 * Core AI completion call supporting DeepSeek Cloud API, Local Ollama (/api/chat) and llama.cpp (/v1/chat/completions)
 */
export async function callAiCompletion(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.2
): Promise<string> {
  const settings = getAiSettings();

  if (settings.provider === 'deepseek') {
    const apiKey = settings.deepseekApiKey.trim();
    if (!apiKey) {
      throw new Error(
        'Chiave API DeepSeek mancante. Apri "🤖 Impostazioni AI" in alto per inserire la tua API Key DeepSeek oppure seleziona Ollama Locale.'
      );
    }
    const baseUrl = (settings.deepseekBaseUrl || 'https://api.deepseek.com').replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: settings.deepseekModel || 'deepseek-chat',
        temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Errore API DeepSeek (${response.status}): ${errText || response.statusText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Risposta vuota da DeepSeek API.');
    }
    return content.trim();
  } else {
    // Local Ollama / llama.cpp provider
    const candidates = getCandidateLocalUrls(settings.ollamaBaseUrl);
    let model = settings.ollamaModel.trim() || 'qwen2.5:1.5b';

    // Auto-verify model against installed models on PC if possible
    try {
      const installedModels = await fetchLocalOllamaModels(settings.ollamaBaseUrl);
      if (installedModels.length > 0 && !installedModels.includes(model)) {
        // Prefer qwen2.5:1.5b or minicpm-v4.5:latest if available, else first model
        const preferred =
          installedModels.find((m) => m.startsWith('qwen2.5')) ||
          installedModels.find((m) => m.includes('minicpm')) ||
          installedModels[0];
        model = preferred;
        saveAiSettings({ ...settings, ollamaModel: model });
      }
    } catch {
      // proceed with selected model
    }

    let lastErr = '';

    for (const candidate of candidates) {
      // 1. Try OpenAI-compatible /v1/chat/completions (works on BOTH Ollama and llama.cpp / Personal AI Router)
      try {
        const resV1 = await fetch(`${candidate}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            temperature,
            stream: false,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
        });

        if (resV1.ok) {
          const dataV1 = await resV1.json();
          const contentV1 = dataV1?.choices?.[0]?.message?.content;
          if (contentV1) return contentV1.trim();
        } else {
          lastErr = `HTTP ${resV1.status}`;
        }
      } catch (e: any) {
        lastErr = e?.message || 'Failed to fetch';
      }

      // 2. Fallback to native Ollama /api/chat
      try {
        const response = await fetch(`${candidate}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            stream: false,
            options: { temperature },
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data?.message?.content;
          if (content) return content.trim();
        } else {
          const errText = await response.text().catch(() => '');
          lastErr = `HTTP ${response.status}: ${errText || response.statusText}`;
        }
      } catch (e: any) {
        lastErr = e?.message || 'Failed to fetch';
      }
    }

    throw new Error(
      `Errore connessione AI Locale (${lastErr}). Verifica che Ollama o NVIDIA Personal AI Router sia attivo.`
    );
  }
}

/**
 * Extracts JSON object from AI text response safely (strips markdown code fences if present)
 */
function parseJsonFromAi<T>(raw: string): T {
  const cleaned = raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  }
  return JSON.parse(cleaned);
}

// ============================================================================
// FEATURE A: DA APPUNTI VELOCI / DETTATURA VOCALE A REPORT TECNICO STRUTTURATO
// ============================================================================

export interface StructuredAiReportResult {
  workDone: string;
  materialsUsed?: string;
  issuesFound?: string;
  missingMaterials?: string;
  nextDayPlan?: string;
}

export async function formatRawNotesWithAi(params: {
  rawNotes: string;
  projectName: string;
  areaOrFloor?: string;
  existingMaterials?: string;
  existingIssues?: string;
  existingMissing?: string;
  existingNextPlan?: string;
  targetLang: PdfLanguage;
}): Promise<StructuredAiReportResult> {
  const isEn = params.targetLang === 'en';
  const systemPrompt = isEn
    ? `You are a Senior Field Commissioning & Electrical/ELV Engineer working on site at "${params.projectName}" (Zone/System: "${params.areaOrFloor || 'General'}").
Transform the technician's raw field notes into a clean, professional, well-structured technical daily report in ENGLISH.
Respond ONLY with a valid JSON object matching this exact structure (no markdown, no extra text):
{
  "workDone": "Detailed professional technical description of work performed today (bullet points with • )",
  "materialsUsed": "Materials/equipment installed or used today (empty string if none mentioned)",
  "issuesFound": "Technical issues, faults, or site constraints encountered (empty string if none)",
  "missingMaterials": "Missing materials or items to procure (empty string if none)",
  "nextDayPlan": "Logical next steps / work plan for tomorrow based on today's progress"
}`
    : `Sei un Ingegnere Senior di Cantiere (Impianti Elettrici, ELV, CCTV, Solar Sungrow, Parking LPR, Rilevamento CO) impegnato sul progetto "${params.projectName}" (Zona/Impianto: "${params.areaOrFloor || 'Generale'}").
Trasforma gli appunti veloci o dettati a voce dal tecnico in una relazione tecnica giornaliera professionale, chiara e ben strutturata in ITALIANO.
Rispondi ESCLUSIVAMENTE con un oggetto JSON valido con questa struttura esatta (nessun testo fuori dal JSON):
{
  "workDone": "Descrizione tecnica dettagliata e professionale dei lavori svolti oggi (usa punti elenco con • )",
  "materialsUsed": "Materiali o apparati installati/usati oggi (stringa vuota se non presenti)",
  "issuesFound": "Problemi tecnici, blocchi o anomalie riscontrate in cantiere (stringa vuota se non presenti)",
  "missingMaterials": "Materiali mancanti o da comprare per il cantiere (stringa vuota se non presenti)",
  "nextDayPlan": "Programma tecnico consigliato per domani in base a quanto svolto oggi"
}`;

  const userPrompt = `Appunti / Note grezze del tecnico:
"""
${params.rawNotes}
"""
${params.existingMaterials ? `Materiali già annotati: ${params.existingMaterials}\n` : ''}${params.existingIssues ? `Problemi già annotati: ${params.existingIssues}\n` : ''}${params.existingMissing ? `Materiali mancanti già annotati: ${params.existingMissing}\n` : ''}${params.existingNextPlan ? `Programma domani già annotato: ${params.existingNextPlan}\n` : ''}`;

  const rawReply = await callAiCompletion(systemPrompt, userPrompt, 0.2);
  try {
    const parsed = parseJsonFromAi<StructuredAiReportResult>(rawReply);
    return {
      workDone: parsed.workDone || params.rawNotes,
      materialsUsed: parsed.materialsUsed || params.existingMaterials || '',
      issuesFound: parsed.issuesFound || params.existingIssues || '',
      missingMaterials: parsed.missingMaterials || params.existingMissing || '',
      nextDayPlan: parsed.nextDayPlan || params.existingNextPlan || '',
    };
  } catch {
    return {
      workDone: rawReply,
      materialsUsed: params.existingMaterials,
      issuesFound: params.existingIssues,
      missingMaterials: params.existingMissing,
      nextDayPlan: params.existingNextPlan,
    };
  }
}

// ============================================================================
// FEATURE B: TRADUZIONE TECNICA ISTANTANEA ITALIANO <-> INGLESE DEL REPORT E FOTO
// ============================================================================

export interface TranslatedDailyReportFields {
  areaOrFloor?: string;
  workDone: string;
  materialsUsed?: string;
  issuesFound?: string;
  missingMaterials?: string;
  nextDayPlan?: string;
  photoCaptions: string[];
}

export async function translateDailyReportFieldsWithAi(params: {
  areaOrFloor?: string;
  workDone: string;
  materialsUsed?: string;
  issuesFound?: string;
  missingMaterials?: string;
  nextDayPlan?: string;
  photoCaptions: string[];
  targetLang: PdfLanguage;
}): Promise<TranslatedDailyReportFields> {
  const toEnglish = params.targetLang === 'en';
  const systemPrompt = toEnglish
    ? `You are a Senior Electrical, Solar & ELV Commissioning Engineer. Translate all the provided daily site report fields into accurate, professional engineering ENGLISH (using proper terminology such as commissioning, RAID array, PoE switch, LPR camera calibration, Modbus controller I/O mapping, Sungrow inverter string test, BESS battery pack, etc.).
Respond ONLY with a valid JSON object with the exact same keys:
{
  "areaOrFloor": "...",
  "workDone": "...",
  "materialsUsed": "...",
  "issuesFound": "...",
  "missingMaterials": "...",
  "nextDayPlan": "...",
  "photoCaptions": ["...", "..."]
}`
    : `Sei un Ingegnere Senior di Cantiere. Traduci tutti i campi del report giornaliero forniti in ITALIANO tecnico professionale.
Rispondi ESCLUSIVAMENTE con un oggetto JSON valido con le stesse chiavi:
{
  "areaOrFloor": "...",
  "workDone": "...",
  "materialsUsed": "...",
  "issuesFound": "...",
  "missingMaterials": "...",
  "nextDayPlan": "...",
  "photoCaptions": ["...", "..."]
}`;

  const userPrompt = JSON.stringify({
    areaOrFloor: params.areaOrFloor || '',
    workDone: params.workDone || '',
    materialsUsed: params.materialsUsed || '',
    issuesFound: params.issuesFound || '',
    missingMaterials: params.missingMaterials || '',
    nextDayPlan: params.nextDayPlan || '',
    photoCaptions: params.photoCaptions || [],
  });

  const rawReply = await callAiCompletion(systemPrompt, userPrompt, 0.15);
  const parsed = parseJsonFromAi<TranslatedDailyReportFields>(rawReply);
  return {
    areaOrFloor: parsed.areaOrFloor ?? params.areaOrFloor,
    workDone: parsed.workDone || params.workDone,
    materialsUsed: parsed.materialsUsed ?? params.materialsUsed,
    issuesFound: parsed.issuesFound ?? params.issuesFound,
    missingMaterials: parsed.missingMaterials ?? params.missingMaterials,
    nextDayPlan: parsed.nextDayPlan ?? params.nextDayPlan,
    photoCaptions: Array.isArray(parsed.photoCaptions) ? parsed.photoCaptions : params.photoCaptions,
  };
}

// ============================================================================
// FEATURE E: GENERAZIONE AUTOMATICA DEL VERBALE FINALE DI COLLAUDO E CONSEGNA
// ============================================================================

export interface FinalCommissioningReportData {
  title: string;
  executiveSummary: string;
  systemsCommissioned: string;
  testsAndVerifications: string;
  openPunchListOrNotes: string;
  handoverConclusion: string;
}

export async function generateFinalCommissioningCertificateWithAi(params: {
  projectName: string;
  dailyReports: DailySiteReport[];
  projectTasks: InterventionRequest[];
  targetLang: PdfLanguage;
}): Promise<FinalCommissioningReportData> {
  const isEn = params.targetLang === 'en';

  const daysSummary = params.dailyReports
    .slice()
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .map(
      (r, idx) =>
        `Day ${idx + 1} (${r.date}, ${r.arrivalTime}-${r.departureTime}, ${r.hoursWorked}h, Zone: ${r.areaOrFloor || '-'}): Work: ${r.workDone}${r.materialsUsed ? ` | Materials: ${r.materialsUsed}` : ''}${r.issuesFound ? ` | Notes: ${r.issuesFound}` : ''}`
    )
    .join('\n');

  const tasksSummary = params.projectTasks
    .map((t) => {
      const steps = t.actionSteps || [];
      const doneSteps = steps.filter((s) => s.completed).map((s) => `[DONE] ${s.text}`);
      const todoSteps = steps.filter((s) => !s.completed).map((s) => `[PENDING] ${s.text}`);
      return `System/Task [${t.code}] ${t.title} (Status: ${t.status}):\n  ${[...doneSteps, ...todoSteps].join('\n  ')}`;
    })
    .join('\n\n');

  const systemPrompt = isEn
    ? `You are a Lead Commissioning Engineer preparing the official "FINAL COMMISSIONING & HANDOVER CERTIFICATE" for project "${params.projectName}".
Based on the provided daily site logs and project checklists (such as CCTV 57 cameras & 4 NVR RAID, Solar System 2x Sungrow SH125CX 250kW + 100kWh batteries, Parking LPR & 4 barriers, CO detection, etc.), write a comprehensive, formal engineering commissioning report in ENGLISH.
Respond ONLY with a valid JSON object matching this exact structure:
{
  "title": "OFFICIAL COMMISSIONING, TESTING & HANDOVER REPORT — ${params.projectName.toUpperCase()}",
  "executiveSummary": "Formal executive summary of the commissioning activities, dates, total hours, and overall system readiness",
  "systemsCommissioned": "Detailed breakdown by system (CCTV, Solar System, Parking System LPR, CO Detection, etc.) of the equipment installed and configured",
  "testsAndVerifications": "Detailed summary of functional tests, calibrations, RAID/network checks, charge/discharge tests, and day/night trials performed",
  "openPunchListOrNotes": "Any remaining punch-list items, pending spare parts, or operational recommendations for the client",
  "handoverConclusion": "Formal handover statement certifying the work performed for client acceptance and sign-off"
}`
    : `Sei il Responsabile Tecnico di Collaudo incaricato di redigere il "VERBALE UFFICIALE DI COLLAUDO TECNICO E CONSEGNA IMPIANTI" per il progetto "${params.projectName}".
Sulla base dei report giornalieri di cantiere e delle checklist delle attività svolte (es. CCTV 57 telecamere e 4 NVR RAID, Solar System 2x Inverter Sungrow SH125CX 250kW + 100kWh batterie, Parking System LPR e 4 barriere, Rilevamento CO, ecc.), redigi un verbale tecnico formale, completo e dettagliato in ITALIANO.
Rispondi ESCLUSIVAMENTE con un oggetto JSON valido con questa struttura esatta:
{
  "title": "VERBALE UFFICIALE DI COLLAUDO E CONSEGNA IMPIANTI — ${params.projectName.toUpperCase()}",
  "executiveSummary": "Sintesi esecutiva formale delle attività di messa in servizio, giornate di presenza, ore lavorate e stato generale degli impianti",
  "systemsCommissioned": "Dettaglio tecnico diviso per impianto (CCTV, Solar System, Parking System LPR, Rilevamento CO, ecc.) degli apparati configurati e messi in servizio",
  "testsAndVerifications": "Dettaglio delle prove funzionali, collaudi a caldo, test rete/RAID, prove carica/scarica, tarature LPR diurne/notturne e verifiche di sicurezza eseguite",
  "openPunchListOrNotes": "Eventuali punti aperti (punch list), prescrizioni tecniche o raccomandazioni operative per la manutenzione e gli operatori",
  "handoverConclusion": "Formula conclusiva ufficiale di collaudo e consegna dell'impianto per accettazione e firma del cliente"
}`;

  const userPrompt = `PROGETTO: ${params.projectName}

STORICO GIORNATE DI CANTIERE (${params.dailyReports.length} giornate):
${daysSummary || 'Nessun diario giornaliero registrato.'}

STATO ATTIVITÀ E CHECKLIST IMPIANTI:
${tasksSummary || 'Nessuna checklist registrata.'}`;

  const rawReply = await callAiCompletion(systemPrompt, userPrompt, 0.25);
  return parseJsonFromAi<FinalCommissioningReportData>(rawReply);
}
