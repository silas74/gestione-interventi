import { InterventionRequest, Project } from '../types';

export type EmailActionType = 'create' | 'follow_up' | 'close';

export interface ParsedEmailResult {
  action: EmailActionType;
  actionReason: string;
  sender: string;
  senderEmail?: string;
  receivedAt: string;
  subject: string;
  cleanBody: string;
  priority: 'urgent' | 'medium' | 'low';
  matchedInterventionId?: string;
  matchedProjectId?: string;
  suggestedTitle: string;
  rawSnippet: string;
}

/**
 * Normalizes date string into YYYY-MM-DD HH:mm format
 */
export function formatEmailDateTime(input?: string): string {
  if (!input || !input.trim()) {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  // Try parsing natural Italian dates like "26 settembre 2026 14:35" or "26/09/2026 14:35"
  const clean = input.trim();
  const dmyMatch = clean.match(/(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    const hours = (dmyMatch[4] || '12').padStart(2, '0');
    const mins = (dmyMatch[5] || '00').padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${mins}`;
  }

  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
  }

  return clean;
}

/**
 * Main email parser: extracts sender, date, subject, body and detects intent (create, follow-up, close)
 */
export function parseInboundEmail(
  rawText: string,
  existingInterventions: InterventionRequest[] = [],
  existingProjects: Project[] = []
): ParsedEmailResult {
  const text = rawText.trim();
  if (!text) {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return {
      action: 'create',
      actionReason: 'Testo vuoto, impostato su nuovo ticket',
      sender: 'Mittente Sconosciuto',
      receivedAt: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
      subject: 'Nuova Richiesta da Email',
      cleanBody: '',
      priority: 'medium',
      suggestedTitle: 'Nuova Richiesta Intervento',
      rawSnippet: ''
    };
  }

  // 1. Extract Sender (From / Da / Mittente)
  let sender = '';
  let senderEmail = '';
  const fromMatch = text.match(/(?:From|Da|Mittente)\s*:\s*([^\r\n]+)/i);
  if (fromMatch) {
    sender = fromMatch[1].trim();
  } else {
    // Look for first email address in text
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      sender = emailMatch[0];
      senderEmail = emailMatch[0];
    } else {
      sender = 'Cliente / Mittente Email';
    }
  }

  if (!senderEmail) {
    const emailInside = sender.match(/<([^>]+)>/) || sender.match(/([\w.-]+@[\w.-]+\.\w+)/);
    if (emailInside) {
      senderEmail = emailInside[1];
    }
  }

  // 2. Extract Date (Date / Data / Inviato / Sent)
  let receivedAt = '';
  const dateMatch = text.match(/(?:Date|Data|Inviato|Sent)\s*:\s*([^\r\n]+)/i);
  if (dateMatch) {
    receivedAt = formatEmailDateTime(dateMatch[1]);
  } else {
    receivedAt = formatEmailDateTime();
  }

  // 3. Extract Subject (Subject / Oggetto)
  let subject = '';
  const subjectMatch = text.match(/(?:Subject|Oggetto)\s*:\s*([^\r\n]+)/i);
  if (subjectMatch) {
    subject = subjectMatch[1].trim();
  } else {
    // Pick the first line as subject if short
    const firstLine = text.split('\n')[0].replace(/^(re|fwd|r|i):\s*/i, '').trim();
    subject = firstLine.length > 0 && firstLine.length < 90 ? firstLine : 'Richiesta di Intervento via Email';
  }

  // 4. Extract Clean Body (remove common header lines)
  const lines = text.split(/\r?\n/);
  const headerKeys = /^(from|da|mittente|to|a|inviato|sent|date|data|subject|oggetto|cc|ccn)\s*:/i;
  const bodyLines = lines.filter(line => !headerKeys.test(line.trim()));
  const cleanBody = bodyLines.join('\n').trim();

  // 5. Detect Reference to Existing Ticket
  let matchedIntervention: InterventionRequest | undefined;
  
  // Search by code pattern: e.g. INT-2026-001 or TK-123 or #123
  const codeRegex = /(?:INT-[\w-]+|TK-[\w-]+|#\d+|ticket\s*#?[\w-]+)/gi;
  const codesFound = text.match(codeRegex) || [];
  for (const found of codesFound) {
    const cleanCode = found.replace(/^ticket\s*#?/i, '').replace(/^#/, '').trim().toUpperCase();
    const match = existingInterventions.find(i => 
      i.code.toUpperCase().includes(cleanCode) || 
      i.id.toUpperCase().includes(cleanCode)
    );
    if (match) {
      matchedIntervention = match;
      break;
    }
  }

  // If no explicit code, search by strong subject similarity with existing open tickets
  if (!matchedIntervention && existingInterventions.length > 0) {
    const lowerSubject = subject.toLowerCase().replace(/^(re|r|fwd|i):\s*/i, '').trim();
    if (lowerSubject.length > 5) {
      matchedIntervention = existingInterventions.find(i => 
        i.title.toLowerCase().includes(lowerSubject) || 
        lowerSubject.includes(i.title.toLowerCase())
      );
    }
  }

  // 6. Project Matching
  let matchedProjectId: string | undefined;
  for (const proj of existingProjects) {
    const projNameMatch = new RegExp(`\\b${proj.name}\\b`, 'i').test(text);
    const projCodeMatch = new RegExp(`\\b${proj.code}\\b`, 'i').test(text);
    if (projNameMatch || projCodeMatch) {
      matchedProjectId = proj.id;
      break;
    }
  }
  if (!matchedProjectId && matchedIntervention?.projectId) {
    matchedProjectId = matchedIntervention.projectId;
  }

  // 7. Priority Detection
  const urgentKeywords = /(?:urgent|urgente|urgentemente|emergenza|bloccante|pericolo|fermo\s*macchina|fermo\s*produzione|allagamento|scintille|perdita\s*d'acqua|asap|subito|immediat)/i;
  const isUrgent = urgentKeywords.test(text);
  const priority = isUrgent ? 'urgent' : 'medium';

  // 8. Intent & Action Classification (Close, Follow-up, Create)
  let action: EmailActionType = 'create';
  let actionReason = '';

  const closeKeywords = /(?:risolto|è\s*risolto|e\s*risolto|risolta|funziona\s*tutto|tutto\s*a\s*posto|tutto\s*ok|problema\s*superato|problema\s*rientrato|potete\s*chiudere|chiudere\s*il\s*ticket|chiudi\s*ticket|ticket\s*chiuso|chiusura\s*richiesta|confermo\s*risoluzione|lavoro\s*completato|resolved|issue\s*closed|close\s*ticket)/i;
  const followUpKeywords = /(?:aggiornamento|in\s*riferimento|seguito\s*di|ricambi\s*arrivati|pezzi\s*arrivati|ricambio\s*disponibile|waiting\s*for\s*parts|in\s*attesa|stato\s*avanzamento|allego\s*dettagli|follow[\s-]?up|update)/i;

  if (closeKeywords.test(text) && (matchedIntervention || existingInterventions.length > 0)) {
    action = 'close';
    actionReason = matchedIntervention
      ? `Rilevata conferma di avvenuta risoluzione per il ticket "${matchedIntervention.title}" (${matchedIntervention.code})`
      : 'Rilevata intenzione di chiusura / risoluzione del problema';
  } else if ((matchedIntervention || followUpKeywords.test(text)) && existingInterventions.length > 0) {
    action = 'follow_up';
    actionReason = matchedIntervention
      ? `Rilevato aggiornamento per l'intervento esistente "${matchedIntervention.title}" (${matchedIntervention.code})`
      : 'Rilevato messaggio di follow-up o aggiornamento ricambi';
  } else {
    action = 'create';
    actionReason = isUrgent
      ? 'Rilevata nuova segnalazione con priorità URGENTE'
      : 'Rilevata nuova richiesta di intervento da inserire in TO DO';
  }

  // Suggested title for new intervention
  const cleanSubject = subject.replace(/^(re|r|fwd|i):\s*/i, '').trim();
  const suggestedTitle = cleanSubject || (cleanBody.split('\n')[0]?.slice(0, 60) || 'Intervento da Email');

  return {
    action,
    actionReason,
    sender,
    senderEmail,
    receivedAt,
    subject: cleanSubject,
    cleanBody,
    priority,
    matchedInterventionId: matchedIntervention?.id,
    matchedProjectId,
    suggestedTitle,
    rawSnippet: text.slice(0, 180)
  };
}

/**
 * Sample test emails to demonstrate the 3 scenarios easily
 */
export const SAMPLE_EMAILS = {
  urgentNew: `Da: Ing. Marco Ferri <m.ferri@workbank.it>
Data: 26/09/2026 14:15
A: assistenza@service.it
Oggetto: Guasto urgente quadro elettrico Reparto Macchine Workbank

Buongiorno,
segnalo un guasto bloccante all'impianto di alimentazione del piano terra. Il quadro emette scintille e la linea di produzione è completamente ferma. 
È un intervento urgente da gestire prima possibile.

Grazie,
Ing. Marco Ferri - Responsabile Sicurezza`,

  followUpParts: `Da: Fornitore Ricambi Elettrici <ordini@elettroforniture.it>
Data: 26/09/2026 15:40
A: assistenza@service.it
Oggetto: R: [INT-2026-WB1] Aggiornamento ricambi e schede elettroniche

Gentile Assistenza Tecnica,
in riferimento al vostro ticket INT-2026-WB1 per Workbank, vi confermiamo che i 2 teleruttori e la scheda di ricambio ordinati sono arrivati e sono pronti per il ritiro/installazione.

Cordiali saluti,
Magazzino Ricambi`,

  closeResolved: `Da: Studio Dentistico Rossi <direzione@studiorossi.it>
Data: 26/09/2026 16:50
A: assistenza@service.it
Oggetto: R: Problema autoclave sterilizzatrice - Tutto Risolto

Buonasera Costantino,
dopo l'intervento del vostro tecnico abbiamo completato i cicli di prova dell'autoclave. Funziona tutto perfettamente a regime e non ci sono più perdite di pressione.
Potete considerare il ticket chiuso e risolto con successo! 

Grazie per la tempestività,
Dott. Rossi`
};
