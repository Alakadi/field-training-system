import React, { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentLayout } from "@/components/layout/student-layout";
import { ArrowLeft, Calendar, MapPin, User, GraduationCap } from "lucide-react";
import { useLocation } from "wouter";

const StudentCourseDetails = () => {
  const { courseId } = useParams();
  const [, setLocation] = useLocation();

  // جلب تفاصيل الكورس
  const { data: course, isLoading: isLoadingCourse } = useQuery({
    queryKey: ['/api/training-courses', courseId],
    enabled: !!courseId,
  });

  // جلب المجموعات
  const { data: groups, isLoading: isLoadingGroups } = useQuery({
    queryKey: ['/api/training-course-groups', courseId],
    queryFn: async () => {
      const response = await fetch(`/api/training-course-groups?courseId=${courseId}`);
      if (!response.ok) throw new Error('فشل في جلب المجموعات');
      return response.json();
    },
    enabled: !!courseId,
  });

  // جلب تعيينات الطالب
  const { data: assignments } = useQuery({
    queryKey: ['/api/training-assignments/student'],
  });

  // البحث عن التعيين الخاص بهذا الكورس
  const courseAssignment = assignments?.find((assignment: any) => 
    assignment.course?.id === parseInt(courseId || '0')
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'upcoming': return 'secondary';
      case 'active': return 'default';
      case 'completed': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'upcoming': return 'قادمة';
      case 'active': return 'نشطة';
      case 'completed': return 'مكتملة';
      default: return status;
    }
  };

  if (isLoadingCourse || isLoadingGroups) {
    return (
      <StudentLayout>
        <div className="space-y-6">
          <div className="text-center py-8">
            <p>جاري تحميل البيانات...</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (!course) {
    return (
      <StudentLayout>
        <div className="space-y-6">
          <div className="text-center py-8">
            <h2 className="text-xl font-bold text-red-600 mb-4">الكورس غير موجود</h2>
            <Button onClick={() => setLocation('/student/courses')}>
              العودة للدورات
            </Button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation('/student/courses')}
            >
              <ArrowLeft className="h-4 w-4 ml-1" />
              العودة
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{course.name}</h1>
              <Badge variant={getStatusVariant(course.status)} className="mt-1">
                {getStatusLabel(course.status)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Course Information */}
        <Card>
          <CardHeader>
            <CardTitle>معلومات الدورة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {course.description && (
                <div>
                  <label className="text-sm font-medium text-gray-600">الوصف</label>
                  <p className="text-gray-900">{course.description}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-600">الحالة</label>
                <div>
                  <Badge variant={getStatusVariant(course.status)}>
                    {getStatusLabel(course.status)}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student Registration Status */}
        {courseAssignment && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                حالة التسجيل
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">المجموعة</label>
                    <p className="text-gray-900">{courseAssignment.group?.groupName || 'غير محدد'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">موقع التدريب</label>
                    <p className="text-gray-900 flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {courseAssignment.course?.site?.name || 'غير محدد'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">المشرف</label>
                    <p className="text-gray-900 flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {courseAssignment.course?.supervisor?.user?.name || 'غير محدد'}
                    </p>
                  </div>
                </div>
                
                {courseAssignment.course?.startDate && courseAssignment.course?.endDate && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">مدة التدريب</label>
                    <p className="text-gray-900 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      من {new Date(courseAssignment.course.startDate).toLocaleDateString('ar-SA')} 
                      إلى {new Date(courseAssignment.course.endDate).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                )}

                {/* عرض الدرجة إذا كانت متوفرة */}
                {courseAssignment.evaluation?.score !== undefined && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="font-medium text-green-800 mb-2">نتيجة التقييم</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-green-600">الدرجة: </span>
                        <span className="font-bold text-green-800 text-lg">
                          {courseAssignment.evaluation.score}/100
                        </span>
                      </div>
                      {courseAssignment.evaluation.comments && (
                        <div>
                          <span className="text-sm text-green-600">تعليقات المشرف: </span>
                          <p className="text-green-800">{courseAssignment.evaluation.comments}</p>
                        </div>
                      )}
                      {courseAssignment.evaluation.evaluationDate && (
                        <div>
                          <span className="text-sm text-green-600">تاريخ التقييم: </span>
                          <span className="text-green-800">
                            {new Date(courseAssignment.evaluation.evaluationDate).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* رسالة إذا لم يتم إدراج الدرجة بعد */}
                {course.status === 'completed' && !courseAssignment.evaluation?.score && (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <p className="text-yellow-800">
                      لم يتم إدراج النتيجة بعد. سيتم إشعارك عند توفرها.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Training Groups */}
        <Card>
          <CardHeader>
            <CardTitle>مجموعات التدريب</CardTitle>
          </CardHeader>
          <CardContent>
            {!groups || groups.length === 0 ? (
              <p className="text-gray-500 text-center py-4">لا توجد مجموعات متاحة</p>
            ) : (
              <div className="space-y-4">
                {groups.map((group: any) => (
                  <div key={group.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">{group.groupName}</h3>
                      <Badge variant="outline">
                        {group.currentEnrollment || 0}/{group.capacity} طالب
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">موقع التدريب: </span>
                        <span>{group.site?.name || 'غير محدد'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">المشرف: </span>
                        <span>{group.supervisor?.user?.name || 'غير محدد'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">المدة: </span>
                        <span>
                          {group.startDate && group.endDate ? 
                            `${new Date(group.startDate).toLocaleDateString('ar-SA')} - ${new Date(group.endDate).toLocaleDateString('ar-SA')}` :
                            'غير محددة'
                          }
                        </span>
                      </div>
                    </div>

                    {/* إظهار إذا كان الطالب مسجل في هذه المجموعة */}
                    {courseAssignment?.groupId === group.id && (
                      <div className="mt-3 bg-blue-50 p-2 rounded border border-blue-200">
                        <p className="text-blue-800 text-sm font-medium">
                          🎯 أنت مسجل في هذه المجموعة
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
};

export default StudentCourseDetails;