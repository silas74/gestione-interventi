import { InterventionRequest } from '../types';

/**
 * Escapes CSV field value to ensure Excel compatibility
 */
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  // If contains semicolon, comma, newlines, or quotes, wrap in quotes
  return `"${str.replace(/\r?\n/g, ' ')}"`;
}

/**
 * Exports interventions and logged hours to an Excel-compatible CSV file (with UTF-8 BOM)
 */
export function exportInterventionsToExcel(interventions: InterventionRequest[], filenamePrefix = 'Work_Hours_Report') {
  const headers = [
    'Ticket Code',
    'Project',
    'Date',
    'Technician',
    'Hours Worked',
    'Status',
    'Outcome',
    'Priority',
    'Client Name',
    'Contact Phone',
    'Facility / Site',
    'Address',
    'Subject / Task',
    'Work Performed',
    'Materials Used',
    'Client Rating',
    'Client Feedback'
  ];

  let totalHours = 0;

  const rows = interventions.map((item) => {
    const hours = item.report?.hoursWorked || 0;
    totalHours += hours;

    const isCompleted = item.status === 'completed' || item.status === 'completato';
    const statusText = isCompleted ? 'Completed' : 'To Do / Open';

    return [
      escapeCsv(item.code),
      escapeCsv(item.projectName || 'General'),
      escapeCsv(item.report?.interventionDate || item.desiredAccessDate),
      escapeCsv(item.report?.technicianName || item.assignedTechnician || 'Unassigned'),
      escapeCsv(hours > 0 ? hours.toFixed(2) : '0.00'),
      escapeCsv(statusText),
      escapeCsv(item.report?.statusOutcome || 'Pending'),
      escapeCsv(item.priority.toUpperCase()),
      escapeCsv(item.clientName),
      escapeCsv(item.clientContact || ''),
      escapeCsv(item.siteName),
      escapeCsv(item.siteAddress || ''),
      escapeCsv(item.title),
      escapeCsv(item.report?.workDone || item.description),
      escapeCsv(item.report?.materialsUsed || ''),
      escapeCsv(item.clientFeedback?.rating ? `${item.clientFeedback.rating} Stars` : ''),
      escapeCsv(item.clientFeedback?.notes || '')
    ].join(';');
  });

  // Summary row with Total Hours
  const summaryRow = [
    escapeCsv('TOTAL'),
    escapeCsv(`${interventions.length} Tickets`),
    escapeCsv(''),
    escapeCsv('TOTAL HOURS:'),
    escapeCsv(totalHours.toFixed(2)),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv('')
  ].join(';');

  // UTF-8 Byte Order Mark (\uFEFF) forces Excel to recognize UTF-8 characters cleanly
  const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(';'), ...rows, summaryRow].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `${filenamePrefix}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { count: interventions.length, totalHours };
}
