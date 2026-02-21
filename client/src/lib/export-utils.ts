import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ============================================================================
// EXCEL EXPORT
// ============================================================================

export interface ExportColumn {
  key: string;
  header: string;
  width?: number;
}

/**
 * Export data to Excel file
 * @param data - Array of objects to export
 * @param filename - Name of the file (without extension)
 * @param sheetName - Name of the sheet
 * @param columns - Optional column configuration for ordering and headers
 */
export function exportToExcel(
  data: any[],
  filename: string,
  sheetName: string = 'Data',
  columns?: ExportColumn[]
) {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  let exportData: any[];
  
  if (columns) {
    // Map data with custom columns
    exportData = data.map(row => {
      const newRow: Record<string, any> = {};
      columns.forEach(col => {
        newRow[col.header] = row[col.key] ?? '';
      });
      return newRow;
    });
  } else {
    exportData = data;
  }

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Set column widths if specified
  if (columns) {
    ws['!cols'] = columns.map(col => ({ wch: col.width || 15 }));
  }

  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Generate filename with date
  const date = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}_${date}.xlsx`;

  // Save file
  XLSX.writeFile(wb, fullFilename);
}

// ============================================================================
// PDF EXPORT
// ============================================================================

export interface PDFExportOptions {
  title?: string;
  subtitle?: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'letter';
}

/**
 * Export an HTML element to PDF
 * @param elementId - ID of the HTML element to capture
 * @param filename - Name of the file (without extension)
 * @param options - PDF export options
 */
export async function exportToPDF(
  elementId: string,
  filename: string,
  options: PDFExportOptions = {}
) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }

  const {
    title,
    subtitle,
    orientation = 'landscape',
    format = 'letter'
  } = options;

  try {
    // Create canvas from element
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Create PDF
    const pdf = new jsPDF({
      orientation,
      format,
      unit: 'mm'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    
    let yPosition = margin;

    // Add title if provided
    if (title) {
      pdf.setFontSize(18);
      pdf.setTextColor(51, 51, 51);
      pdf.text(title, margin, yPosition + 6);
      yPosition += 12;
    }

    // Add subtitle if provided
    if (subtitle) {
      pdf.setFontSize(12);
      pdf.setTextColor(102, 102, 102);
      pdf.text(subtitle, margin, yPosition + 4);
      yPosition += 10;
    }

    // Calculate image dimensions
    const imgWidth = pageWidth - 2 * margin;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Check if image fits on page, otherwise scale down
    const availableHeight = pageHeight - yPosition - margin;
    const finalImgHeight = Math.min(imgHeight, availableHeight);
    const finalImgWidth = (finalImgHeight / imgHeight) * imgWidth;

    // Add image
    pdf.addImage(imgData, 'PNG', margin, yPosition, finalImgWidth, finalImgHeight);

    // Generate filename with date
    const date = new Date().toISOString().split('T')[0];
    const fullFilename = `${filename}_${date}.pdf`;

    // Save file
    pdf.save(fullFilename);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw error;
  }
}

/**
 * Export table data to PDF (for better quality than html2canvas)
 */
export function exportTableToPDF(
  data: any[],
  columns: ExportColumn[],
  filename: string,
  options: PDFExportOptions = {}
) {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const {
    title,
    subtitle,
    orientation = 'landscape',
    format = 'letter'
  } = options;

  const pdf = new jsPDF({
    orientation,
    format,
    unit: 'mm'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 10;
  
  let yPosition = margin;

  // Add title if provided
  if (title) {
    pdf.setFontSize(16);
    pdf.setTextColor(51, 51, 51);
    pdf.text(title, margin, yPosition + 5);
    yPosition += 10;
  }

  // Add subtitle if provided
  if (subtitle) {
    pdf.setFontSize(10);
    pdf.setTextColor(102, 102, 102);
    pdf.text(subtitle, margin, yPosition + 3);
    yPosition += 8;
  }

  // Add timestamp
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition + 2);
  yPosition += 8;

  // Calculate column widths
  const tableWidth = pageWidth - 2 * margin;
  const colWidth = tableWidth / columns.length;

  // Draw header
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, yPosition, tableWidth, 8, 'F');
  pdf.setFontSize(8);
  pdf.setTextColor(51, 51, 51);
  
  columns.forEach((col, i) => {
    const x = margin + i * colWidth + 2;
    pdf.text(col.header, x, yPosition + 5, { maxWidth: colWidth - 4 });
  });
  yPosition += 8;

  // Draw rows
  pdf.setFontSize(7);
  data.forEach((row, rowIndex) => {
    // Check if we need a new page
    if (yPosition > pdf.internal.pageSize.getHeight() - 20) {
      pdf.addPage();
      yPosition = margin;
    }

    // Alternate row colors
    if (rowIndex % 2 === 0) {
      pdf.setFillColor(250, 250, 250);
      pdf.rect(margin, yPosition, tableWidth, 7, 'F');
    }

    columns.forEach((col, i) => {
      const x = margin + i * colWidth + 2;
      const value = String(row[col.key] ?? '');
      pdf.text(value.substring(0, 20), x, yPosition + 4.5, { maxWidth: colWidth - 4 });
    });
    yPosition += 7;
  });

  // Generate filename with date
  const date = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}_${date}.pdf`;

  pdf.save(fullFilename);
}

// ============================================================================
// PRINT
// ============================================================================

/**
 * Print an HTML element
 * @param elementId - ID of the HTML element to print
 * @param title - Title for the print document
 */
export function printElement(elementId: string, title?: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }

  // Create print window
  const printWindow = window.open('', '_blank', 'width=1200,height=800');
  if (!printWindow) {
    console.error('Could not open print window');
    return;
  }

  // Get all stylesheets
  const styles = Array.from(document.styleSheets)
    .map(styleSheet => {
      try {
        return Array.from(styleSheet.cssRules)
          .map(rule => rule.cssText)
          .join('\n');
      } catch (e) {
        // Handle cross-origin stylesheets
        if (styleSheet.href) {
          return `@import url("${styleSheet.href}");`;
        }
        return '';
      }
    })
    .join('\n');

  // Build print document
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title || 'Print Document'}</title>
      <style>
        ${styles}
        @media print {
          body { 
            margin: 0;
            padding: 20px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: landscape;
            margin: 10mm;
          }
        }
        body {
          font-family: system-ui, -apple-system, sans-serif;
          padding: 20px;
        }
        .no-print { display: none !important; }
      </style>
    </head>
    <body>
      ${title ? `<h1 style="margin-bottom: 20px; font-size: 24px;">${title}</h1>` : ''}
      ${element.innerHTML}
    </body>
    </html>
  `);

  printWindow.document.close();

  // Wait for content to load then print
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // Fallback if onload doesn't fire
  setTimeout(() => {
    if (!printWindow.closed) {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  }, 500);
}
