import { jsPDF } from 'jspdf';
import { InterventionRequest } from '../types';

export function generateInterventionReportPDF(intervention: InterventionRequest): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const report = intervention.report;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header background banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('RAPPORTO TECNICO DI INTERVENTO ON-SITE', 14, 18);

  // Subtitle / Code
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Codice Intervento: ${intervention.code}  |  Data Stampa: ${new Date().toLocaleDateString('it-IT')}`, 14, 28);

  // Accent Line
  doc.setFillColor(37, 99, 235); // blue-600
  doc.rect(0, 38, pageWidth, 2.5, 'F');

  let currentY = 50;

  // Helper for Section Header
  const drawSectionTitle = (title: string, y: number) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y - 5, pageWidth - 28, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(title.toUpperCase(), 16, y);
    return y + 9;
  };

  // Section 1: DATI RICHIESTA & CLIENTE
  currentY = drawSectionTitle('1. DATI CLIENTE & SEDE IMPIANTO', currentY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);

  doc.text(`Cliente / Richiedente: ${intervention.clientName}`, 16, currentY);
  doc.text(`Recapito: ${intervention.clientContact || 'N/D'}`, 115, currentY);
  currentY += 6;

  doc.text(`Sede Intervento: ${intervention.siteName}`, 16, currentY);
  doc.text(`Data Accesso Desiderata: ${intervention.desiredAccessDate} ${intervention.desiredAccessTime ? 'ore ' + intervention.desiredAccessTime : ''}`, 115, currentY);
  currentY += 6;

  doc.text(`Indirizzo Impianto: ${intervention.siteAddress || 'Sede stabilimento'}`, 16, currentY);
  doc.text(`Priorità Rilevata: ${intervention.priority.toUpperCase()}`, 115, currentY);
  currentY += 10;

  // Section 2: SEGNALAZIONE PROBLEMA
  currentY = drawSectionTitle('2. SEGNALAZIONE INIZIALE DEL CLIENTE', currentY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Oggetto: ${intervention.title}`, 16, currentY);
  currentY += 6;

  doc.setFont('helvetica', 'normal');
  const splitDescription = doc.splitTextToSize(intervention.description || 'Nessuna descrizione specificata', pageWidth - 32);
  doc.text(splitDescription, 16, currentY);
  currentY += splitDescription.length * 5 + 4;

  if (intervention.notes) {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    const splitNotes = doc.splitTextToSize(`Note aggiuntive: ${intervention.notes}`, pageWidth - 32);
    doc.text(splitNotes, 16, currentY);
    currentY += splitNotes.length * 5 + 4;
    doc.setTextColor(30, 41, 59);
  }

  // Section 3: RAPPORTO ESECUZIONE TECNICA
  currentY = drawSectionTitle('3. RAPPORTO ESECUZIONE TECNICA & ORE LAVORATE', currentY + 2);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Tecnico Incaricato: ${report?.technicianName || intervention.assignedTechnician || 'Tecnico On-Site'}`, 16, currentY);
  doc.text(`Data Esecuzione: ${report?.interventionDate || new Date().toISOString().split('T')[0]}`, 115, currentY);
  currentY += 6;

  doc.setFont('helvetica', 'bold');
  doc.text(`Ore Lavorate Totali: ${report?.hoursWorked !== undefined ? report.hoursWorked + ' ore' : 'Da quantificare'}`, 16, currentY);
  doc.text(`Esito Intervento: ${(report?.statusOutcome || 'Risolto').toUpperCase()}`, 115, currentY);
  currentY += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('Descrizione Lavori Eseguiti:', 16, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  const splitWorkDone = doc.splitTextToSize(
    report?.workDone || 'Intervento di ripristino e verifica effettuato a regola d\'arte sul posto.',
    pageWidth - 32
  );
  doc.text(splitWorkDone, 16, currentY);
  currentY += splitWorkDone.length * 5 + 5;

  if (report?.materialsUsed) {
    doc.setFont('helvetica', 'bold');
    doc.text('Ricambi e Materiali Impiegati:', 16, currentY);
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    const splitMaterials = doc.splitTextToSize(report.materialsUsed, pageWidth - 32);
    doc.text(splitMaterials, 16, currentY);
    currentY += splitMaterials.length * 5 + 5;
  }

  if (report?.technicalNotes) {
    doc.setFont('helvetica', 'bold');
    doc.text('Note Tecniche & Raccomandazioni:', 16, currentY);
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    const splitTechNotes = doc.splitTextToSize(report.technicalNotes, pageWidth - 32);
    doc.text(splitTechNotes, 16, currentY);
    currentY += splitTechNotes.length * 5 + 5;
  }

  // Section 4: RISCONTRO CLIENTE (se presente)
  if (intervention.clientFeedback) {
    currentY = drawSectionTitle('4. RISCONTRO / ACCETTAZIONE DEL CLIENTE', currentY + 2);
    doc.setFont('helvetica', 'normal');
    doc.text(`Riscontro rilasciato da: ${intervention.clientFeedback.clientName} in data ${new Date(intervention.clientFeedback.submittedAt).toLocaleDateString('it-IT')}`, 16, currentY);
    currentY += 6;
    doc.setFont('helvetica', 'bold');
    doc.text(`Stato Accettazione: ${intervention.clientFeedback.feedbackStatus.toUpperCase()}`, 16, currentY);
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    const splitFeedback = doc.splitTextToSize(`Commenti: ${intervention.clientFeedback.notes}`, pageWidth - 32);
    doc.text(splitFeedback, 16, currentY);
    currentY += splitFeedback.length * 5 + 6;
  }

  // Sezione Firme a fondo pagina
  const footerY = 245;
  doc.setDrawColor(203, 213, 225);
  doc.line(16, footerY, 90, footerY);
  doc.line(120, footerY, pageWidth - 16, footerY);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Firma del Tecnico Esecutore', 16, footerY + 5);
  doc.text('Firma per Ricevuta e Accettazione Cliente', 120, footerY + 5);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Rapporto generato automaticamente con sistema di gestione interventi tecnici.', 14, 285);

  return doc;
}

export function downloadInterventionPDF(intervention: InterventionRequest) {
  const doc = generateInterventionReportPDF(intervention);
  doc.save(`Rapporto_Intervento_${intervention.code}.pdf`);
}

export function getInterventionPDFDataUri(intervention: InterventionRequest): string {
  const doc = generateInterventionReportPDF(intervention);
  return doc.output('datauristring');
}
