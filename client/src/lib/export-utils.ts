import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportColumn {
  key: string;
  title: string;
  width?: number;
  formatter?: (value: any) => string;
}

export interface ExportOptions {
  filename: string;
  title?: string;
  columns: ExportColumn[];
  data: any[];
  format: 'excel' | 'pdf';
  selectedColumns?: string[];
  pageOrientation?: 'portrait' | 'landscape';
}

// Export to Excel
export const exportToExcel = (options: ExportOptions) => {
  const { filename, title, columns, data, selectedColumns } = options;
  
  // Filter columns based on selection
  const columnsToExport = selectedColumns 
    ? columns.filter(col => selectedColumns.includes(col.key))
    : columns;

  // Prepare data for export
  const exportData = data.map(row => {
    const exportRow: any = {};
    columnsToExport.forEach(col => {
      const value = getNestedValue(row, col.key);
      exportRow[col.title] = col.formatter ? col.formatter(value) : value || '';
    });
    return exportRow;
  });

  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Set column widths
  const colWidths = columnsToExport.map(col => ({
    wch: col.width || 15
  }));
  ws['!cols'] = colWidths;

  // Add title if provided
  if (title) {
    XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: 0 });
    XLSX.utils.sheet_add_aoa(ws, [[]], { origin: 1 }); // Empty row
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    range.s.r = 2; // Start data from row 3
    ws['!ref'] = XLSX.utils.encode_range(range);
  }

  XLSX.utils.book_append_sheet(wb, ws, 'البيانات');
  
  // Save file
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
};

// Export to PDF
export const exportToPDF = (options: ExportOptions) => {
  const { filename, title, columns, data, selectedColumns, pageOrientation = 'landscape' } = options;
  
  // Filter columns based on selection
  const columnsToExport = selectedColumns 
    ? columns.filter(col => selectedColumns.includes(col.key))
    : columns;

  // Create PDF document
  const doc = new jsPDF({
    orientation: pageOrientation,
    unit: 'mm',
    format: 'a4'
  });

  // Add Arabic font support
  doc.setFont('helvetica');
  
  // Add title
  if (title) {
    doc.setFontSize(16);
    doc.text(title, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
  }

  // Prepare table data
  const tableColumns = columnsToExport.map(col => col.title);
  const tableRows = data.map(row => 
    columnsToExport.map(col => {
      const value = getNestedValue(row, col.key);
      return col.formatter ? col.formatter(value) : String(value || '');
    })
  );

  // Generate table
  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: title ? 30 : 20,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
      halign: 'right'
    },
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    columnStyles: columnsToExport.reduce((acc, col, index) => {
      acc[index] = { cellWidth: col.width || 'auto' };
      return acc;
    }, {} as any),
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
    pageBreak: 'auto',
    showHead: 'everyPage'
  });

  // Save PDF
  doc.save(`${filename}.pdf`);
};

// Print function
export const printData = (options: ExportOptions) => {
  const { title, columns, data, selectedColumns } = options;
  
  // Filter columns based on selection
  const columnsToExport = selectedColumns 
    ? columns.filter(col => selectedColumns.includes(col.key))
    : columns;

  // Create print content
  let printContent = `
    <html>
      <head>
        <title>${title || 'طباعة البيانات'}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            direction: rtl; 
            margin: 20px;
          }
          h1 { 
            text-align: center; 
            color: #333; 
            margin-bottom: 20px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 10px;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: right;
          }
          th { 
            background-color: #f2f2f2; 
            font-weight: bold;
          }
          tr:nth-child(even) { 
            background-color: #f9f9f9;
          }
          @media print {
            body { margin: 0; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
          }
        </style>
      </head>
      <body>
  `;

  if (title) {
    printContent += `<h1>${title}</h1>`;
  }

  printContent += `
    <table>
      <thead>
        <tr>
          ${columnsToExport.map(col => `<th>${col.title}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
  `;

  data.forEach(row => {
    printContent += '<tr>';
    columnsToExport.forEach(col => {
      const value = getNestedValue(row, col.key);
      const formattedValue = col.formatter ? col.formatter(value) : String(value || '');
      printContent += `<td>${formattedValue}</td>`;
    });
    printContent += '</tr>';
  });

  printContent += `
      </tbody>
    </table>
      </body>
    </html>
  `;

  // Open print window
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
};

// Helper function to get nested object values
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : '';
  }, obj);
};

// Format date for Arabic locale
export const formatDate = (date: string | Date): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Format grade
export const formatGrade = (grade: number | null): string => {
  if (grade === null || grade === undefined) return 'لم يتم التقييم';
  return `${grade}%`;
};

// Format status
export const formatStatus = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'pending': 'في الانتظار',
    'approved': 'موافق عليه',
    'rejected': 'مرفوض',
    'completed': 'مكتمل',
    'active': 'نشط',
    'inactive': 'غير نشط',
    'ongoing': 'جاري',
    'finished': 'منتهي'
  };
  return statusMap[status] || status;
};