import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

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

  // Create PDF document with better Unicode support
  const doc = new jsPDF({
    orientation: pageOrientation,
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  // Set font to support better Unicode characters
  doc.setFont('helvetica');
  doc.setFontSize(16);

  // Add title with better Arabic rendering approach
  if (title) {
    // For now, keep Arabic text as is - modern browsers handle it better
    try {
      doc.text(title, doc.internal.pageSize.getWidth() / 2, 20, { 
        align: 'center',
        maxWidth: doc.internal.pageSize.getWidth() - 30
      });
    } catch (error) {
      // Fallback to English if Arabic fails
      const englishTitle = getEnglishTitle(title);
      doc.text(englishTitle, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    }
  }

  // Prepare table data - keep Arabic text as much as possible
  const tableColumns = columnsToExport.map(col => col.title);
  const tableRows = data.map(row => 
    columnsToExport.map(col => {
      const value = getNestedValue(row, col.key);
      return col.formatter ? col.formatter(value) : String(value || '');
    })
  );

  // Generate table with better Arabic support
  try {
    autoTable(doc, {
      head: [tableColumns],
      body: tableRows,
      startY: title ? 35 : 20,
      styles: {
        fontSize: 10,
        cellPadding: 4,
        overflow: 'linebreak',
        halign: 'right', // Right align for Arabic
        font: 'helvetica',
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontSize: 11,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 5
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      columnStyles: columnsToExport.reduce((acc, col, index) => {
        acc[index] = { 
          cellWidth: Math.max(col.width || 25, 20), // Increased minimum width
          halign: 'right'
        };
        return acc;
      }, {} as any),
      margin: { top: 15, right: 15, bottom: 15, left: 15 },
      pageBreak: 'auto',
      showHead: 'everyPage',
      tableWidth: 'auto',
      theme: 'grid'
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    // Fallback with English translations if Arabic fails
    const englishColumns = columnsToExport.map(col => getEnglishColumnTitle(col.title));
    const englishRows = data.map(row => 
      columnsToExport.map(col => {
        const value = getNestedValue(row, col.key);
        let formattedValue = col.formatter ? col.formatter(value) : String(value || '');
        return translateToEnglish(formattedValue);
      })
    );

    autoTable(doc, {
      head: [englishColumns],
      body: englishRows,
      startY: title ? 35 : 20,
      styles: {
        fontSize: 10,
        cellPadding: 4,
        overflow: 'linebreak',
        halign: 'left'
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontSize: 11,
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      }
    });
  }

  // Save PDF
  doc.save(`${filename}.pdf`);
};

// Helper functions for English fallback
const getEnglishTitle = (arabicTitle: string): string => {
  const titleMap: { [key: string]: string } = {
    'تصدير قائمة الطلاب': 'Students List Export',
    'تصدير قائمة المشرفين': 'Supervisors List Export', 
    'تصدير تقييمات الطلاب': 'Student Evaluations Export',
    'تصدير البيانات': 'Data Export'
  };
  return titleMap[arabicTitle] || 'Data Export';
};

const getEnglishColumnTitle = (arabicTitle: string): string => {
  const columnMap: { [key: string]: string } = {
    'اسم الطالب': 'Student Name',
    'الرقم الجامعي': 'University ID',
    'البريد الإلكتروني': 'Email',
    'الكلية': 'Faculty',
    'التخصص': 'Major',
    'المستوى الدراسي': 'Level',
    'المعدل التراكمي': 'GPA',
    'رقم الهاتف': 'Phone',
    'العنوان': 'Address',
    'تاريخ التسجيل': 'Registration Date',
    'اسم المشرف': 'Supervisor',
    'القسم': 'Department',
    'المسمى الأكاديمي': 'Title',
    'مكان المكتب': 'Office',
    'الدورة التدريبية': 'Training Course',
    'درجة الحضور': 'Attendance',
    'درجة المهارات': 'Skills',
    'درجة التقرير': 'Report',
    'المجموع': 'Total',
    'الملاحظات': 'Notes',
    'تاريخ التقييم': 'Evaluation Date'
  };
  return columnMap[arabicTitle] || arabicTitle;
};

const translateToEnglish = (arabicText: string): string => {
  if (!arabicText) return '';
  
  const translations: { [key: string]: string } = {
    'غير محدد': 'Not Specified',
    'لم يتم التقييم': 'Not Evaluated',
    'الهندسة و تقنية المعلومات': 'Engineering & IT',
    'العلوم الطبية': 'Medical Sciences',
    'تقنية المعلومات': 'Information Technology',
    'هندسة مدني': 'Civil Engineering',
    'صيدلة': 'Pharmacy',
    'تغذية': 'Nutrition',
    'المستوى الأول': 'Level 1',
    'المستوى الثاني': 'Level 2',
    'المستوى الثالث': 'Level 3',
    'المستوى الرابع': 'Level 4',
    'المستوى الخامس': 'Level 5'
  };
  
  return translations[arabicText] || arabicText;
};

// Alternative PDF export using HTML to Canvas conversion for better Arabic support
export const exportToPDFWithCanvas = async (options: ExportOptions) => {
  const { filename, title, columns, data, selectedColumns, pageOrientation = 'landscape' } = options;
  
  // Filter columns based on selection
  const columnsToExport = selectedColumns 
    ? columns.filter(col => selectedColumns.includes(col.key))
    : columns;

  // Create a temporary HTML table for conversion
  const tableHTML = createArabicTableHTML(title || '', columnsToExport, data);
  
  // Create temporary div
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '-9999px';
  tempDiv.style.width = pageOrientation === 'landscape' ? '1200px' : '800px';
  tempDiv.innerHTML = tableHTML;
  document.body.appendChild(tempDiv);

  try {
    // Convert to canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: pageOrientation === 'landscape' ? 1200 : 800,
      height: Math.max(600, data.length * 25 + 200)
    });

    // Create PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: pageOrientation,
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = pageOrientation === 'landscape' ? 277 : 190;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
    pdf.save(`${filename}.pdf`);

  } catch (error) {
    console.error('Canvas to PDF conversion failed:', error);
    // Fallback to regular PDF export
    exportToPDF(options);
  } finally {
    // Clean up
    document.body.removeChild(tempDiv);
  }
};

// Helper function to create HTML table with proper Arabic styling
const createArabicTableHTML = (title: string, columns: any[], data: any[]): string => {
  return `
    <div style="
      font-family: 'Tahoma', 'Arial', sans-serif;
      direction: rtl;
      padding: 20px;
      background: white;
      color: #333;
    ">
      ${title ? `<h1 style="
        text-align: center;
        color: #2c3e50;
        margin-bottom: 30px;
        font-size: 24px;
        border-bottom: 3px solid #3498db;
        padding-bottom: 10px;
      ">${title}</h1>` : ''}
      
      <table style="
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      ">
        <thead>
          <tr style="background-color: #3498db; color: white;">
            ${columns.map(col => `
              <th style="
                border: 1px solid #ddd;
                padding: 12px 8px;
                text-align: center;
                font-weight: bold;
                font-size: 13px;
              ">${col.title}</th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map((row, index) => `
            <tr style="
              background-color: ${index % 2 === 0 ? '#f8f9fa' : 'white'};
              border-bottom: 1px solid #eee;
            ">
              ${columns.map(col => {
                const value = getNestedValue(row, col.key);
                const formattedValue = col.formatter ? col.formatter(value) : String(value || '');
                return `
                  <td style="
                    border: 1px solid #ddd;
                    padding: 10px 8px;
                    text-align: right;
                    vertical-align: top;
                    line-height: 1.4;
                  ">${formattedValue || '-'}</td>
                `;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div style="
        margin-top: 20px;
        font-size: 12px;
        color: #666;
        text-align: center;
        border-top: 1px solid #eee;
        padding-top: 10px;
      ">
        تم إنشاء هذا التقرير في: ${new Date().toLocaleDateString('ar-SA')} - ${new Date().toLocaleTimeString('ar-SA')}
        <br>
        عدد السجلات: ${data.length}
      </div>
    </div>
  `;
};

// Helper function to transliterate Arabic text to Latin characters
const transliterateArabicToLatin = (text: string): string => {
  if (!text) return '';
  
  // Arabic to Latin mapping for better PDF display
  const arabicToLatin: { [key: string]: string } = {
    // Numbers (Arabic-Indic to Western-Arabic)
    '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5',
    '٦': '6', '٧': '7', '٨': '8', '٩': '9', '٠': '0',
    
    // Common Arabic words and phrases (exact translations)
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
    
    // Student name patterns
    'طالب': 'Student',
    
    // Status and common terms
    'نشط': 'Active',
    'غير نشط': 'Inactive',
    'مكتمل': 'Completed',
    'في الانتظار': 'Pending',
    'موافق عليه': 'Approved',
    'مرفوض': 'Rejected',
    
    // Common address parts
    'مهرم': 'Mahram',
    'حي': 'District',
    'شارع': 'Street',
    'مدينة': 'City',
    
    // Comprehensive Arabic letter transliteration
    'أ': 'a', 'إ': 'i', 'آ': 'aa', 'ا': 'a', 'ب': 'b',
    'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh',
    'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's',
    'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z',
    'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k',
    'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w',
    'ي': 'y', 'ى': 'a', 'ة': 'h', 'ء': 'a'
  };
  
  let result = text;
  
  // First, handle exact phrase matches (longest first)
  const sortedPhrases = Object.entries(arabicToLatin)
    .filter(([arabic]) => arabic.length > 1)
    .sort(([a], [b]) => b.length - a.length);
    
  for (const [arabic, latin] of sortedPhrases) {
    result = result.replace(new RegExp(arabic, 'g'), latin);
  }
  
  // Then handle individual characters
  for (const [arabic, latin] of Object.entries(arabicToLatin)) {
    if (arabic.length === 1) {
      result = result.replace(new RegExp(arabic, 'g'), latin);
    }
  }
  
  // Clean up any remaining Arabic characters that weren't mapped
  result = result.replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, '');
  
  // Clean up extra spaces
  result = result.replace(/\s+/g, ' ').trim();
  
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