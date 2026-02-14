import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

// Type for jsPDF with autoTable
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

// School branding interface
export interface SchoolBranding {
  schoolName: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  schoolLogo?: string;
}

// Student info interface
export interface StudentInfo {
  name: string;
  admissionNumber: string;
  className: string;
  dateOfBirth?: string;
}

// Teacher info interface
export interface TeacherInfo {
  name: string;
  email?: string;
  subject?: string;
}

/**
 * Add professional header with school branding to PDF
 */
function addProfessionalHeader(
  doc: jsPDFWithAutoTable,
  branding: SchoolBranding,
  title: string,
  subtitle?: string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Add school name - large and prominent
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 41, 55); // Dark gray
  const schoolNameWidth = doc.getTextWidth(branding.schoolName);
  doc.text(branding.schoolName, (pageWidth - schoolNameWidth) / 2, yPosition);
  yPosition += 8;

  // Add school contact info if available
  if (branding.schoolAddress || branding.schoolPhone || branding.schoolEmail) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128); // Medium gray
    
    const contactInfo: string[] = [];
    if (branding.schoolAddress) contactInfo.push(branding.schoolAddress);
    if (branding.schoolPhone) contactInfo.push(`Tel: ${branding.schoolPhone}`);
    if (branding.schoolEmail) contactInfo.push(branding.schoolEmail);
    
    const contactText = contactInfo.join(" | ");
    const contactWidth = doc.getTextWidth(contactText);
    doc.text(contactText, (pageWidth - contactWidth) / 2, yPosition);
    yPosition += 6;
  }

  // Add decorative line
  doc.setDrawColor(79, 70, 229); // Brand color
  doc.setLineWidth(0.8);
  doc.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 8;

  // Add document title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229); // Brand color
  const titleWidth = doc.getTextWidth(title);
  doc.text(title, (pageWidth - titleWidth) / 2, yPosition);
  yPosition += 6;

  // Add subtitle if provided
  if (subtitle) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    const subtitleWidth = doc.getTextWidth(subtitle);
    doc.text(subtitle, (pageWidth - subtitleWidth) / 2, yPosition);
    yPosition += 6;
  }

  yPosition += 5;
  return yPosition;
}

/**
 * Add student information card to PDF
 */
function addStudentInfoCard(
  doc: jsPDFWithAutoTable,
  student: StudentInfo,
  yPosition: number
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const cardX = 20;
  const cardWidth = pageWidth - 40;
  const cardHeight = 28;

  // Draw card background
  doc.setFillColor(249, 250, 251); // Light gray background
  doc.roundedRect(cardX, yPosition, cardWidth, cardHeight, 3, 3, "F");

  // Draw card border
  doc.setDrawColor(79, 70, 229); // Brand color border
  doc.setLineWidth(0.5);
  doc.roundedRect(cardX, yPosition, cardWidth, cardHeight, 3, 3, "S");

  // Add student details
  let textY = yPosition + 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 41, 55);
  
  // Student name
  doc.text("Student:", cardX + 8, textY);
  doc.setFont("helvetica", "normal");
  doc.text(student.name, cardX + 35, textY);

  // Admission number
  textY += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Admission No:", cardX + 8, textY);
  doc.setFont("helvetica", "normal");
  doc.text(student.admissionNumber, cardX + 35, textY);

  // Class
  textY += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Class:", cardX + 8, textY);
  doc.setFont("helvetica", "normal");
  doc.text(student.className, cardX + 35, textY);

  // Date of birth (if available)
  if (student.dateOfBirth) {
    doc.setFont("helvetica", "bold");
    doc.text("Date of Birth:", cardX + 100, yPosition + 8);
    doc.setFont("helvetica", "normal");
    doc.text(student.dateOfBirth, cardX + 135, yPosition + 8);
  }

  return yPosition + cardHeight + 8;
}

/**
 * Add teacher information to PDF
 */
function addTeacherInfo(
  doc: jsPDFWithAutoTable,
  teacher: TeacherInfo,
  yPosition: number
): number {
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(107, 114, 128);
  doc.text("Prepared by:", 20, yPosition);
  
  doc.setFont("helvetica", "normal");
  let teacherText = teacher.name;
  if (teacher.subject) teacherText += ` (${teacher.subject})`;
  if (teacher.email) teacherText += ` • ${teacher.email}`;
  doc.text(teacherText, 50, yPosition);

  return yPosition + 6;
}

/**
 * Add professional footer to all pages
 */
