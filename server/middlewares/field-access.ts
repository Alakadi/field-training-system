import { Request, Response, NextFunction } from "express";

// تعريف الحقول الحساسة لكل جدول
export const SENSITIVE_FIELDS = {
  users: {
    password: ["admin"], // كلمة المرور تظهر للمدير فقط
    email: ["admin", "supervisor"], // الايميل يظهر للمدير والمشرف
    phone: ["admin", "supervisor"], // الهاتف يظهر للمدير والمشرف
  },
  students: {
    universityId: ["admin", "supervisor"], // الرقم الجامعي يظهر للمدير والمشرف فقط
    "user.email": ["admin", "supervisor"], // بيانات الاتصال في الكائن المدمج
    "user.phone": ["admin", "supervisor"],
    "user.password": ["admin"], // كلمة المرور للمدير فقط
  },
  supervisors: {
    "user.email": ["admin"], // بيانات المشرف الشخصية للمدير فقط
    "user.phone": ["admin"],
    "user.password": ["admin"], // كلمة المرور للمدير فقط
    department: ["admin", "supervisor"], // القسم يظهر للمدير والمشرف نفسه
  },
  trainingAssignments: {
    attendanceGrade: ["admin", "supervisor"], // الدرجات يراها المدير والمشرف فقط
    behaviorGrade: ["admin", "supervisor"],
    finalExamGrade: ["admin", "supervisor"],
    calculatedFinalGrade: ["admin", "supervisor", "student"], // الدرجة النهائية يراها الطالب أيضاً
  }
};

// تعريف الحقول الخاصة بكل دور
export const ROLE_SPECIFIC_FIELDS = {
  admin: {
    // المدير يرى كل شيء
    canViewAll: true,
    restrictedFields: [] as string[]
  },
  supervisor: {
    // المشرف لا يرى كلمات المرور وبعض البيانات الإدارية
    canViewAll: false,
    restrictedFields: ["password", "createdBy", "adminNotes"]
  },
  student: {
    // الطالب يرى بياناته الشخصية ودرجاته فقط
    canViewAll: false,
    restrictedFields: ["password", "email", "phone", "universityId", "attendanceGrade", "behaviorGrade", "finalExamGrade", "user.password", "user.email", "user.phone"]
  }
};

// دالة لتنظيف البيانات حسب دور المستخدم
export function filterSensitiveData(data: any, userRole: string, tableName: string = 'users'): any {
  if (!data) return data;
  
  // إذا كان المستخدم مدير، يرى كل شيء
  if (userRole === 'admin') {
    return data;
  }

  // إذا كانت البيانات مصفوفة، طبق الفلترة على كل عنصر
  if (Array.isArray(data)) {
    return data.map(item => filterSensitiveData(item, userRole, tableName));
  }

  // إذا كان كائن، قم بفلترة الحقول الحساسة
  const filtered = JSON.parse(JSON.stringify(data)); // Deep copy
  const roleConfig = ROLE_SPECIFIC_FIELDS[userRole as keyof typeof ROLE_SPECIFIC_FIELDS];
  
  if (roleConfig && !roleConfig.canViewAll) {
    // احذف الحقول المحظورة
    roleConfig.restrictedFields.forEach(field => {
      // التعامل مع الحقول المدمجة (مثل user.email)
      if (field.includes('.')) {
        const [parentField, childField] = field.split('.');
        if (filtered[parentField] && filtered[parentField][childField] !== undefined) {
          delete filtered[parentField][childField];
        }
      } else {
        // التعامل مع الحقول البسيطة
        if (filtered[field] !== undefined) {
          delete filtered[field];
        }
      }
    });
  }

  // تطبيق قواعد الحقول الحساسة المخصصة
  const tableSensitiveFields = SENSITIVE_FIELDS[tableName as keyof typeof SENSITIVE_FIELDS];
  if (tableSensitiveFields) {
    Object.keys(tableSensitiveFields).forEach(field => {
      const allowedRoles = tableSensitiveFields[field as keyof typeof tableSensitiveFields];
      if (!allowedRoles.includes(userRole)) {
        // التعامل مع الحقول المدمجة (مثل user.email)
        if (field.includes('.')) {
          const [parentField, childField] = field.split('.');
          if (filtered[parentField] && filtered[parentField][childField] !== undefined) {
            delete filtered[parentField][childField];
          }
        } else {
          // التعامل مع الحقول البسيطة
          if (filtered[field] !== undefined) {
            delete filtered[field];
          }
        }
      }
    });
  }

  return filtered;
}

// Middleware لتطبيق فلترة البيانات على الاستجابات
export const applyFieldAccessControl = (tableName: string = 'users') => {
  return (req: Request, res: Response, next: NextFunction) => {
    // حفظ الدالة الأصلية
    const originalJson = res.json;
    
    // استبدال دالة json لتطبيق الفلترة
    res.json = function(data: any) {
      if (req.user) {
        const filteredData = filterSensitiveData(data, req.user.role, tableName);
        return originalJson.call(this, filteredData);
      }
      return originalJson.call(this, data);
    };
    
    next();
  };
};