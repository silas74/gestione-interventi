import { jsPDF } from 'jspdf';
import { InterventionRequest, DailySiteReport, DefectPhoto } from '../types';
import { getWhatsAppPhoneDigits } from './contactUtils';

function formatReportDuration(
  hoursDecimal: number,
  arrival?: string,
  departure?: string,
  breakMins = 0
): string {
  if (arrival && departure) {
    const [arrH, arrM] = arrival.split(':').map(Number);
    const [depH, depM] = departure.split(':').map(Number);
    if (!isNaN(arrH) && !isNaN(arrM) && !isNaN(depH) && !isNaN(depM)) {
      let startM = arrH * 60 + arrM;
      let endM = depH * 60 + depM;
      if (endM < startM) endM += 24 * 60;
      const netM = Math.max(0, endM - startM - (Number(breakMins) || 0));
      const h = Math.floor(netM / 60);
      const m = netM % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
  }
  const totalMins = Math.round((Number(hoursDecimal) || 0) * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Helper to render a multi-page photo gallery appendix in any jsPDF document
 */
function appendPhotoGalleryPages(
  doc: jsPDF,
  photos: { photo: DefectPhoto; badgeLabel: string }[],
  headerTitle: string,
  footerCode: string
) {
  if (!photos || photos.length === 0) return;

  const pageWidth = doc.internal.pageSize.getWidth();
  const photosPerPage = 6;
  const totalPhotoPages = Math.ceil(photos.length / photosPerPage);

  for (let pIdx = 0; pIdx < totalPhotoPages; pIdx++) {
    doc.addPage();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.text(
      `${headerTitle}${totalPhotoPages > 1 ? ` (${pIdx + 1}/${totalPhotoPages})` : ''}`,
      14,
      18
    );

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 28, pageWidth, 2, 'F');

    let currentPhotoY = 38;
    const boxWidth = 85;
    const boxHeight = 56;

    const pageSlice = photos.slice(pIdx * photosPerPage, (pIdx + 1) * photosPerPage);

    pageSlice.forEach((entry, idx) => {
      const col = idx % 2;
      const x = col === 0 ? 14 : 110;
      if (idx > 0 && col === 0) {
        currentPhotoY += 74;
      }

      try {
        // Light neutral frame so portrait & landscape photos stay aligned
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.rect(x, currentPhotoY, boxWidth, boxHeight, 'FD');

        // Calculate proportional dimensions preserving original aspect ratio
        const imgProps = doc.getImageProperties(entry.photo.url);
        const origW = imgProps.width || boxWidth;
        const origH = imgProps.height || boxHeight;
        const scale = Math.min(boxWidth / origW, boxHeight / origH);
        const drawW = origW * scale;
        const drawH = origH * scale;
        const drawX = x + (boxWidth - drawW) / 2;
        const drawY = currentPhotoY + (boxHeight - drawH) / 2;

        doc.addImage(entry.photo.url, 'JPEG', drawX, drawY, drawW, drawH);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        const captionText = entry.photo.caption
          ? `${entry.badgeLabel}: ${entry.photo.caption}`
          : `${entry.badgeLabel}: ${entry.photo.name || 'Foto cantiere'}`;
        const splitCap = doc.splitTextToSize(captionText, boxWidth);
        doc.text(splitCap.slice(0, 2), x, currentPhotoY + boxHeight + 4.2);
      } catch (err) {
        console.warn('Could not add photo to PDF', err);
      }
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `${footerCode} | Allegato Fotografico Cantiere | Pagina Foto ${pIdx + 1} di ${totalPhotoPages}`,
      14,
      286
    );
  }
}

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
  doc.setFontSize(16);
  doc.text('ON-SITE TECHNICAL INTERVENTION & DAILY REPORT', 14, 18);

  // Subtitle / Code
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    `Ticket ID: ${intervention.code}  |  Project: ${intervention.projectName || 'General'}  |  Date: ${report?.interventionDate || new Date().toLocaleDateString('en-US')}`,
    14,
    28
  );

  // Accent Line
  doc.setFillColor(37, 99, 235); // blue-600
  doc.rect(0, 38, pageWidth, 2.5, 'F');

  let currentY = 48;

  // Helper for Section Header
  const drawSectionTitle = (title: string, y: number) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y - 5, pageWidth - 28, 7.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(title.toUpperCase(), 16, y);
    return y + 8.5;
  };

  // Section 1: CLIENT & FACILITY INFORMATION
  currentY = drawSectionTitle('1. CLIENT & FACILITY INFORMATION', currentY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);

  doc.text(`Client / Requester: ${intervention.clientName}`, 16, currentY);
  doc.text(`Contact: ${intervention.clientContact || 'N/A'}`, 115, currentY);
  currentY += 5.5;

  doc.text(`Facility / Site: ${intervention.siteName}`, 16, currentY);
  doc.text(
    `Area / Floor: ${report?.areaOrFloor || intervention.siteAddress || 'Main facility'}`,
    115,
    currentY
  );
  currentY += 5.5;

  doc.text(`Site Address: ${intervention.siteAddress || 'Main facility address'}`, 16, currentY);
  doc.text(`Priority Level: ${intervention.priority.toUpperCase()}`, 115, currentY);
  currentY += 8.5;

  // Section 2: SERVICE REQUEST & DEFECT DETAILS
  currentY = drawSectionTitle('2. SERVICE REQUEST & DEFECT DETAILS', currentY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`Subject: ${intervention.title}`, 16, currentY);
  currentY += 5.5;

  doc.setFont('helvetica', 'normal');
  const splitDescription = doc.splitTextToSize(intervention.description || 'No description provided.', pageWidth - 32);
  doc.text(splitDescription, 16, currentY);
  currentY += splitDescription.length * 4.6 + 3;

  if (intervention.actionSteps && intervention.actionSteps.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Project Actions Checklist:', 16, currentY);
    currentY += 4.5;
    doc.setFont('helvetica', 'normal');
    for (const step of intervention.actionSteps) {
      const prefix = step.completed ? '[COMPLETED] ' : '[TO DO] ';
      const splitStep = doc.splitTextToSize(`${prefix}${step.text}`, pageWidth - 36);
      doc.text(splitStep, 18, currentY);
      currentY += splitStep.length * 4.2 + 1;
    }
    currentY += 2;
  }

  // Section 3: TECHNICAL EXECUTION, ARRIVAL/DEPARTURE TIME & HOURS WORKED
  currentY = drawSectionTitle('3. TECHNICAL EXECUTION, SITE ATTENDANCE & HOURS', currentY + 1.5);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Technician: ${report?.technicianName || intervention.assignedTechnician || 'On-Site Specialist'}`, 16, currentY);
  doc.text(`Execution Date: ${report?.interventionDate || new Date().toISOString().split('T')[0]}`, 115, currentY);
  currentY += 5.5;

  // Highlighted Arrival / Departure / Hours Box
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(147, 197, 253);
  doc.rect(16, currentY - 3.5, pageWidth - 32, 9, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138);
  const arrivalTxt = report?.startTime ? `Arrival: ${report.startTime}` : 'Arrival: --:--';
  const departureTxt = report?.endTime ? `Departure: ${report.endTime}` : 'Departure: --:--';
  const breakTxt = report?.breakMinutes ? `Break: ${report.breakMinutes}m` : '';
  const hoursTxt = `Total Worked: ${report?.hoursWorked !== undefined ? report.hoursWorked + ' hrs' : 'Pending'}`;
  const outcomeTxt = `Status: ${(report?.statusOutcome || 'Resolved').toUpperCase()}`;
  doc.text(
    [arrivalTxt, departureTxt, breakTxt, hoursTxt, outcomeTxt].filter(Boolean).join('   |   '),
    19,
    currentY + 2
  );
  doc.setTextColor(30, 41, 59);
  currentY += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('Work Performed Summary (Cose fatte oggi):', 16, currentY);
  currentY += 4.5;

  doc.setFont('helvetica', 'normal');
  const splitWorkDone = doc.splitTextToSize(
    report?.workDone || 'On-site technical inspection, testing, and commissioning performed.',
    pageWidth - 32
  );
  doc.text(splitWorkDone, 16, currentY);
  currentY += splitWorkDone.length * 4.6 + 3.5;

  if (report?.materialsUsed) {
    doc.setFont('helvetica', 'bold');
    doc.text('Replaced Parts & Materials Used:', 16, currentY);
    currentY += 4.5;
    doc.setFont('helvetica', 'normal');
    const splitMaterials = doc.splitTextToSize(report.materialsUsed, pageWidth - 32);
    doc.text(splitMaterials, 16, currentY);
    currentY += splitMaterials.length * 4.6 + 3.5;
  }

  if (report?.technicalNotes) {
    doc.setFont('helvetica', 'bold');
    doc.text('Technical Notes / Issues Found:', 16, currentY);
    currentY += 4.5;
    doc.setFont('helvetica', 'normal');
    const splitTechNotes = doc.splitTextToSize(report.technicalNotes, pageWidth - 32);
    doc.text(splitTechNotes, 16, currentY);
    currentY += splitTechNotes.length * 4.6 + 3.5;
  }

  if (report?.nextDayPlan) {
    doc.setFont('helvetica', 'bold');
    doc.text('Next Day Plan (Programma per domani):', 16, currentY);
    currentY += 4.5;
    doc.setFont('helvetica', 'normal');
    const splitNextDay = doc.splitTextToSize(report.nextDayPlan, pageWidth - 32);
    doc.text(splitNextDay, 16, currentY);
    currentY += splitNextDay.length * 4.6 + 3.5;
  }

  // Multi-day log history if present
  if (intervention.dailyReports && intervention.dailyReports.length > 1) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Storico Giornate Cantiere (${intervention.dailyReports.length} giorni registrati):`, 16, currentY);
    currentY += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    for (const dRep of intervention.dailyReports.slice(0, 6)) {
      const timeRange = dRep.startTime || dRep.endTime ? ` (${dRep.startTime || '--'}-${dRep.endTime || '--'})` : '';
      const line = `• [${dRep.interventionDate}${timeRange} - ${dRep.hoursWorked}h] ${dRep.workDone}`;
      const splitLine = doc.splitTextToSize(line, pageWidth - 34);
      doc.text(splitLine, 18, currentY);
      currentY += splitLine.length * 4 + 1;
    }
    currentY += 2;
  }

  // Section 4: CLIENT ACCEPTANCE / FEEDBACK (if present)
  if (intervention.clientFeedback) {
    currentY = drawSectionTitle('4. CLIENT ACCEPTANCE & FEEDBACK', currentY + 1.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Reviewed by: ${intervention.clientFeedback.clientName} on ${new Date(intervention.clientFeedback.submittedAt).toLocaleDateString('en-US')}`, 16, currentY);
    currentY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(`Status: ${intervention.clientFeedback.feedbackStatus.toUpperCase()}`, 16, currentY);
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    const splitFeedback = doc.splitTextToSize(`Comments: ${intervention.clientFeedback.notes}`, pageWidth - 32);
    doc.text(splitFeedback, 16, currentY);
    currentY += splitFeedback.length * 4.5 + 4;
  }

  // ================= SIGNATURES SECTION AT BOTTOM =================
  const signatureLineY = 256;
  
  if (report?.technicianSignature) {
    try {
      doc.addImage(report.technicianSignature, 'PNG', 16, signatureLineY - 20, 60, 18);
    } catch (err) {
      console.warn('Could not render technician signature', err);
    }
  }

  if (intervention.clientFeedback?.clientSignature) {
    try {
      doc.addImage(intervention.clientFeedback.clientSignature, 'PNG', 120, signatureLineY - 20, 60, 18);
    } catch (err) {
      console.warn('Could not render client signature', err);
    }
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(16, signatureLineY, 90, signatureLineY);
  doc.line(120, signatureLineY, pageWidth - 16, signatureLineY);

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Technician Digital Signature (${report?.technicianName || 'Specialist'})`, 16, signatureLineY + 4.5);
  doc.text(`Client Acceptance Signature (${intervention.clientFeedback?.clientName || intervention.clientName})`, 120, signatureLineY + 4.5);

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('This document serves as an official technical execution and attendance report. Generated automatically.', 14, 285);

  // ================= PHOTOGRAPHIC DOCUMENTATION APPENDIX PAGES =================
  const reportPhotos = (report?.reportPhotos || []).map((p, i) => ({
    photo: p,
    badgeLabel: `Foto Lavoro #${i + 1}`,
  }));
  const defectPhotos = (intervention.defectPhotos || []).map((p, i) => ({
    photo: p,
    badgeLabel: `Foto Segnalazione #${i + 1}`,
  }));
  const allPhotos = [...reportPhotos, ...defectPhotos];

  appendPhotoGalleryPages(
    doc,
    allPhotos,
    'ATTACHED PHOTOGRAPHIC DOCUMENTATION & EVIDENCE',
    `Ticket ID: ${intervention.code}`
  );

  return doc;
}