function addProfessionalFooter(
  doc: jsPDFWithAutoTable,
  branding: SchoolBranding,
  additionalInfo?: string
): void {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);

    // Footer text
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(156, 163, 175);
    
    // Left side - school name
    doc.text(branding.schoolName, 20, pageHeight - 12);
    
    // Center - additional info
    if (additionalInfo) {
      const infoWidth = doc.getTextWidth(additionalInfo);
      doc.text(additionalInfo, (pageWidth - infoWidth) / 2, pageHeight - 12);
    }
    
    // Right side - page number and date
    const pageInfo = `Page ${i} of ${pageCount}`;
    const date = new Date().toLocaleDateString("en-US", { 
      year: "numeric", 
      month: "short", 
      day: "numeric" 
    });
    const rightText = `${pageInfo} • ${date}`;
    const rightWidth = doc.getTextWidth(rightText);
    doc.text(rightText, pageWidth - 20 - rightWidth, pageHeight - 12);
  }
}

/**
 * Export data as CSV file
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  headers: { key: keyof T; label: string }[],
  filename: string
): void {
  if (data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Create CSV header row
  const headerRow = headers.map((h) => `"${h.label}"`).join(",");

  // Create CSV data rows
  const dataRows = data.map((row) =>
    headers
      .map((h) => {
        const value = row[h.key];
        // Handle different types
        if (value === null || value === undefined) return '""';
        if (typeof value === "string") return `"${value.replace(/"/g, '""')}"`;
        if (typeof value === "number") return value.toString();
        if (value instanceof Date) return `"${value.toISOString()}"`;
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  // Combine header and data
  const csv = [headerRow, ...dataRows].join("\n");

  // Create and trigger download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data as PDF table with professional branding
 */
