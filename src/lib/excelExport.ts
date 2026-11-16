import { InterventionRequest, DailySiteReport } from '../types';

/**
 * Escapes CSV field value to ensure Excel compatibility
 */
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
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
    'Arrival Time',
    'Departure Time',
    'Break (min)',
    'Hours Worked',
    'Area / Floor',
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
    'Next Day Plan',
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
      escapeCsv(item.report?.startTime || ''),
      escapeCsv(item.report?.endTime || ''),
      escapeCsv(item.report?.breakMinutes !== undefined ? item.report.breakMinutes : ''),
      escapeCsv(hours > 0 ? hours.toFixed(2) : '0.00'),
      escapeCsv(item.report?.areaOrFloor || ''),
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
      escapeCsv(item.report?.nextDayPlan || ''),
      escapeCsv(item.clientFeedback?.rating ? `${item.clientFeedback.rating} Stars` : ''),
      escapeCsv(item.clientFeedback?.notes || '')
    ].join(';');
  });

  // Summary row with Total Hours
  const summaryRow = [
    escapeCsv('TOTAL'),
    escapeCsv(`${interventions.length} Tickets`),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
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
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv('')
  ].join(';');

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

/**
 * Exports Daily Site Reports (Orario Arrivo, Orario Partenza, Ore, Cose Fatte, Foto) to Excel CSV
 */
export function exportDailySiteReportsToExcel(projectName: string, reports: DailySiteReport[]) {
  const headers = [
    'Codice Giorno',
    'Progetto / Cantiere',
    'Data',
    'Tecnico',
    'Ora Arrivo Cantiere',
    'Ora Partenza Cantiere',
    'Pausa (min)',
    'Ore Lavorate Nette',
    'Zona / Piano',
    'Lavori Svolti Oggi',
    'Materiali Utilizzati',
    'Problemi / Note Cantiere',
    'Programma Domani',
    'N. Foto Allegate',
    'Referente Cantiere'
  ];

  let totalHours = 0;

  const sorted = [...reports].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const rows = sorted.map((r) => {
    const hrs = Number(r.hoursWorked) || 0;
    totalHours += hrs;
    return [
      escapeCsv(r.code),
      escapeCsv(r.projectName),
      escapeCsv(r.date),
      escapeCsv(r.technicianName),
      escapeCsv(r.arrivalTime),
      escapeCsv(r.departureTime),
      escapeCsv(r.breakMinutes || 0),
      escapeCsv(hrs.toFixed(2)),
      escapeCsv(r.areaOrFloor || ''),
      escapeCsv(r.workDone),
      escapeCsv(r.materialsUsed || ''),
      escapeCsv(r.issuesFound || ''),
      escapeCsv(r.nextDayPlan || ''),
      escapeCsv((r.photos || []).length),
      escapeCsv(r.clientSignerName || '')
    ].join(';');
  });

  const summaryRow = [
    escapeCsv('TOTALE'),
    escapeCsv(projectName),
    escapeCsv(`${reports.length} Giornate`),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv('TOTALE ORE:'),
    escapeCsv(totalHours.toFixed(2)),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv('')
  ].join(';');

  const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(';'), ...rows, summaryRow].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const safeProj = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `Timesheet_Giornaliero_${safeProj}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { count: reports.length, totalHours };
}
