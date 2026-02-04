import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

// Type for jsPDF with autoTable
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
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
 * Export data as PDF table
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
