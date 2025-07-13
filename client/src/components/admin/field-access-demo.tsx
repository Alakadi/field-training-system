import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { User, Eye, EyeOff, Shield, Users, GraduationCap } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

type TestRole = 'admin' | 'supervisor' | 'student';

const FieldAccessDemo: React.FC = () => {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<TestRole>('admin');
  const [showSensitiveFields, setShowSensitiveFields] = useState(false);

  // Mock data to show field access differences
  const mockStudentData = {
    id: 1,
    universityId: "2023001",
    name: "أحمد محمد",
    email: "ahmad@university.edu",
    phone: "0501234567",
    facultyName: "هندسة وتقنية المعلومات",
    majorName: "تقنية المعلومات",
    levelName: "المستوى الثالث",
    attendanceGrade: 18,
    behaviorGrade: 25,
    finalExamGrade: 42,
    calculatedFinalGrade: 85,
    password: "encrypted_password_hash",
    active: true,
    createdAt: "2024-01-15T10:00:00Z"
  };

  const mockSupervisorData = {
    id: 1,
    name: "د. سارة أحمد",
    username: "supervisor1",
    email: "sara@university.edu",
    phone: "0509876543",
    department: "قسم علوم الحاسب",
    facultyName: "هندسة وتقنية المعلومات",
    password: "encrypted_password_hash",
    active: true,
    createdAt: "2024-01-10T09:00:00Z"
  };

  // Field access rules for different roles
  const fieldAccessRules = {
    admin: {
      canViewAll: true,
      hiddenFields: [] as string[],
      description: "المدير يرى جميع الحقول بدون قيود"
    },
    supervisor: {
      canViewAll: false,
      hiddenFields: ['password', 'createdAt'],
      description: "المشرف لا يرى كلمات المرور وبعض البيانات الإدارية"
    },
    student: {
      canViewAll: false,
      hiddenFields: ['password', 'email', 'phone', 'universityId', 'attendanceGrade', 'behaviorGrade', 'finalExamGrade'],
      description: "الطالب يرى بياناته الشخصية الأساسية ودرجاته النهائية فقط"
    }
  };

  // Function to filter data based on role
  const filterDataByRole = (data: any, role: TestRole): any => {
    const rules = fieldAccessRules[role];
    if (rules.canViewAll) return data;

    const filteredData = { ...data };
    rules.hiddenFields.forEach(field => {
      if (filteredData[field] !== undefined) {
        delete filteredData[field];
      }
    });
    return filteredData;
  };

  const getRoleIcon = (role: TestRole) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'supervisor':
        return <Users className="w-4 h-4" />;
      case 'student':
        return <GraduationCap className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: TestRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500';
      case 'supervisor':
        return 'bg-blue-500';
      case 'student':
        return 'bg-green-500';
    }
  };

  const renderFieldValue = (key: string, value: any, isHidden: boolean = false) => {
    if (isHidden) {
      return (
        <div className="flex items-center gap-2 text-gray-400">
          <EyeOff className="w-4 h-4" />
          <span className="italic">محجوب</span>
        </div>
      );
    }

    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "نشط" : "غير نشط"}
        </Badge>
      );
    }

    if (key === 'password') {
      return <span className="font-mono text-sm text-gray-500">••••••••</span>;
    }

    if (key.includes('Grade')) {
      return <span className="font-semibold text-blue-600">{value}</span>;
    }

    return <span>{value}</span>;
  };

  const filteredStudentData = filterDataByRole(mockStudentData, selectedRole);
  const filteredSupervisorData = filterDataByRole(mockSupervisorData, selectedRole);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">نظام التحكم في الحقول</h2>
          <p className="text-gray-600 mt-1">
            مقارنة عرض البيانات حسب الأدوار المختلفة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-gray-500" />
          <span className="text-sm text-gray-600">
            دورك الحالي: {user?.role === 'admin' ? 'مدير' : user?.role === 'supervisor' ? 'مشرف' : 'طالب'}
          </span>
        </div>
      </div>

      <Alert>
        <Shield className="w-4 h-4" />
        <AlertDescription>
          هذا النظام يتحكم في إظهار/إخفاء الحقول الحساسة حسب دور المستخدم. اختر دور مختلف لمشاهدة الفرق.
        </AlertDescription>
      </Alert>

      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">اختبار عرض البيانات لدور:</label>
        <Select value={selectedRole} onValueChange={(value: TestRole) => setSelectedRole(value)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                مدير النظام
              </div>
            </SelectItem>
            <SelectItem value="supervisor">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                مشرف
              </div>
            </SelectItem>
            <SelectItem value="student">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                طالب
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          {getRoleIcon(selectedRole)}
          <span className="font-semibold">قواعد الوصول لدور: {selectedRole}</span>
        </div>
        <p className="text-sm text-gray-700">
          {fieldAccessRules[selectedRole].description}
        </p>
        {!fieldAccessRules[selectedRole].canViewAll && (
          <div className="mt-2">
            <span className="text-sm font-medium">الحقول المحجوبة: </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {fieldAccessRules[selectedRole].hiddenFields.map(field => (
                <Badge key={field} variant="secondary" className="text-xs">
                  {field}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student Data Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              بيانات الطالب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(mockStudentData).map(([key, value]) => {
                const isHidden = fieldAccessRules[selectedRole].hiddenFields.includes(key);
                const isVisible = selectedRole === 'admin' || !isHidden;
                
                return (
                  <div key={key} className="flex justify-between items-center p-2 rounded border">
                    <span className="font-medium text-sm">{key}:</span>
                    {isVisible ? (
                      renderFieldValue(key, value, false)
                    ) : (
                      renderFieldValue(key, value, true)
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Supervisor Data Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              بيانات المشرف
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(mockSupervisorData).map(([key, value]) => {
                const isHidden = fieldAccessRules[selectedRole].hiddenFields.includes(key);
                const isVisible = selectedRole === 'admin' || !isHidden;
                
                return (
                  <div key={key} className="flex justify-between items-center p-2 rounded border">
                    <span className="font-medium text-sm">{key}:</span>
                    {isVisible ? (
                      renderFieldValue(key, value, false)
                    ) : (
                      renderFieldValue(key, value, true)
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">ملاحظات مهمة:</h3>
        <ul className="space-y-1 text-sm text-gray-700">
          <li>• المدير يرى جميع الحقول بدون استثناء</li>
          <li>• المشرف لا يرى كلمات المرور والبيانات الإدارية الحساسة</li>
          <li>• الطالب يرى بياناته الشخصية الأساسية ودرجاته النهائية فقط</li>
          <li>• يمكن تخصيص قواعد الوصول لكل جدول على حدة</li>
          <li>• النظام يطبق الفلترة تلقائياً على جميع استجابات API</li>
        </ul>
      </div>
    </div>
  );
};

export default FieldAccessDemo;