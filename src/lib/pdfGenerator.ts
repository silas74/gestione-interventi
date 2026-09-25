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
