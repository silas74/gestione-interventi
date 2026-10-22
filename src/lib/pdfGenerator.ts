import { jsPDF } from 'jspdf';
import { InterventionRequest } from '../types';
import { getWhatsAppPhoneDigits } from './contactUtils';

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
  doc.setFontSize(17);
  doc.text('ON-SITE TECHNICAL INTERVENTION REPORT', 14, 18);

  // Subtitle / Code
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Ticket ID: ${intervention.code}  |  Project: ${intervention.projectName || 'General'}  |  Date: ${new Date().toLocaleDateString('en-US')}`, 14, 28);

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
  doc.text(`Desired Access: ${intervention.desiredAccessDate} ${intervention.desiredAccessTime ? 'at ' + intervention.desiredAccessTime : ''}`, 115, currentY);
  currentY += 5.5;

  doc.text(`Site Address: ${intervention.siteAddress || 'Main facility address'}`, 16, currentY);
  doc.text(`Priority Level: ${intervention.priority.toUpperCase()}`, 115, currentY);
  currentY += 9;

  // Section 2: SERVICE REQUEST & DEFECT DETAILS
  currentY = drawSectionTitle('2. SERVICE REQUEST & DEFECT DETAILS', currentY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`Subject: ${intervention.title}`, 16, currentY);
  currentY += 5.5;

  doc.setFont('helvetica', 'normal');
  const splitDescription = doc.splitTextToSize(intervention.description || 'No description provided.', pageWidth - 32);
  doc.text(splitDescription, 16, currentY);
  currentY += splitDescription.length * 4.8 + 3.5;

  if (intervention.notes) {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    const splitNotes = doc.splitTextToSize(`Special Notes: ${intervention.notes}`, pageWidth - 32);
    doc.text(splitNotes, 16, currentY);
    currentY += splitNotes.length * 4.8 + 3.5;
    doc.setTextColor(30, 41, 59);
  }

  if (intervention.actionSteps && intervention.actionSteps.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('Project Actions Checklist:', 16, currentY);
    currentY += 4.8;
    doc.setFont('helvetica', 'normal');
    for (const step of intervention.actionSteps) {
      const prefix = step.completed ? '[COMPLETED] ' : '[TO DO] ';
      const splitStep = doc.splitTextToSize(`${prefix}${step.text}`, pageWidth - 36);
      doc.text(splitStep, 18, currentY);
      currentY += splitStep.length * 4.5 + 1;
    }
    currentY += 2.5;
  }

  if (intervention.trackingLogs && intervention.trackingLogs.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('Project Tracking Log (Actions Done, Email/WhatsApp & Pending Replies):', 16, currentY);
    currentY += 4.8;
    doc.setFont('helvetica', 'normal');
    for (const log of intervention.trackingLogs) {
      const chLabel = log.channel.toUpperCase();
      const replyInfo = log.waitingReplyFrom
        ? log.replyReceived
          ? ` | Reply received from: ${log.waitingReplyFrom}`
          : ` | Waiting reply from: ${log.waitingReplyFrom}${log.followUpDueDate ? ` (due ${log.followUpDueDate})` : ''}`
        : '';
      const nextInfo = log.nextStep ? ` | Next: ${log.nextStep}` : '';
      const line = `[${log.date} - ${chLabel}] Done: ${log.whatIDid}${replyInfo}${nextInfo}`;
      const splitLog = doc.splitTextToSize(line, pageWidth - 36);
      doc.text(splitLog, 18, currentY);
      currentY += splitLog.length * 4.5 + 1.5;
    }
    currentY += 2.5;
  }

  // Section 3: TECHNICAL EXECUTION & HOURS WORKED
  currentY = drawSectionTitle('3. TECHNICAL EXECUTION & HOURS WORKED', currentY + 1.5);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Technician: ${report?.technicianName || intervention.assignedTechnician || 'On-Site Specialist'}`, 16, currentY);
  doc.text(`Execution Date: ${report?.interventionDate || new Date().toISOString().split('T')[0]}`, 115, currentY);
  currentY += 5.5;

  doc.setFont('helvetica', 'bold');
  doc.text(`Total Worked Hours: ${report?.hoursWorked !== undefined ? report.hoursWorked + ' hrs' : 'Pending'}`, 16, currentY);
  doc.text(`Outcome: ${(report?.statusOutcome || 'Resolved').toUpperCase()}`, 115, currentY);
  currentY += 7.5;

  doc.setFont('helvetica', 'bold');
  doc.text('Work Performed Summary:', 16, currentY);
  currentY += 4.5;

  doc.setFont('helvetica', 'normal');
  const splitWorkDone = doc.splitTextToSize(
    report?.workDone || 'On-site technical inspection, testing, and commissioning performed.',
    pageWidth - 32
  );
  doc.text(splitWorkDone, 16, currentY);
  currentY += splitWorkDone.length * 4.8 + 4;

  if (report?.materialsUsed) {
    doc.setFont('helvetica', 'bold');
    doc.text('Replaced Parts & Materials Used:', 16, currentY);
    currentY += 4.5;
    doc.setFont('helvetica', 'normal');
    const splitMaterials = doc.splitTextToSize(report.materialsUsed, pageWidth - 32);
    doc.text(splitMaterials, 16, currentY);
    currentY += splitMaterials.length * 4.8 + 4;
  }

  if (report?.technicalNotes) {
    doc.setFont('helvetica', 'bold');
    doc.text('Technical Recommendations / Next Steps:', 16, currentY);
    currentY += 4.5;
    doc.setFont('helvetica', 'normal');
    const splitTechNotes = doc.splitTextToSize(report.technicalNotes, pageWidth - 32);
    doc.text(splitTechNotes, 16, currentY);
    currentY += splitTechNotes.length * 4.8 + 4;
  }

  // Section 4: CLIENT ACCEPTANCE / FEEDBACK (if present)
  if (intervention.clientFeedback) {
    currentY = drawSectionTitle('4. CLIENT ACCEPTANCE & FEEDBACK', currentY + 1.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Reviewed by: ${intervention.clientFeedback.clientName} on ${new Date(intervention.clientFeedback.submittedAt).toLocaleDateString('en-US')}`, 16, currentY);
    currentY += 5.5;
    doc.setFont('helvetica', 'bold');
    doc.text(`Status: ${intervention.clientFeedback.feedbackStatus.toUpperCase()}`, 16, currentY);
    currentY += 5.5;
    doc.setFont('helvetica', 'normal');
    const splitFeedback = doc.splitTextToSize(`Comments: ${intervention.clientFeedback.notes}`, pageWidth - 32);
    doc.text(splitFeedback, 16, currentY);
    currentY += splitFeedback.length * 4.8 + 5;
  }

  // ================= SIGNATURES SECTION AT BOTTOM =================
  const signatureLineY = 250;
  
  // 1. Technician Signature (render digital drawn signature if available)
  if (report?.technicianSignature) {
    try {
      doc.addImage(report.technicianSignature, 'PNG', 16, signatureLineY - 20, 60, 18);
    } catch (err) {
      console.warn('Could not render technician signature', err);
    }
  }

  // 2. Client Signature (render digital drawn signature if available)
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
  doc.text('This document serves as an official technical execution and acceptance report. Generated automatically.', 14, 285);

  // ================= PHOTOGRAPHIC DOCUMENTATION APPENDIX PAGE =================
  const reportPhotos = report?.reportPhotos || [];
  const defectPhotos = intervention.defectPhotos || [];
  const allPhotos = [...reportPhotos, ...defectPhotos];

  if (allPhotos.length > 0) {
    doc.addPage();
    
    // Header banner for photos page
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('ATTACHED PHOTOGRAPHIC DOCUMENTATION & EVIDENCE', 14, 18);

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 28, pageWidth, 2, 'F');

    let currentPhotoY = 38;
    const photoWidth = 85;
    const photoHeight = 58;

    allPhotos.slice(0, 6).forEach((photo, idx) => {
      const col = idx % 2;
      const x = col === 0 ? 14 : 110;
      if (idx > 0 && col === 0) {
        currentPhotoY += 72;
      }

      try {
        doc.addImage(photo.url, 'JPEG', x, currentPhotoY, photoWidth, photoHeight);
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        const label = idx < reportPhotos.length ? `Work Report Photo #${idx + 1}` : `Defect Photo #${idx - reportPhotos.length + 1}`;
        doc.text(`${label}: ${photo.name || 'Photo attachment'}`, x, currentPhotoY + photoHeight + 4);
      } catch (err) {
        console.warn('Could not add photo to PDF', err);
      }
    });

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Ticket ID: ${intervention.code} | Photographic Evidence Appendix | Page 2`, 14, 285);
  }

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

/**
 * Shares the generated PDF document directly via WhatsApp / Web Share
 * On mobile/tablet, it uses Web Share API with file attachment.
 * On desktop/fallback, it downloads the PDF and opens WhatsApp with pre-filled ticket confirmation.
 */
export async function shareInterventionPDFViaWhatsApp(intervention: InterventionRequest): Promise<{ success: boolean; method: 'web-share' | 'download-whatsapp' }> {
  const fileName = `Intervention_Report_${intervention.code}.pdf`;
  const pdfBlob = getInterventionPDFBlob(intervention);

  // 1. Try modern Web Share API with file support (iOS Safari, Android Chrome)
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

  // 2. Desktop fallback: Download the PDF and open WhatsApp chat
  downloadInterventionPDF(intervention);

  const digits = getWhatsAppPhoneDigits(intervention.clientContact || '');
  const message = `Hello ${intervention.clientName || ''},\nAttached is the completed Technical Service Report PDF for ticket *${intervention.code}* - "${intervention.title}" at ${intervention.siteName}.\nHours worked: ${intervention.report?.hoursWorked || 'N/A'}.\n\nPlease find the downloaded PDF on your device. Let us know if you need any further assistance!`;

  const waUrl = digits 
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  window.open(waUrl, '_blank', 'noopener,noreferrer');
  return { success: true, method: 'download-whatsapp' };
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

    // Task Header Box
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

    // Meta line: Project, Date, Waiting From, Supply Status
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

    // What I did
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(30, 41, 59);
    doc.text(splitWhat, 16, currentY);
    currentY += splitWhat.length * 4.3 + 1;

    // Next step
    if (splitNext.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text(splitNext, 16, currentY);
      currentY += splitNext.length * 4.3 + 1;
    }

    // Checklist items
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

/**
 * Shares a formatted text summary of all tasks in the selected project via WhatsApp
 */
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