export function downloadInterventionPDF(intervention: InterventionRequest) {
  const doc = generateInterventionReportPDF(intervention);
  doc.save(`Intervention_Report_${intervention.code}.pdf`);
}

export function getInterventionPDFBlob(intervention: InterventionRequest): Blob {
  const doc = generateInterventionReportPDF(intervention);
  return doc.output('blob');
}

export function getInterventionPDFDataUri(intervention: InterventionRequest): string {
  const doc = generateInterventionReportPDF(intervention);
  return doc.output('datauristring');
}

export async function shareInterventionPDFViaWhatsApp(intervention: InterventionRequest): Promise<{ success: boolean; method: 'web-share' | 'download-whatsapp' }> {
  const fileName = `Intervention_Report_${intervention.code}.pdf`;
  const pdfBlob = getInterventionPDFBlob(intervention);

  try {
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `Service Report ${intervention.code}`,
        text: `Official Technical Service Report for ${intervention.code} (${intervention.siteName})`
      });
      return { success: true, method: 'web-share' };
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { success: true, method: 'web-share' };
    }
    console.warn('Web Share API error or unsupported, falling back to download + WhatsApp link', err);
  }

  downloadInterventionPDF(intervention);

  const digits = getWhatsAppPhoneDigits(intervention.clientContact || '');
  const timeInfo =
    intervention.report?.startTime || intervention.report?.endTime
      ? `\nOrario cantiere: ${intervention.report?.startTime || '--:--'} - ${intervention.report?.endTime || '--:--'}`
      : '';
  const message = `Hello ${intervention.clientName || ''},\nAttached is the Technical Service Report PDF for *${intervention.code}* - "${intervention.title}" (${intervention.siteName}).${timeInfo}\nHours worked: ${intervention.report?.hoursWorked || 'N/A'}h.\n\nPlease find the downloaded PDF on your device.`;

  const waUrl = digits 
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  window.open(waUrl, '_blank', 'noopener,noreferrer');
  return { success: true, method: 'download-whatsapp' };
}

