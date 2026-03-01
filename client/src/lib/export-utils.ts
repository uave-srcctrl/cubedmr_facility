import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
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

export interface ExcelExportOptions {
  title?: string;
  subtitle?: string;
  logoUrl?: string;
}

/**
 * Export data to Excel file with optional logo header
 * @param data - Array of objects to export
 * @param filename - Name of the file (without extension)
 * @param sheetName - Name of the sheet
 * @param columns - Optional column configuration for ordering and headers
 * @param options - Optional title, subtitle, and logo for header
 */
export async function exportToExcel(
  data: any[],
  filename: string,
  sheetName: string = 'Data',
  columns?: ExportColumn[],
  options?: ExcelExportOptions
) {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Prepare export data with column transformations
  let exportData: Record<string, any>[];
  
  if (columns) {
    exportData = data.map(row => {
      const newRow: Record<string, any> = {};
      columns.forEach(col => {
        let value = row[col.key] ?? '';
        // Format dimensions (Size column) to 2 decimal places
        if (col.key === 'Size (cm)' && typeof value === 'string' && value.includes('x')) {
          const parts = value.split('x').map((v: string) => {
            const num = parseFloat(v.trim());
            return isNaN(num) ? v.trim() : num.toFixed(2);
          });
          value = parts.join(' x ');
        }
        newRow[col.header] = value;
      });
      return newRow;
    });
  } else {
    exportData = data;
  }

  // Create workbook with ExcelJS for logo support
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  
  let currentRow = 1;
  
  // Add logo if provided (columns A-B, rows 1-5)
  if (options?.logoUrl) {
    try {
      // Fetch logo and convert to base64
      const response = await fetch(options.logoUrl);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      
      const imageId = workbook.addImage({
        base64: base64.split(',')[1],
        extension: 'png',
      });
      
      // Place logo in columns A-B, rows 1-5
      worksheet.addImage(imageId, 'A1:B5' as any);
    } catch (e) {
      console.warn('Could not load logo for Excel:', e);
    }
  }
  
  // Add title in column C, row 2
  if (options?.title) {
    worksheet.getCell('C2').value = options.title;
    worksheet.getCell('C2').font = { bold: true, size: 16 };
  }
  
  // Add subtitle in column C, row 3
  if (options?.subtitle) {
    worksheet.getCell('C3').value = options.subtitle;
    worksheet.getCell('C3').font = { size: 12, color: { argb: 'FF666666' } };
  }
  
  // Add timestamp in column C, row 4
  if (options?.title || options?.subtitle) {
    worksheet.getCell('C4').value = `Generated: ${new Date().toLocaleString()}`;
    worksheet.getCell('C4').font = { size: 10, color: { argb: 'FF999999' } };
  }
  
  // Content starts at row 7 (row 6 is empty)
  currentRow = 7;
  
  // Add header row
  const headers = columns ? columns.map(col => col.header) : Object.keys(exportData[0] || {});
  const headerRow = worksheet.getRow(currentRow);
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' }
    };
  });
  currentRow++;
  
  // Add data rows
  exportData.forEach(row => {
    const dataRow = worksheet.getRow(currentRow);
    headers.forEach((header, index) => {
      dataRow.getCell(index + 1).value = row[header] ?? '';
    });
    currentRow++;
  });
  
  // Set column widths
  if (columns) {
    columns.forEach((col, index) => {
      worksheet.getColumn(index + 1).width = col.width || 15;
    });
  }
  
  // Generate filename with date
  const date = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}_${date}.xlsx`;
  
  // Write to buffer and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fullFilename;
  link.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// PDF EXPORT
// ============================================================================

export interface PDFExportOptions {
  title?: string;
  subtitle?: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'letter';
  logoUrl?: string;
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
export async function exportTableToPDF(
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
    format = 'letter',
    logoUrl
  } = options;

  const pdf = new jsPDF({
    orientation,
    format,
    unit: 'mm'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 10;
  
  let yPosition = margin;

  // Add logo in top right corner if provided
  if (logoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load logo'));
        img.src = logoUrl;
      });
      const logoWidth = 55;
      const logoHeight = (img.height / img.width) * logoWidth;
      const logoX = pageWidth - margin - logoWidth;
      pdf.addImage(img, 'PNG', logoX, margin, logoWidth, logoHeight);
    } catch (e) {
      console.warn('Could not load logo for PDF:', e);
    }
  }

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

  // Calculate column widths - support custom widths
  const tableWidth = pageWidth - 2 * margin;
  const totalCustomWidth = columns.reduce((sum, col) => sum + (col.width || 0), 0);
  const colsWithoutWidth = columns.filter(col => !col.width).length;
  const remainingWidth = tableWidth - totalCustomWidth;
  const defaultColWidth = colsWithoutWidth > 0 ? remainingWidth / colsWithoutWidth : tableWidth / columns.length;
  
  // Calculate x positions for each column
  const colWidths = columns.map(col => col.width || defaultColWidth);
  const colPositions: number[] = [];
  let currentX = margin;
  columns.forEach((_, i) => {
    colPositions.push(currentX);
    currentX += colWidths[i];
  });

  // Draw header
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, yPosition, tableWidth, 8, 'F');
  pdf.setFontSize(8);
  pdf.setTextColor(51, 51, 51);
  
  columns.forEach((col, i) => {
    const x = colPositions[i] + 2;
    pdf.text(col.header, x, yPosition + 5, { maxWidth: colWidths[i] - 4 });
  });
  yPosition += 8;

  // Draw rows (10mm row height for better readability)
  const rowHeight = 10;
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
      pdf.rect(margin, yPosition, tableWidth, rowHeight, 'F');
    }

    columns.forEach((col, i) => {
      const x = colPositions[i] + 2;
      let value = String(row[col.key] ?? '');
      
      // Format dimensions (Size column) to 2 decimal places
      if (col.key === 'Size (cm)' && value.includes('x')) {
        const parts = value.split('x').map((v: string) => {
          const num = parseFloat(v.trim());
          return isNaN(num) ? v.trim() : num.toFixed(2);
        });
        value = parts.join(' x ');
      }
      
      pdf.text(value.substring(0, 25), x, yPosition + 6, { maxWidth: colWidths[i] - 4 });
    });
    yPosition += rowHeight;
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
