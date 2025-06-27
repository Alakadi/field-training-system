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

// Export to PDF with Arabic support
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

  // Add title
  if (title) {
    doc.setFontSize(16);
    // Use Latin characters for title since Arabic isn't fully supported
    const latinTitle = transliterateArabicToLatin(title);
    doc.text(latinTitle, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
  }

  // Prepare table data with Latin transliteration for Arabic text
  const tableColumns = columnsToExport.map(col => transliterateArabicToLatin(col.title));
  const tableRows = data.map(row => 
    columnsToExport.map(col => {
      const value = getNestedValue(row, col.key);
      let formattedValue = col.formatter ? col.formatter(value) : String(value || '');
      // Transliterate Arabic text to Latin for PDF compatibility
      return transliterateArabicToLatin(formattedValue);
    })
  );

  // Generate table
  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: title ? 30 : 20,
    styles: {
      fontSize: 9,
      cellPadding: 3,
      overflow: 'linebreak',
      halign: 'left', // Changed to left align for Latin text
      font: 'helvetica'
    },
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    columnStyles: columnsToExport.reduce((acc, col, index) => {
      // Adjust column widths for better readability
      acc[index] = { 
        cellWidth: Math.max(col.width || 20, 15) // Minimum width 15mm
      };
      return acc;
    }, {} as any),
    margin: { top: 15, right: 15, bottom: 15, left: 15 },
    pageBreak: 'auto',
    showHead: 'everyPage',
    tableWidth: 'auto'
  });

  // Save PDF
  doc.save(`${filename}.pdf`);
};

// Helper function to transliterate Arabic text to Latin characters
const transliterateArabicToLatin = (text: string): string => {
  if (!text) return '';
  
  // Arabic to Latin mapping for better PDF display
  const arabicToLatin: { [key: string]: string } = {
    // Numbers
    '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5',
    '٦': '6', '٧': '7', '٨': '8', '٩': '9', '٠': '0',
    
    // Common Arabic words and phrases
    'اسم الطالب': 'Student Name',
    'الرقم الجامعي': 'University ID',
    'البريد الإلكتروني': 'Email',
    'الكلية': 'Faculty',
    'التخصص': 'Major',
    'المستوى الدراسي': 'Academic Level',
    'المعدل التراكمي': 'GPA',
    'رقم الهاتف': 'Phone',
    'العنوان': 'Address',
    'تاريخ التسجيل': 'Registration Date',
    'اسم المشرف': 'Supervisor Name',
    'القسم': 'Department',
    'المسمى الأكاديمي': 'Academic Title',
    'مكان المكتب': 'Office Location',
    'الدورة التدريبية': 'Training Course',
    'درجة الحضور': 'Attendance Score',
    'درجة المهارات': 'Skills Score',
    'درجة التقرير': 'Report Score',
    'المجموع': 'Total Score',
    'الملاحظات': 'Notes',
    'تاريخ التقييم': 'Evaluation Date',
    'غير محدد': 'Not Specified',
    'لم يتم التقييم': 'Not Evaluated',
    
    // Faculty names
    'الهندسة و تقنية المعلومات': 'Engineering & IT',
    'العلوم الطبية': 'Medical Sciences',
    'تقنية المعلومات': 'Information Technology',
    'هندسة مدني': 'Civil Engineering',
    'صيدلة': 'Pharmacy',
    'تغذية': 'Nutrition',
    
    // Levels
    'المستوى الأول': 'Level 1',
    'المستوى الثاني': 'Level 2',
    'المستوى الثالث': 'Level 3',
    'المستوى الرابع': 'Level 4',
    'المستوى الخامس': 'Level 5',
    
    // Common Arabic letters (basic transliteration)
    'أ': 'a', 'إ': 'i', 'آ': 'aa', 'ا': 'a', 'ب': 'b',
    'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh',
    'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's',
    'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z',
    'ع': "'", 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k',
    'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w',
    'ي': 'y', 'ى': 'a', 'ة': 'h', 'ء': "'"
  };
  
  let result = text;
  
  // Replace whole phrases first
  for (const [arabic, latin] of Object.entries(arabicToLatin)) {
    if (arabic.length > 1) {
      result = result.replace(new RegExp(arabic, 'g'), latin);
    }
  }
  
  // Then replace individual characters
  for (const [arabic, latin] of Object.entries(arabicToLatin)) {
    if (arabic.length === 1) {
      result = result.replace(new RegExp(arabic, 'g'), latin);
    }
  }
  
  return result;
};

// Print function with improved Arabic support
export const printData = (options: ExportOptions) => {
  const { title, columns, data, selectedColumns } = options;
  
  // Filter columns based on selection
  const columnsToExport = selectedColumns 
    ? columns.filter(col => selectedColumns.includes(col.key))
    : columns;

  // Create print content with better Arabic support
  let printContent = `
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${title || 'طباعة البيانات'}</title>
        <style>
          body { 
            font-family: 'Arial', 'Tahoma', sans-serif; 
            direction: rtl; 
            margin: 20px;
            line-height: 1.6;
          }
          h1 { 
            text-align: center; 
            color: #333; 
            margin-bottom: 30px;
            font-size: 24px;
            border-bottom: 2px solid #428bca;
            padding-bottom: 10px;
          }
          .info-section {
            margin-bottom: 20px;
            font-size: 14px;
            color: #666;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
            font-size: 12px;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 10px 8px; 
            text-align: right;
            vertical-align: top;
          }
          th { 
            background-color: #428bca; 
            color: white;
            font-weight: bold;
            font-size: 13px;
          }
          tr:nth-child(even) { 
            background-color: #f9f9f9;
          }
          tr:hover {
            background-color: #f5f5f5;
          }
          .no-data {
            text-align: center;
            color: #999;
            font-style: italic;
          }
          @media print {
            body { 
              margin: 15mm; 
              font-size: 10px;
            }
            h1 { 
              font-size: 18px; 
              margin-bottom: 20px;
            }
            table { 
              page-break-inside: auto;
              font-size: 9px;
            }
            tr { 
              page-break-inside: avoid; 
              page-break-after: auto; 
            }
            th {
              background-color: #428bca !important;
              color: white !important;
              -webkit-print-color-adjust: exact;
            }
            .info-section {
              font-size: 11px;
            }
          }
        </style>
      </head>
      <body>
  `;

  if (title) {
    printContent += `<h1>${title}</h1>`;
  }

  // Add print info
  const currentDate = new Date().toLocaleDateString('ar-SA');
  const currentTime = new Date().toLocaleTimeString('ar-SA');
  printContent += `
    <div class="info-section">
      <strong>تاريخ الطباعة:</strong> ${currentDate} - ${currentTime}<br>
      <strong>عدد السجلات:</strong> ${data.length}<br>
      <strong>الأعمدة المحددة:</strong> ${columnsToExport.length} من ${columns.length}
    </div>
  `;

  if (data.length === 0) {
    printContent += `
      <div class="no-data">
        <h3>لا توجد بيانات للطباعة</h3>
      </div>
    `;
  } else {
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
        // Escape HTML entities for safety
        const escapedValue = formattedValue
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
        printContent += `<td>${escapedValue || '-'}</td>`;
      });
      printContent += '</tr>';
    });

    printContent += `
        </tbody>
      </table>
    `;
  }

  printContent += `
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
    }, 500);
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