// ============================================================================
// DAILY SITE REPORT PDF GENERATOR (FOR ADDIS ABABA / AWASH BANK DAILY LOGS)
// Supports both Italian ('it') and English ('en') for local clients in Addis
// ============================================================================

export function generateDailySiteReportPDF(report: DailySiteReport, lang: 'it' | 'en' = 'it'): jsPDF {
  const isEn = lang === 'en';
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 38, 'F');

  doc.setTextColor(250, 204, 21); // yellow-400
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(
    isEn
      ? `DAILY SITE REPORT — ${report.projectName.toUpperCase()}`
      : `REPORT GIORNALIERO CANTIERE — ${report.projectName.toUpperCase()}`,
    14,
    17
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    isEn
      ? `Report Code: ${report.code}   |   Date: ${report.date}   |   Engineer: ${report.technicianName}   |   Photos: ${(report.photos || []).length}`
      : `Codice: ${report.code}   |   Data: ${report.date}   |   Tecnico: ${report.technicianName}   |   Foto: ${(report.photos || []).length}`,
    14,
    27
  );

  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 38, pageWidth, 2.5, 'F');

  let currentY = 48;

  const drawSectionHeader = (title: string, y: number) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y - 5, pageWidth - 28, 7.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(title.toUpperCase(), 16, y);
    return y + 8.5;
  };

  // Section 1: ORARIO DI ARRIVO, PARTENZA E ORE CANTIERE
  currentY = drawSectionHeader(
    isEn
      ? '1. SITE ATTENDANCE & WORKING HOURS (ARRIVAL & DEPARTURE)'
      : '1. ORARIO DI ARRIVO E PARTENZA CANTIERE (SITE ATTENDANCE)',
    currentY
  );

  // Highlighted Attendance Box
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.5);
  doc.rect(14, currentY - 3, pageWidth - 28, 18, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(6, 95, 70);
  doc.text(`${isEn ? 'DATE' : 'DATA'}: ${report.date}`, 18, currentY + 3.5);
  doc.text(
    `${isEn ? 'ARRIVAL TIME' : 'ARRIVO IN CANTIERE'}: ${report.arrivalTime || '--:--'}`,
    68,
    currentY + 3.5
  );
  doc.text(
    `${isEn ? 'DEPARTURE TIME' : 'USCITA CANTIERE'}: ${report.departureTime || '--:--'}`,
    132,
    currentY + 3.5
  );

  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${isEn ? 'Engineer' : 'Tecnico'}: ${report.technicianName}`, 18, currentY + 11);
  doc.text(`${isEn ? 'Break' : 'Pausa'}: ${report.breakMinutes || 0} min`, 68, currentY + 11);
  doc.setFont('helvetica', 'bold');
  const durStr = formatReportDuration(report.hoursWorked, report.arrivalTime, report.departureTime, report.breakMinutes);
  doc.text(`${isEn ? 'NET WORK DURATION' : 'DURATA NETTA LAVORO'}: ${durStr}`, 132, currentY + 11);

  currentY += 22;

  if (report.areaOrFloor) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text(isEn ? 'Site Zone / System / Floor: ' : 'Zona / Piano / Impianto Cantiere: ', 16, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(report.areaOrFloor, 75, currentY);
    currentY += 7;
  }

  // Section 2: LAVORI ESEGUITI OGGI IN CANTIERE
  currentY = drawSectionHeader(
    isEn
      ? '2. TECHNICAL WORK PERFORMED TODAY ON SITE'
      : '2. RELAZIONE LAVORI ESEGUITI OGGI IN CANTIERE',
    currentY
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  const splitWork = doc.splitTextToSize(report.workDone || '-', pageWidth - 32);
  doc.text(splitWork, 16, currentY);
  currentY += splitWork.length * 4.8 + 6;

  // Section 3: MATERIALI INSTALLATI / USATI
  if (report.materialsUsed && report.materialsUsed.trim()) {
    currentY = drawSectionHeader(
      isEn
        ? '3. MATERIALS & EQUIPMENT INSTALLED / USED TODAY'
        : '3. MATERIALI E APPARECCHIATURE INSTALLATE / UTILIZZATE',
      currentY
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const splitMat = doc.splitTextToSize(report.materialsUsed, pageWidth - 32);
    doc.text(splitMat, 16, currentY);
    currentY += splitMat.length * 4.8 + 6;
  }

  // Section 4: PROBLEMI RISCONTRATI / NOTE TECNICHE
  if (report.issuesFound && report.issuesFound.trim()) {
    currentY = drawSectionHeader(
      isEn
        ? '4. SITE ISSUES, CONSTRAINTS & TECHNICAL NOTES'
        : '4. PROBLEMI RISCONTRATI / NOTE DI CANTIERE',
      currentY
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const splitIssues = doc.splitTextToSize(report.issuesFound, pageWidth - 32);
    doc.text(splitIssues, 16, currentY);
    currentY += splitIssues.length * 4.8 + 6;
  }

  // Section 5: MATERIALI MANCANTI / DA PROCURARE
  if (report.missingMaterials && report.missingMaterials.trim()) {
    currentY = drawSectionHeader(
      isEn
        ? '5. MISSING MATERIALS / ITEMS TO PROCURE ON SITE'
        : '5. MATERIALI MANCANTI / DA COMPRARE PER IL CANTIERE',
      currentY
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const splitMissing = doc.splitTextToSize(report.missingMaterials, pageWidth - 32);
    doc.text(splitMissing, 16, currentY);
    currentY += splitMissing.length * 4.8 + 6;
  }

  // Section 6: PROGRAMMA PER DOMANI
  if (report.nextDayPlan && report.nextDayPlan.trim()) {
    currentY = drawSectionHeader(
      isEn
        ? '6. NEXT DAY WORK PLAN (SCHEDULE FOR TOMORROW)'
        : '6. PROGRAMMA LAVORI PER DOMANI (NEXT DAY PLAN)',
      currentY
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const splitNext = doc.splitTextToSize(report.nextDayPlan, pageWidth - 32);
    doc.text(splitNext, 16, currentY);
    currentY += splitNext.length * 4.8 + 6;
  }

  // Signatures at bottom
  const signatureLineY = 256;
  if (report.technicianSignature) {
    try {
      doc.addImage(report.technicianSignature, 'PNG', 16, signatureLineY - 20, 60, 18);
    } catch (err) {
      console.warn('Could not render technician signature', err);
    }
  }
  if (report.clientSignature) {
    try {
      doc.addImage(report.clientSignature, 'PNG', 120, signatureLineY - 20, 60, 18);
    } catch (err) {
      console.warn('Could not render client signature', err);
    }
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(16, signatureLineY, 90, signatureLineY);
  doc.line(120, signatureLineY, pageWidth - 16, signatureLineY);

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    isEn
      ? `Engineer Signature (${report.technicianName})`
      : `Firma Tecnico (${report.technicianName})`,
    16,
    signatureLineY + 4.5
  );
  doc.text(
    isEn
      ? `Site Representative Signature (${report.clientSignerName || report.projectName})`
      : `Firma Referente Cantiere (${report.clientSignerName || report.projectName})`,
    120,
    signatureLineY + 4.5
  );

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Daily Site Report ${report.code} — ${report.projectName} — ${report.date} (${report.arrivalTime} - ${report.departureTime})`,
    14,
    285
  );

  // Append all photos taken today
  const mappedPhotos = (report.photos || []).map((p, idx) => ({
    photo: p,
    badgeLabel: isEn ? `Photo #${idx + 1} (${report.date})` : `Foto #${idx + 1} (${report.date})`,
  }));

  appendPhotoGalleryPages(
    doc,
    mappedPhotos,
    isEn
      ? `SITE PHOTOGRAPHIC DOCUMENTATION — ${report.projectName.toUpperCase()} (${report.date})`
      : `DOCUMENTAZIONE FOTOGRAFICA DI CANTIERE — ${report.projectName.toUpperCase()} (${report.date})`,
    `Daily Report: ${report.code}`
  );

  return doc;
}