export function exportToPDF<T extends Record<string, unknown>>(
  data: T[],
  headers: { key: keyof T; label: string }[],
  filename: string,
  title?: string
): void {
  if (data.length === 0) {
    console.warn("No data to export");
    return;
  }

  const doc = new jsPDF() as jsPDFWithAutoTable;

  // Add title if provided
  if (title) {
    doc.setFontSize(18);
    doc.setTextColor(33, 33, 33);
    doc.text(title, 14, 22);
  }

  // Add timestamp
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, title ? 30 : 22);

  // Prepare table data
  const tableHeaders = headers.map((h) => h.label);
  const tableData = data.map((row) =>
    headers.map((h) => {
      const value = row[h.key];
      if (value === null || value === undefined) return "";
      if (value instanceof Date) return value.toLocaleDateString();
      return String(value);
    })
  );

  // Generate table
  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: title ? 35 : 27,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [79, 70, 229], // Brand color
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 250],
    },
    margin: { top: 10, right: 14, bottom: 10, left: 14 },
  });

  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount} | Connect-Ed School Management`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  // Save the PDF
  doc.save(`${filename}.pdf`);
}

/**
 * Export student report card with professional branding and full details
 */
export function exportStudentReportPDF(
  reportData: {
    subjects: Array<{
      subjectName: string;
      subjectCode?: string;
      examsTaken: number;
      averageMark: number;
      averageGrade: string;
      passRate: number;
      examsPassed: number;
    }>;
    overall: {
      averageMark: number;
      averageGrade?: string | null;
      totalSubjects: number;
      totalExams: number;
      passRate: number;
      totalPassed: number;
      totalFailed: number;
    };
    insights?: {
      strongestSubject: { name: string; averageMark: number } | null;
      weakestSubject: { name: string; averageMark: number } | null;
    };
  },
  studentInfo: StudentInfo,
  schoolBranding: SchoolBranding,
  teacherInfo?: TeacherInfo,
  filename?: string
): void {
  const doc = new jsPDF() as jsPDFWithAutoTable;

  // Add professional header
  let yPos = addProfessionalHeader(
    doc,
    schoolBranding,
    "Academic Performance Report",
    "Comprehensive Student Assessment"
  );

  // Add student information card
  yPos = addStudentInfoCard(doc, studentInfo, yPos);

  // Add overall performance summary box
  const pageWidth = doc.internal.pageSize.getWidth();
  const summaryX = 20;
  const summaryWidth = pageWidth - 40;
  const summaryHeight = 35;

  // Draw summary background with gradient effect
  doc.setFillColor(239, 246, 255); // Light blue
  doc.roundedRect(summaryX, yPos, summaryWidth, summaryHeight, 3, 3, "F");
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(0.5);
  doc.roundedRect(summaryX, yPos, summaryWidth, summaryHeight, 3, 3, "S");

  // Summary title
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229);
  doc.text("Overall Performance Summary", summaryX + 8, yPos + 8);

  // Summary metrics in a grid
  const metricsY = yPos + 16;
  const colWidth = summaryWidth / 4;

  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.setFont("helvetica", "normal");

  // Column 1: Overall Average
  doc.text("Overall Average", summaryX + 8, metricsY);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(
    reportData.overall.averageMark >= 75 ? 34 : reportData.overall.averageMark >= 50 ? 234 : 239,
    reportData.overall.averageMark >= 75 ? 197 : reportData.overall.averageMark >= 50 ? 179 : 68,
    reportData.overall.averageMark >= 75 ? 94 : reportData.overall.averageMark >= 50 ? 8 : 68
  );
  doc.text(`${reportData.overall.averageMark}%`, summaryX + 8, metricsY + 8);
  if (reportData.overall.averageGrade) {
    doc.setFontSize(10);
    doc.text(`Grade ${reportData.overall.averageGrade}`, summaryX + 8, metricsY + 14);
  }

  // Column 2: Total Subjects
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text("Subjects", summaryX + 8 + colWidth, metricsY);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 41, 55);
  doc.text(String(reportData.overall.totalSubjects), summaryX + 8 + colWidth, metricsY + 8);

  // Column 3: Pass Rate
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text("Pass Rate", summaryX + 8 + colWidth * 2, metricsY);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(
    reportData.overall.passRate >= 70 ? 34 : reportData.overall.passRate >= 50 ? 234 : 239,
    reportData.overall.passRate >= 70 ? 197 : reportData.overall.passRate >= 50 ? 179 : 68,
    reportData.overall.passRate >= 70 ? 94 : reportData.overall.passRate >= 50 ? 8 : 68
  );
  doc.text(`${reportData.overall.passRate}%`, summaryX + 8 + colWidth * 2, metricsY + 8);

  // Column 4: Exams Written
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text("Exams Written", summaryX + 8 + colWidth * 3, metricsY);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 41, 55);
  doc.text(String(reportData.overall.totalExams), summaryX + 8 + colWidth * 3, metricsY + 8);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(34, 197, 94);
  doc.text(`Passed: ${reportData.overall.totalPassed}`, summaryX + 8 + colWidth * 3, metricsY + 14);
  doc.setTextColor(239, 68, 68);
  doc.text(`Failed: ${reportData.overall.totalFailed}`, summaryX + 8 + colWidth * 3, metricsY + 20);

  yPos += summaryHeight + 10;

  // Add insights if available
  if (reportData.insights && (reportData.insights.strongestSubject || reportData.insights.weakestSubject)) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text("Performance Insights", 20, yPos);
    yPos += 6;

    const insightWidth = (pageWidth - 44) / 2;
    const insightX1 = 20;
    const insightX2 = 22 + insightWidth;

    // Strongest subject
    if (reportData.insights.strongestSubject) {
      doc.setFillColor(236, 253, 245); // Light green
      doc.roundedRect(insightX1, yPos, insightWidth, 18, 2, 2, "F");
      doc.setDrawColor(34, 197, 94);
      doc.setLineWidth(0.3);
      doc.roundedRect(insightX1, yPos, insightWidth, 18, 2, 2, "S");

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(22, 163, 74);
      doc.text("⬆ Strongest Subject", insightX1 + 4, yPos + 6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(31, 41, 55);
      doc.text(reportData.insights.strongestSubject.name, insightX1 + 4, yPos + 11);
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(`${reportData.insights.strongestSubject.averageMark}% average`, insightX1 + 4, yPos + 15);
    }

    // Weakest subject
    if (reportData.insights.weakestSubject) {
      doc.setFillColor(254, 243, 199); // Light orange
      doc.roundedRect(insightX2, yPos, insightWidth, 18, 2, 2, "F");
      doc.setDrawColor(251, 146, 60);
      doc.setLineWidth(0.3);
      doc.roundedRect(insightX2, yPos, insightWidth, 18, 2, 2, "S");

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(234, 88, 12);
      doc.text("⬇ Needs Improvement", insightX2 + 4, yPos + 6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(31, 41, 55);
      doc.text(reportData.insights.weakestSubject.name, insightX2 + 4, yPos + 11);
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(`${reportData.insights.weakestSubject.averageMark}% average`, insightX2 + 4, yPos + 15);
    }

    yPos += 24;
  }

  // Add subject breakdown table
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229);
  doc.text("Subject Breakdown", 20, yPos);
  yPos += 2;

  // Prepare table data
  const tableData = reportData.subjects.map((subject) => [
    subject.subjectCode ? `${subject.subjectName} (${subject.subjectCode})` : subject.subjectName,
    String(subject.examsTaken),
    `${subject.averageMark}%`,
    subject.averageGrade,
    `${subject.passRate}%`,
    `${subject.examsPassed}/${subject.examsTaken}`,
  ]);

  autoTable(doc, {
    head: [["Subject", "Exams", "Average", "Grade", "Pass Rate", "Passed"]],
    body: tableData,
    startY: yPos,
    theme: "grid",
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { halign: "left", cellWidth: 60 },
      1: { halign: "center", cellWidth: 20 },
      2: { halign: "center", cellWidth: 25 },
      3: { halign: "center", cellWidth: 20 },
      4: { halign: "center", cellWidth: 25 },
      5: { halign: "center", cellWidth: 25 },
    },
    didParseCell: (data) => {
      // Color code the average marks
      if (data.column.index === 2 && data.section === "body") {
        const mark = parseInt(data.cell.text[0]);
        if (mark >= 75) {
          data.cell.styles.textColor = [22, 163, 74]; // Green
          data.cell.styles.fontStyle = "bold";
        } else if (mark >= 50) {
          data.cell.styles.textColor = [234, 88, 12]; // Orange
          data.cell.styles.fontStyle = "bold";
        } else {
          data.cell.styles.textColor = [239, 68, 68]; // Red
          data.cell.styles.fontStyle = "bold";
        }
      }
      // Color code the grades
      if (data.column.index === 3 && data.section === "body") {
        const grade = data.cell.text[0];
        if (grade === "A" || grade === "B") {
          data.cell.styles.fillColor = [220, 252, 231]; // Light green
          data.cell.styles.textColor = [22, 163, 74];
          data.cell.styles.fontStyle = "bold";
        } else if (grade === "C" || grade === "D") {
          data.cell.styles.fillColor = [254, 243, 199]; // Light orange
          data.cell.styles.textColor = [234, 88, 12];
        } else if (grade === "F" || grade === "U") {
          data.cell.styles.fillColor = [254, 226, 226]; // Light red
          data.cell.styles.textColor = [239, 68, 68];
        }
      }
    },
    margin: { left: 20, right: 20 },
  });

  // Add teacher signature section if provided
  if (teacherInfo) {
    const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;
    if (finalY < doc.internal.pageSize.getHeight() - 50) {
      yPos = finalY + 15;
      yPos = addTeacherInfo(doc, teacherInfo, yPos);
    }
  }

  // Add professional footer
  addProfessionalFooter(
    doc,
    schoolBranding,
    "Confidential Academic Report"
  );

  // Save the PDF
  const pdfFilename = filename || `${studentInfo.name.replace(/\s+/g, "-")}-academic-report`;
  doc.save(`${pdfFilename}.pdf`);
}

/**
 * Export a chart element as PDF
 */
export async function exportChartAsPDF(
  chartElement: HTMLElement,
  filename: string,
  title?: string
): Promise<void> {
  try {
    // Capture chart as canvas
    const canvas = await html2canvas(chartElement, {
      backgroundColor: "#ffffff",
      scale: 2, // Higher quality
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const doc = new jsPDF("landscape");

    // Add title if provided
    if (title) {
      doc.setFontSize(18);
      doc.setTextColor(33, 33, 33);
      doc.text(title, 14, 22);
    }

    // Add timestamp
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, title ? 30 : 22);

    // Calculate image dimensions to fit page
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 28; // margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Add chart image
    const startY = title ? 35 : 27;
    const maxHeight = pageHeight - startY - 20;

    doc.addImage(
      imgData,
      "PNG",
      14,
      startY,
      imgWidth,
      Math.min(imgHeight, maxHeight)
    );

    // Add footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      "Connect-Ed School Management",
      14,
      doc.internal.pageSize.height - 10
    );

    // Save the PDF
    doc.save(`${filename}.pdf`);
  } catch (error) {
    console.error("Error exporting chart:", error);
    throw error;
  }
}

/**
 * Format currency value
 */
export function formatCurrency(value: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * Format date value
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format percentage value
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Simple CSV export - alternative simpler API
 */
export function exportDataAsCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: string[],
  filename: string
): void {
  if (data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Create header row
  const headerRow = columns.map((col) => `"${col}"`).join(",");

  // Create data rows
  const dataRows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col];
        if (value === null || value === undefined) return '""';
        if (typeof value === "string") return `"${value.replace(/"/g, '""')}"`;
        if (typeof value === "number") return value.toString();
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  const csv = [headerRow, ...dataRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
