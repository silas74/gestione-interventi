import { InterventionRequest } from '../types';

/**
 * Extracts clean phone number digits suitable for WhatsApp API (wa.me)
 * E.g.: "+39 02 8877665" -> "39028877665"
 * E.g.: "347 1234567" -> "393471234567" (prefixes 39 if typical 10-digit mobile)
 */
export function getWhatsAppPhoneDigits(contact: string): string | null {
  if (!contact) return null;
  const digits = contact.replace(/[^0-9]/g, '');
  if (digits.length < 6) return null;

  // If Italian mobile number without international prefix (e.g. 3471234567, 10 digits starting with 3)
  if (digits.length === 10 && digits.startsWith('3')) {
    return '39' + digits;
  }

  return digits;
}

/**
 * Formats a clean tel: URI for native dialing on smartphones and tablets
 */
export function getTelUri(contact: string): string | null {
  if (!contact) return null;
  // Keep digits and leading +
  const cleaned = contact.replace(/[^0-9+]/g, '');
  return cleaned.length >= 5 ? `tel:${cleaned}` : null;
}

/**
 * Generates direct WhatsApp chat URL with pre-filled message targeted to the client/requester
 */
export function getClientWhatsAppUri(intervention: InterventionRequest): string {
  const digits = getWhatsAppPhoneDigits(intervention.clientContact || '');
  
  const greeting = intervention.clientName ? `Hello ${intervention.clientName},` : 'Hello,';
  const message = `${greeting} I am contacting you regarding Service Ticket *${intervention.code}* - "${intervention.title}" at ${intervention.siteName}.\n\nScheduled access: ${intervention.desiredAccessDate}${intervention.desiredAccessTime ? ` at ${intervention.desiredAccessTime}` : ''}.\nAssigned Technician: ${intervention.assignedTechnician || 'Field Support Team'}.\n\nPlease let us know if you have any questions or access instructions.`;

  if (digits) {
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }
  // If no direct number, open WhatsApp contact picker with pre-filled message
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Generates WhatsApp share URL to forward the full intervention details to colleagues, technicians or chat groups
 */
export function getTicketShareWhatsAppUri(intervention: InterventionRequest): string {
  const isCompleted = intervention.status === 'completed' || intervention.status === 'completato';
  const statusText = isCompleted ? '🟢 COMPLETED' : '🔴 TO DO / OPEN';

  const message = [
    `📋 *SERVICE TICKET SUMMARY*`,
    `*Code:* ${intervention.code}`,
    `*Project:* ${intervention.projectName || 'General'}`,
    `*Status:* ${statusText}`,
    `*Priority:* ${intervention.priority.toUpperCase()}`,
    `*Subject:* ${intervention.title}`,
    `*Facility:* ${intervention.siteName}`,
    intervention.siteAddress ? `*Address:* ${intervention.siteAddress}` : '',
    `*Client / Contact:* ${intervention.clientName} (${intervention.clientContact || 'N/A'})`,
    `*Access Date:* ${intervention.desiredAccessDate}${intervention.desiredAccessTime ? ` at ${intervention.desiredAccessTime}` : ''}`,
    `*Assigned Technician:* ${intervention.assignedTechnician || 'Unassigned'}`,
    `*Details:* ${intervention.description}`,
    intervention.notes ? `*Notes:* ${intervention.notes}` : '',
    intervention.report ? `*Work Done:* ${intervention.report.workDone} (${intervention.report.hoursWorked} hrs)` : ''
  ].filter(Boolean).join('\n');

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