export function downloadDailySiteReportPDF(report: DailySiteReport, lang: 'it' | 'en' = 'it') {
  const doc = generateDailySiteReportPDF(report, lang);
  const safeProj = report.projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const langSuffix = lang === 'en' ? '_EN' : '';
  doc.save(`Daily_Report_${safeProj}_${report.date}_${report.code}${langSuffix}.pdf`);
}

export async function shareDailySiteReportViaWhatsApp(report: DailySiteReport, lang: 'it' | 'en' = 'it') {
  const isEn = lang === 'en';
  const safeProj = report.projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Daily_Report_${safeProj}_${report.date}${isEn ? '_EN' : ''}.pdf`;
  const doc = generateDailySiteReportPDF(report, lang);
  const pdfBlob = doc.output('blob');

  const durWhatsApp = formatReportDuration(report.hoursWorked, report.arrivalTime, report.departureTime, report.breakMinutes);
  const summaryText = isEn
    ? `📋 *DAILY SITE REPORT — ${report.projectName.toUpperCase()}*\n` +
      `📅 Date: *${report.date}* (${report.code})\n` +
      `👷 Engineer: ${report.technicianName}\n` +
      `🕒 Site Hours: *Arrival ${report.arrivalTime || '--:--'} → Departure ${report.departureTime || '--:--'}* (${durWhatsApp})\n` +
      (report.areaOrFloor ? `📍 Zone/System: ${report.areaOrFloor}\n` : '') +
      `\n🛠️ *Work performed today:*\n${report.workDone}\n` +
      (report.materialsUsed ? `\n📦 *Materials used:* ${report.materialsUsed}\n` : '') +
      (report.issuesFound ? `\n⚠️ *Site notes / Issues:* ${report.issuesFound}\n` : '') +
      (report.missingMaterials ? `\n🛒 *Missing materials to procure:* ${report.missingMaterials}\n` : '') +
      (report.nextDayPlan ? `\n➡️ *Next day plan:* ${report.nextDayPlan}\n` : '') +
      `\n📸 Photos attached in PDF: ${(report.photos || []).length}`
    : `📋 *DAILY SITE REPORT — ${report.projectName.toUpperCase()}*\n` +
      `📅 Data: *${report.date}* (${report.code})\n` +
      `👷 Tecnico: ${report.technicianName}\n` +
      `🕒 Orario Cantiere: *Arrivo ${report.arrivalTime || '--:--'} → Uscita ${report.departureTime || '--:--'}* (${durWhatsApp})\n` +
      (report.areaOrFloor ? `📍 Zona/Piano: ${report.areaOrFloor}\n` : '') +
      `\n🛠️ *Lavori eseguiti oggi:*\n${report.workDone}\n` +
      (report.materialsUsed ? `\n📦 *Materiali usati:* ${report.materialsUsed}\n` : '') +
      (report.issuesFound ? `\n⚠️ *Note / Problemi:* ${report.issuesFound}\n` : '') +
      (report.missingMaterials ? `\n🛒 *Materiali mancanti:* ${report.missingMaterials}\n` : '') +
      (report.nextDayPlan ? `\n➡️ *Programma domani:* ${report.nextDayPlan}\n` : '') +
      `\n📸 Foto allegate nel PDF: ${(report.photos || []).length}`;

  try {
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `Daily Site Report ${report.projectName} (${report.date})`,
        text: summaryText,
      });
      return;
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') return;
  }

  downloadDailySiteReportPDF(report, lang);
  const waUrl = `https://wa.me/?text=${encodeURIComponent(summaryText)}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Generates and downloads a cumulative Timesheet + Daily Site Reports PDF for all logged days
 */
export function downloadProjectTimesheetPDF(projectName: string, reports: DailySiteReport[], lang: 'it' | 'en' = 'it') {
  const isEn = lang === 'en';
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const sorted = [...reports].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const totalHours = sorted.reduce((acc, r) => acc + (Number(r.hoursWorked) || 0), 0);
  const totalPhotos = sorted.reduce((acc, r) => acc + (r.photos?.length || 0), 0);

  const drawHeader = (pageNum: number) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 34, 'F');

    doc.setTextColor(250, 204, 21);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14.5);
    doc.text(
      isEn
        ? `SITE ATTENDANCE TIMESHEET & DAILY LOGS: ${projectName.toUpperCase()}`
        : `FOGLIO PRESENZE & DIARIO GIORNALIERO CANTIERE: ${projectName.toUpperCase()}`,
      14,
      15
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text(
      isEn
        ? `Total Days Worked: ${sorted.length}   |   Total Duration: ${formatReportDuration(totalHours)}   |   Photos: ${totalPhotos}   |   Page ${pageNum}`
        : `Giornate Lavorate: ${sorted.length}   |   Durata Totale: ${formatReportDuration(totalHours)}   |   Foto Documentate: ${totalPhotos}   |   Pag. ${pageNum}`,
      14,
      25
    );

    doc.setFillColor(16, 185, 129);
    doc.rect(0, 34, pageWidth, 2, 'F');
  };

  let pageNum = 1;
  drawHeader(pageNum);
  let currentY = 44;

  sorted.forEach((r, idx) => {
    const splitWork = doc.splitTextToSize(
      `${isEn ? 'Work performed' : 'Lavori svolti'}: ${r.workDone}`,
      pageWidth - 34
    );
    const splitIssues = r.issuesFound
      ? doc.splitTextToSize(`${isEn ? 'Notes/Issues' : 'Note/Problemi'}: ${r.issuesFound}`, pageWidth - 34)
      : [];
    const splitNext = r.nextDayPlan
      ? doc.splitTextToSize(`${isEn ? 'Next day' : 'Domani'}: ${r.nextDayPlan}`, pageWidth - 34)
      : [];
    const blockH =
      18 +
      splitWork.length * 4.3 +
      (splitIssues.length ? splitIssues.length * 4.2 + 2 : 0) +
      (splitNext.length ? splitNext.length * 4.2 + 2 : 0);

    if (currentY + blockH > pageHeight - 18) {
      doc.addPage();
      pageNum++;
      drawHeader(pageNum);
      currentY = 44;
    }

    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(148, 163, 184);
    doc.rect(14, currentY - 4, pageWidth - 28, 8.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    doc.setTextColor(15, 23, 42);
    const dayDur = formatReportDuration(r.hoursWorked, r.arrivalTime, r.departureTime, r.breakMinutes);
    doc.text(
      isEn
        ? `Day #${idx + 1} — Date: ${r.date}  |  Arrival: ${r.arrivalTime || '--:--'}  |  Departure: ${r.departureTime || '--:--'}  |  Hours: ${dayDur}  (${r.code})`
        : `Giorno #${idx + 1} — Data: ${r.date}  |  Arrivo: ${r.arrivalTime || '--:--'}  |  Uscita: ${r.departureTime || '--:--'}  |  Ore: ${dayDur}  (${r.code})`,
      16,
      currentY + 1.5
    );
    currentY += 8.5;

    if (r.areaOrFloor || r.materialsUsed) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.3);
      doc.setTextColor(71, 85, 105);
      const parts = [
        r.areaOrFloor ? `Zona/Piano: ${r.areaOrFloor}` : '',
        r.materialsUsed ? `Materiali: ${r.materialsUsed}` : '',
        r.photos?.length ? `Foto: ${r.photos.length}` : '',
      ].filter(Boolean);
      doc.text(parts.join('   |   ').slice(0, 105), 16, currentY);
      currentY += 4.5;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(30, 41, 59);
    doc.text(splitWork, 16, currentY);
    currentY += splitWork.length * 4.3 + 1;

    if (splitIssues.length > 0) {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(180, 83, 9);
      doc.text(splitIssues, 16, currentY);
      currentY += splitIssues.length * 4.2 + 1;
    }

    if (splitNext.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text(splitNext, 16, currentY);
      currentY += splitNext.length * 4.2 + 1;
    }

    currentY += 4;
  });

  const safeProj = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Timesheet_Cantiere_${safeProj}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Generates and downloads a comprehensive Project Action & Submittal Tracking Summary PDF
 * for all tasks in the selected project (or across all projects).
 */
