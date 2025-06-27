import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { exportToExcel, exportToPDF, printData, ExportColumn, ExportOptions } from '@/lib/export-utils';
import { Icon } from '@/components/ui/icon-map';

interface ExportDialogProps {
  data: any[];
  columns: ExportColumn[];
  defaultFilename: string;
  title?: string;
  trigger?: React.ReactNode;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  data,
  columns,
  defaultFilename,
  title = 'تصدير البيانات',
  trigger
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filename, setFilename] = useState(defaultFilename);
  const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(columns.map(col => col.key));
  const [pageOrientation, setPageOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [isExporting, setIsExporting] = useState(false);

  const handleColumnToggle = (columnKey: string) => {
    setSelectedColumns(prev => 
      prev.includes(columnKey)
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    );
  };

  const handleSelectAll = () => {
    setSelectedColumns(columns.map(col => col.key));
  };

  const handleDeselectAll = () => {
    setSelectedColumns([]);
  };

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      alert('يرجى اختيار عمود واحد على الأقل للتصدير');
      return;
    }

    setIsExporting(true);
    
    const exportOptions: ExportOptions = {
      filename,
      title,
      columns,
      data,
      format,
      selectedColumns,
      pageOrientation
    };

    try {
      if (format === 'excel') {
        exportToExcel(exportOptions);
      } else {
        exportToPDF(exportOptions);
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('فشل في تصدير البيانات');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    if (selectedColumns.length === 0) {
      alert('يرجى اختيار عمود واحد على الأقل للطباعة');
      return;
    }

    const exportOptions: ExportOptions = {
      filename,
      title,
      columns,
      data,
      format: 'pdf',
      selectedColumns
    };

    printData(exportOptions);
    setIsOpen(false);
  };

  const defaultTrigger = (
    <Button variant="outline" className="gap-2">
      <Icon name="download" size={16} />
      تصدير البيانات
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="download" size={20} />
            {title}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="space-y-6 p-1">
            {/* File Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">إعدادات الملف</CardTitle>
                <CardDescription>
                  اختر اسم الملف وتنسيق التصدير
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="filename">اسم الملف</Label>
                  <Input
                    id="filename"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    placeholder="أدخل اسم الملف"
                  />
                </div>

                <div className="space-y-3">
                  <Label>تنسيق التصدير</Label>
                  <RadioGroup value={format} onValueChange={(value) => setFormat(value as 'excel' | 'pdf')}>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="excel" id="excel" />
                      <Label htmlFor="excel" className="flex items-center gap-2">
                        <Icon name="file-spreadsheet" size={16} />
                        Excel (.xlsx)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="pdf" id="pdf" />
                      <Label htmlFor="pdf" className="flex items-center gap-2">
                        <Icon name="file-text" size={16} />
                        PDF (.pdf)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {format === 'pdf' && (
                  <div className="space-y-3">
                    <Label>اتجاه الصفحة</Label>
                    <RadioGroup value={pageOrientation} onValueChange={(value) => setPageOrientation(value as 'portrait' | 'landscape')}>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <RadioGroupItem value="portrait" id="portrait" />
                        <Label htmlFor="portrait">عمودي</Label>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <RadioGroupItem value="landscape" id="landscape" />
                        <Label htmlFor="landscape">أفقي</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Column Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">اختيار الأعمدة</CardTitle>
                <CardDescription>
                  اختر الأعمدة التي تريد تضمينها في التصدير ({selectedColumns.length} من {columns.length})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="flex items-center gap-1"
                  >
                    <Icon name="check-all" size={14} />
                    تحديد الكل
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAll}
                    className="flex items-center gap-1"
                  >
                    <Icon name="x" size={14} />
                    إلغاء التحديد
                  </Button>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                  {columns.map((column) => (
                    <div key={column.key} className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id={column.key}
                        checked={selectedColumns.includes(column.key)}
                        onCheckedChange={() => handleColumnToggle(column.key)}
                      />
                      <Label htmlFor={column.key} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {column.title}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Data Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ملخص البيانات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span>عدد السзаписей:</span>
                    <span className="font-medium">{data.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>الأعمدة المحددة:</span>
                    <span className="font-medium">{selectedColumns.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex justify-between gap-3 pt-4 border-t">
          <div className="flex gap-2">
            <Button
              onClick={handlePrint}
              variant="outline"
              disabled={selectedColumns.length === 0}
              className="flex items-center gap-2"
            >
              <Icon name="printer" size={16} />
              طباعة
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting || selectedColumns.length === 0}
              className="flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <Icon name="loader" size={16} className="animate-spin" />
                  جاري التصدير...
                </>
              ) : (
                <>
                  <Icon name="download" size={16} />
                  تصدير
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};