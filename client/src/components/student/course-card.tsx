import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface CourseCardProps {
  course: {
    id: number;
    name: string;
    site: {
      id: number;
      name: string;
    };
    startDate: string;
    endDate: string;
    supervisor?: {
      id: number;
      user: {
        id: number;
        name: string;
      };
    };
    capacity: number;
    studentCount?: number;
    description?: string;
    location?: string;
    status?: string;
  };
  onEnroll: () => void;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, onEnroll }) => {
  const availableSeats = course.capacity - (course.studentCount || 0);
  
  return (
    <Card className="border border-neutral-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4 bg-neutral-50 border-b border-neutral-200">
        <h3 className="font-bold text-primary text-lg">{course.name}</h3>
      </div>
      <CardContent className="p-4 space-y-3">
        <div>
          <p className="text-sm text-neutral-500">جهة التدريب:</p>
          <p className="font-medium">{course.site.name}</p>
        </div>
        <div>
          <p className="text-sm text-neutral-500">المدة:</p>
          <p className="font-medium">
            {formatDate(course.startDate)} - {formatDate(course.endDate)}
          </p>
        </div>
        <div>
          <p className="text-sm text-neutral-500">المشرف:</p>
          <p className="font-medium">{course.supervisor?.user.name || "غير محدد"}</p>
        </div>
        <div>
          <p className="text-sm text-neutral-500">المقاعد المتاحة:</p>
          <p className="font-medium">{availableSeats} من {course.capacity}</p>
        </div>
        
        {course.description && (
          <div>
            <p className="text-sm text-neutral-500">الوصف:</p>
            <p className="text-sm line-clamp-3">{course.description}</p>
          </div>
        )}
        
        {course.location && (
          <div>
            <p className="text-sm text-neutral-500">الموقع:</p>
            <p className="font-medium">{course.location}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button
          onClick={onEnroll}
          disabled={availableSeats <= 0 || course.status === 'completed'}
          >
          {course.status === 'completed' 
            ? "الدورة منتهية" 
            : course.status === 'upcoming'
            ? "التسجيل المبكر (قادمة)"
            : availableSeats > 0 
            ? "التسجيل في الدورة" 
            : "لا توجد مقاعد متاحة"
          }
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CourseCard;
