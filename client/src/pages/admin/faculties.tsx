import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Icon } from '@/components/ui/icon-map';
import { apiRequest } from '@/lib/queryClient';

interface Faculty {
  id: number;
  name: string;
}

interface Major {
  id: number;
  name: string;
  facultyId: number;
  faculty?: Faculty;
}

// Form schemas
const facultySchema = z.object({
  name: z.string().min(1, 'اسم الكلية مطلوب'),
});

const majorSchema = z.object({
  name: z.string().min(1, 'اسم التخصص مطلوب'),
  facultyId: z.number().min(1, 'يجب اختيار الكلية'),
});

type FacultyFormData = z.infer<typeof facultySchema>;
type MajorFormData = z.infer<typeof majorSchema>;

export default function FacultiesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [facultyDialogOpen, setFacultyDialogOpen] = useState(false);
  const [majorDialogOpen, setMajorDialogOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [editingMajor, setEditingMajor] = useState<Major | null>(null);

  // Fetch faculties
  const { data: faculties = [], isLoading: facultiesLoading } = useQuery({
    queryKey: ['/api/faculties'],
  });

  // Fetch majors
  const { data: majors = [], isLoading: majorsLoading } = useQuery({
    queryKey: ['/api/majors'],
  });

  // Faculty form
  const facultyForm = useForm<FacultyFormData>({
    resolver: zodResolver(facultySchema),
    defaultValues: {
      name: '',
    },
  });

  // Major form
  const majorForm = useForm<MajorFormData>({
    resolver: zodResolver(majorSchema),
    defaultValues: {
      name: '',
      facultyId: 0,
    },
  });

  // Faculty mutations
  const createFacultyMutation = useMutation({
    mutationFn: (data: FacultyFormData) => apiRequest('POST', '/api/faculties', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/faculties'] });
      toast({
        title: 'تم بنجاح',
        description: 'تم إضافة الكلية بنجاح',
      });
      setFacultyDialogOpen(false);
      facultyForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في إضافة الكلية',
        variant: 'destructive',
      });
    },
  });

  const updateFacultyMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: FacultyFormData }) => 
      apiRequest('PUT', `/api/faculties/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/faculties'] });
      toast({
        title: 'تم بنجاح',
        description: 'تم تحديث الكلية بنجاح',
      });
      setFacultyDialogOpen(false);
      setEditingFaculty(null);
      facultyForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في تحديث الكلية',
        variant: 'destructive',
      });
    },
  });

  // Major mutations
  const createMajorMutation = useMutation({
    mutationFn: (data: MajorFormData) => apiRequest('POST', '/api/majors', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/majors'] });
      toast({
        title: 'تم بنجاح',
        description: 'تم إضافة التخصص بنجاح',
      });
      setMajorDialogOpen(false);
      majorForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في إضافة التخصص',
        variant: 'destructive',
      });
    },
  });

  const updateMajorMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: MajorFormData }) => 
      apiRequest('PUT', `/api/majors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/majors'] });
      toast({
        title: 'تم بنجاح',
        description: 'تم تحديث التخصص بنجاح',
      });
      setMajorDialogOpen(false);
      setEditingMajor(null);
      majorForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في تحديث التخصص',
        variant: 'destructive',
      });
    },
  });

  const handleFacultySubmit = (data: FacultyFormData) => {
    if (editingFaculty) {
      updateFacultyMutation.mutate({ id: editingFaculty.id, data });
    } else {
      createFacultyMutation.mutate(data);
    }
  };

  const handleMajorSubmit = (data: MajorFormData) => {
    if (editingMajor) {
      updateMajorMutation.mutate({ id: editingMajor.id, data });
    } else {
      createMajorMutation.mutate(data);
    }
  };

  const handleEditFaculty = (faculty: Faculty) => {
    setEditingFaculty(faculty);
    facultyForm.setValue('name', faculty.name);
    setFacultyDialogOpen(true);
  };

  const handleEditMajor = (major: Major) => {
    setEditingMajor(major);
    majorForm.setValue('name', major.name);
    majorForm.setValue('facultyId', major.facultyId);
    setMajorDialogOpen(true);
  };

  const handleAddFaculty = () => {
    setEditingFaculty(null);
    facultyForm.reset();
    setFacultyDialogOpen(true);
  };

  const handleAddMajor = () => {
    setEditingMajor(null);
    majorForm.reset();
    setMajorDialogOpen(true);
  };

  // Get faculty name by ID
  const getFacultyName = (facultyId: number) => {
    const faculty = faculties.find((f: Faculty) => f.id === facultyId);
    return faculty?.name || 'غير محدد';
  };

  // Group majors by faculty
  const majorsByFaculty = majors.reduce((acc: any, major: Major) => {
    if (!acc[major.facultyId]) {
      acc[major.facultyId] = [];
    }
    acc[major.facultyId].push(major);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="flex items-center gap-2 bg-[#006bd6e6]"
          >
            <Icon name="arrow-right" className="w-4 h-4" />
            عودة
          </Button>
          <h1 className="text-2xl font-bold">إدارة الكليات والتخصصات</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Faculties Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="building" className="w-5 h-5" />
                  الكليات
                </CardTitle>
                <CardDescription>
                  إدارة الكليات الأكاديمية
                </CardDescription>
              </div>
              <Dialog open={facultyDialogOpen} onOpenChange={setFacultyDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleAddFaculty}>
                    <Icon name="plus" className="w-4 h-4 ml-2" />
                    إضافة كلية
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingFaculty ? 'تعديل الكلية' : 'إضافة كلية جديدة'}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...facultyForm}>
                    <form onSubmit={facultyForm.handleSubmit(handleFacultySubmit)} className="space-y-4">
                      <FormField
                        control={facultyForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>اسم الكلية</FormLabel>
                            <FormControl>
                              <Input placeholder="أدخل اسم الكلية" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setFacultyDialogOpen(false)}
                        >
                          إلغاء
                        </Button>
                        <Button
                          type="submit"
                          disabled={createFacultyMutation.isPending || updateFacultyMutation.isPending}
                        >
                          {editingFaculty ? 'تحديث' : 'إضافة'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {facultiesLoading ? (
              <div className="text-center py-4">جاري التحميل...</div>
            ) : (
              <div className="space-y-2">
                {faculties.map((faculty: Faculty) => (
                  <div
                    key={faculty.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium">{faculty.name}</h3>
                      <p className="text-sm text-gray-500">
                        {majorsByFaculty[faculty.id]?.length || 0} تخصص
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditFaculty(faculty)}
                    >
                      <Icon name="edit" className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {faculties.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    لا توجد كليات
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Majors Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="graduation-cap" className="w-5 h-5" />
                  التخصصات
                </CardTitle>
                <CardDescription>
                  إدارة التخصصات الأكاديمية
                </CardDescription>
              </div>
              <Dialog open={majorDialogOpen} onOpenChange={setMajorDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleAddMajor}>
                    <Icon name="plus" className="w-4 h-4 ml-2" />
                    إضافة تخصص
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingMajor ? 'تعديل التخصص' : 'إضافة تخصص جديد'}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...majorForm}>
                    <form onSubmit={majorForm.handleSubmit(handleMajorSubmit)} className="space-y-4">
                      <FormField
                        control={majorForm.control}
                        name="facultyId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الكلية</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              value={field.value.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="اختر الكلية" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {faculties.map((faculty: Faculty) => (
                                  <SelectItem key={faculty.id} value={faculty.id.toString()}>
                                    {faculty.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={majorForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>اسم التخصص</FormLabel>
                            <FormControl>
                              <Input placeholder="أدخل اسم التخصص" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setMajorDialogOpen(false)}
                        >
                          إلغاء
                        </Button>
                        <Button
                          type="submit"
                          disabled={createMajorMutation.isPending || updateMajorMutation.isPending}
                        >
                          {editingMajor ? 'تحديث' : 'إضافة'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {majorsLoading ? (
              <div className="text-center py-4">جاري التحميل...</div>
            ) : (
              <div className="space-y-2">
                {majors.map((major: Major) => (
                  <div
                    key={major.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium">{major.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {getFacultyName(major.facultyId)}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditMajor(major)}
                    >
                      <Icon name="edit" className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {majors.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    لا توجد تخصصات
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>ملخص الكليات والتخصصات</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الكلية</TableHead>
                <TableHead>عدد التخصصات</TableHead>
                <TableHead>التخصصات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {faculties.map((faculty: Faculty) => (
                <TableRow key={faculty.id}>
                  <TableCell className="font-medium">{faculty.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {majorsByFaculty[faculty.id]?.length || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {majorsByFaculty[faculty.id]?.map((major: Major) => (
                        <Badge key={major.id} variant="secondary" className="text-xs">
                          {major.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}