export function downloadProjectSummaryPDF(projectName: string, items: InterventionRequest[]) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const todayStr = new Date().toLocaleDateString('it-IT');

  const totalCount = items.length;
  const completedCount = items.filter(i => i.status === 'completed' || i.status === 'completato').length;
  const openCount = totalCount - completedCount;
  const waitingReplyCount = items.filter(i => {
    if (i.status === 'completed' || i.status === 'completato') return false;
    return Boolean(
      (i.waitingReplyFrom && i.waitingReplyFrom.trim()) ||
      (i.trackingLogs && i.trackingLogs.some(t => t.awaitingReply && !t.replyReceived))
    );
  }).length;

  const drawPageHeader = (pageNum: number) => {
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 34, 'F');

    doc.setTextColor(250, 204, 21); // yellow-400
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(`REPORT STATO PROGETTO & TRACKING: ${projectName.toUpperCase()}`, 14, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text(
      `Data Report: ${todayStr}  |  Totale Attività: ${totalCount}  |  Aperte: ${openCount}  |  In Attesa Risposta: ${waitingReplyCount}  |  Completate: ${completedCount}  |  Pag. ${pageNum}`,
      14,
      25
    );

    doc.setFillColor(79, 70, 229); // indigo-600
    doc.rect(0, 34, pageWidth, 2, 'F');
  };

  let pageNum = 1;
  drawPageHeader(pageNum);
  let currentY = 44;

  const supplyLabels: Record<string, string> = {
    ordered: 'MATERIALE ORDINATO',
    shipping: 'MATERIALE IN ARRIVO',
    ready_pickup: 'MATERIALE DA RITIRARE',
    delivered: 'CONSEGNATO IN CANTIERE'
  };

  items.forEach((item, idx) => {
    const isDone = item.status === 'completed' || item.status === 'completato';
    const waitingFrom =
      item.waitingReplyFrom ||
      item.trackingLogs?.find(t => t.awaitingReply && !t.replyReceived)?.waitingReplyFrom;
    const whatDone = item.whatIDidSummary || item.description || '-';
    const nextStep = item.nextActionToDo || '';
    const supplyText = item.supplyStatus && item.supplyStatus !== 'none' ? supplyLabels[item.supplyStatus] : '';

    const splitWhat = doc.splitTextToSize(`Cosa è stato fatto: ${whatDone}`, pageWidth - 34);
    const splitNext = nextStep ? doc.splitTextToSize(`Prossima azione: ${nextStep}`, pageWidth - 34) : [];
    const stepsCount = item.actionSteps?.length || 0;
    const blockHeight = 24 + splitWhat.length * 4.3 + (splitNext.length ? splitNext.length * 4.3 + 2 : 0) + (stepsCount > 0 ? stepsCount * 4.2 + 4 : 0);

    if (currentY + blockHeight > pageHeight - 18) {
      doc.addPage();
      pageNum++;
      drawPageHeader(pageNum);
      currentY = 44;
    }

    if (isDone) {
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(16, 185, 129);
    } else if (waitingFrom) {
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(245, 158, 11);
    } else {
      doc.setFillColor(238, 242, 255);
      doc.setDrawColor(99, 102, 241);
    }
    doc.setLineWidth(0.4);
    doc.rect(14, currentY - 4, pageWidth - 28, 9, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    const statusTag = isDone ? '[COMPLETATO]' : waitingFrom ? '[ATTESA RISPOSTA]' : '[IN CORSO]';
    const titleLine = `${idx + 1}. ${statusTag} [${item.code}] ${item.title}`;
    doc.text(titleLine.slice(0, 92), 16, currentY + 1.8);

    currentY += 9;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const metaParts: string[] = [
      `Progetto: ${item.projectName || projectName}`,
      `Data: ${item.lastActionDate || item.desiredAccessDate}`
    ];
    if (waitingFrom && !isDone) {
      metaParts.push(`In attesa risposta da: ${waitingFrom}`);
    }
    if (supplyText) {
      metaParts.push(`Fornitura: ${supplyText}`);
    }
    doc.text(metaParts.join('   |   '), 16, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(30, 41, 59);
    doc.text(splitWhat, 16, currentY);
    currentY += splitWhat.length * 4.3 + 1;

    if (splitNext.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text(splitNext, 16, currentY);
      currentY += splitNext.length * 4.3 + 1;
    }

    if (item.actionSteps && item.actionSteps.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(71, 85, 105);
      for (const st of item.actionSteps) {
        const mark = st.completed ? '[X]' : '[ ]';
        doc.text(`   ${mark} ${st.text}`.slice(0, 110), 16, currentY);
        currentY += 4.1;
      }
    }

    currentY += 5;
  });

  const safeProj = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Stato_Progetto_${safeProj}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function shareProjectSummaryViaWhatsApp(projectName: string, items: InterventionRequest[]) {
  const todayStr = new Date().toLocaleDateString('it-IT');
  const lines: string[] = [
    `📊 *RIEPILOGO STATO PROGETTO: ${projectName.toUpperCase()}* (${todayStr})`,
    `Totale attività: ${items.length}`,
    ''
  ];

  items.forEach((item, idx) => {
    const isDone = item.status === 'completed' || item.status === 'completato';
    const waitingFrom =
      item.waitingReplyFrom ||
      item.trackingLogs?.find(t => t.awaitingReply && !t.replyReceived)?.waitingReplyFrom;
    const icon = isDone ? '✅' : waitingFrom ? '⏳' : '🛠️';
    lines.push(`${idx + 1}. ${icon} *${item.title}* (${item.code})`);
    if (item.whatIDidSummary || item.description) {
      lines.push(`   • Fatto: ${item.whatIDidSummary || item.description}`);
    }
    if (waitingFrom && !isDone) {
      lines.push(`   • *In attesa risposta da:* ${waitingFrom} (dal ${item.lastActionDate || item.desiredAccessDate})`);
    }
    if (item.nextActionToDo && !isDone) {
      lines.push(`   • Prossimo step: ${item.nextActionToDo}`);
    }
    lines.push('');
  });

  const text = lines.join('\n');
  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
}

// ============================================================================
// FEATURE E: FINAL COMMISSIONING & HANDOVER CERTIFICATE PDF GENERATOR
// ============================================================================

export function downloadFinalCommissioningCertificatePDF(params: {
  projectName: string;
  date: string;
  technicianName: string;
  clientSignerName: string;
  title: string;
  executiveSummary: string;
  systemsCommissioned: string;
  testsAndVerifications: string;
  openPunchListOrNotes: string;
  handoverConclusion: string;
  technicianSignature?: string;
  clientSignature?: string;
  lang: 'it' | 'en';
}) {
  const isEn = params.lang === 'en';
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const drawHeader = (pageNum: number) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 36, 'F');

    doc.setTextColor(250, 204, 21);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13.5);
    doc.text((params.title || `COMMISSIONING & HANDOVER REPORT — ${params.projectName}`).slice(0, 68), 14, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text(
      isEn
        ? `Project: ${params.projectName}   |   Date: ${params.date}   |   Lead Engineer: ${params.technicianName}   |   Page ${pageNum}`
        : `Progetto: ${params.projectName}   |   Data: ${params.date}   |   Tecnico Collaudatore: ${params.technicianName}   |   Pag. ${pageNum}`,
      14,
      25
    );

    doc.setFillColor(16, 185, 129);
    doc.rect(0, 36, pageWidth, 2.5, 'F');
  };

  let pageNum = 1;
  drawHeader(pageNum);
  let currentY = 46;

  const drawSection = (secTitle: string, bodyText: string) => {
    if (!bodyText || !bodyText.trim()) return;
    const lines = doc.splitTextToSize(bodyText.trim(), pageWidth - 32);
    const neededH = 12 + lines.length * 4.5;

    if (currentY + neededH > pageHeight - 45) {
      doc.addPage();
      pageNum++;
      drawHeader(pageNum);
      currentY = 46;
    }

    doc.setFillColor(241, 245, 249);
    doc.rect(14, currentY - 5, pageWidth - 28, 7.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(secTitle.toUpperCase(), 16, currentY);
    currentY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(lines, 16, currentY);
    currentY += lines.length * 4.5 + 6;
  };

  drawSection(
    isEn ? '1. EXECUTIVE SUMMARY & SCOPE OF COMMISSIONING' : '1. SINTESI ESECUTIVA E OGGETTO DEL COLLAUDO',
    params.executiveSummary
  );
  drawSection(
    isEn ? '2. SYSTEMS & EQUIPMENT COMMISSIONED' : '2. IMPIANTI E APPARECCHIATURE CONFIGURATE E COLLAUDATE',
    params.systemsCommissioned
  );
  drawSection(
    isEn ? '3. FUNCTIONAL TESTS, TRIALS & VERIFICATIONS PERFORMED' : '3. PROVE FUNZIONALI, TEST E VERIFICHE ESEGUITE',
    params.testsAndVerifications
  );
  drawSection(
    isEn ? '4. PUNCH LIST, NOTES & OPERATIONAL RECOMMENDATIONS' : '4. PRESCRIZIONI TECNICHE, PUNTI APERTI E RACCOMANDAZIONI',
    params.openPunchListOrNotes
  );
  drawSection(
    isEn ? '5. OFFICIAL HANDOVER & ACCEPTANCE STATEMENT' : '5. DICHIARAZIONE DI COLLAUDO E CONSEGNA IMPIANTO',
    params.handoverConclusion
  );

  const signatureLineY = 262;
  if (currentY > signatureLineY - 25) {
    doc.addPage();
    pageNum++;
    drawHeader(pageNum);
  }

  if (params.technicianSignature) {
    try {
      doc.addImage(params.technicianSignature, 'PNG', 16, signatureLineY - 20, 60, 18);
    } catch {}
  }
  if (params.clientSignature) {
    try {
      doc.addImage(params.clientSignature, 'PNG', 120, signatureLineY - 20, 60, 18);
    } catch {}
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(16, signatureLineY, 90, signatureLineY);
  doc.line(120, signatureLineY, pageWidth - 16, signatureLineY);

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    isEn ? `Commissioning Engineer (${params.technicianName})` : `Tecnico Collaudatore (${params.technicianName})`,
    16,
    signatureLineY + 4.5
  );
  doc.text(
    isEn
      ? `Client / Site Acceptance (${params.clientSignerName || params.projectName})`
      : `Per Accettazione Cliente / Cantiere (${params.clientSignerName || params.projectName})`,
    120,
    signatureLineY + 4.5
  );

  const safeProj = params.projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Verbale_Collaudo_${safeProj}_${params.date}${isEn ? '_EN' : ''}.pdf`);
}
