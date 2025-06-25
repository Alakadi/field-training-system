# Field Training Management System - Replit Documentation

## Overview

This is a comprehensive Arabic-supported field training management system built for universities to manage student field training. The system provides role-based access for administrators, supervisors, and students with full CRUD operations for managing training programs, student assignments, and evaluations.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: Radix UI primitives with custom Tailwind CSS styling
- **Styling**: Tailwind CSS with custom design system
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite with hot module replacement

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Session Management**: Express sessions with memory store (development) / PostgreSQL store (production)
- **Authentication**: Role-based authentication middleware
- **API Design**: RESTful API with consistent error handling

### Database Architecture
- **Primary Database**: PostgreSQL (configured for both local and cloud deployment)
- **ORM**: Drizzle ORM with TypeScript-first schema
- **Connection Handling**: Dual connection strategy - node-postgres for local development, NeonDB for production
- **Schema**: Comprehensive relational schema with proper foreign key relationships

## Key Components

### User Management
- Multi-role authentication system (admin, supervisor, student)
- Role-based access control with middleware protection
- Session-based authentication with secure cookie handling
- User profile management with faculty/department associations

### Academic Structure
- Faculty and major hierarchical organization
- Student level management system
- Supervisor-student assignment tracking
- Training site and course management

### Training Management
- Training course creation and scheduling
- Student assignment to training programs
- Progress tracking and status management
- Evaluation system with supervisor feedback

### Data Management
- Excel import/export functionality for bulk student data
- Activity logging system for audit trails
- Comprehensive reporting capabilities
- Data validation with Zod schemas

## Data Flow

### Authentication Flow
1. User accesses role-specific login page
2. Credentials validated against database
3. Session created with user role information
4. Role-based middleware protects subsequent requests
5. Frontend context manages authentication state

### Training Assignment Flow
1. Admin creates training courses and sites
2. Students browse and apply for available courses
3. Supervisors review and approve assignments
4. Training progress tracked through status updates
5. Evaluations completed by supervisors
6. Results accessible to students and admin

### Data Import Flow
1. Admin uploads Excel file with student data
2. Backend validates file format and content
3. Data processed and imported to database
4. Success/error feedback provided to user
5. Activity logged for audit purposes

## External Dependencies

### Production Dependencies
- **@neondatabase/serverless**: Cloud PostgreSQL connection
- **drizzle-orm**: Type-safe database ORM
- **express**: Web application framework
- **react**: Frontend UI library
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Accessible UI components
- **tailwindcss**: Utility-first CSS framework
- **react-hook-form**: Form handling library
- **zod**: Runtime type validation
- **date-fns**: Date manipulation utilities
- **xlsx**: Excel file processing

### Development Dependencies
- **vite**: Build tool and dev server
- **typescript**: Type checking and compilation
- **drizzle-kit**: Database migration tool
- **tsx**: TypeScript execution for development

## Deployment Strategy

### Development Environment
- Uses Vite dev server with HMR for frontend
- Node.js server with automatic restart via tsx
- Memory-based session storage for simplicity
- Local PostgreSQL connection via node-postgres

### Production Environment
- Static asset serving via Express
- Compiled TypeScript bundle via esbuild
- PostgreSQL session store for scalability
- NeonDB serverless connection for cloud deployment
- Replit autoscale deployment configuration

### Database Management
- Schema managed through Drizzle migrations
- Push-based deployment for rapid development
- Automated admin user creation on first deploy
- Environment-specific connection handling

## قاعدة البيانات والبيانات التجريبية

### معلومات الدخول للنظام
- **المسؤول**: اسم المستخدم: `admin` | كلمة المرور: `admin123`
- **المشرف**: اسم المستخدم: `supervisor1` | كلمة المرور: `password`
- **الطلاب**: أسماء المستخدمين: `student1` إلى `student5` | كلمة المرور: `password`

### البيانات المتوفرة
- **الكليات**: الهندسة وتقنية المعلومات، العلوم الطبية
- **التخصصات**: تقنية المعلومات، هندسة مدني، صيدلة، تغذية
- **المستويات**: المستوى الأول إلى الخامس
- **مواقع التدريب**: 5 مواقع تدريب متنوعة
- **الكورسات**: 4 كورسات تدريبية مع 6 مجموعات
- **الطلاب**: 25 طالب موزعين على التخصصات والمستويات
- **المشرفين**: 5 مشرفين مع بيانات كاملة

## Recent Changes
- June 25, 2025: إنشاء قاعدة البيانات PostgreSQL وتعبئة البيانات الأساسية والتجريبية
  - إنشاء قاعدة بيانات PostgreSQL جديدة باستخدام NeonDB
  - تطبيق جميع جداول قاعدة البيانات باستخدام Drizzle ORM
  - إضافة مسؤول النظام الرئيسي (admin/admin123)
  - إضافة الكليات والتخصصات الأساسية
  - إضافة 5 مستويات دراسية
  - إضافة 5 مواقع تدريب متنوعة
  - إضافة 5 مشرفين مع بيانات كاملة
  - إضافة 25 طالب موزعين على الكليات والتخصصات
  - إضافة 4 كورسات تدريبية مع 6 مجموعات
  - إضافة تعيينات الطلاب للمجموعات مع درجات تجريبية
  - إصلاح جميع مشاكل الاتصال بقاعدة البيانات
  - إصلاح مشكلة React Suspense في التنقل بين الصفحات

- June 24, 2025: تبسيط العلاقات في قاعدة البيانات وإضافة الربط المباشر بالكورسات
  - دمج حقلي assignedBySupervisorId و assignedByAdminId في حقل واحد assignedBy في trainingAssignments
  - إضافة courseId للربط المباشر بالكورس في trainingAssignments مع الحفاظ على groupId للمرونة
  - تبسيط جدول activityLogs بإزالة ربط userId وإضافة حقل username نصي بدلاً منه
  - إزالة حقل ipAddress من activityLogs لتقليل تعقيد البيانات المخزنة
  - إزالة حقل location المكرر من trainingCourses لأنه موجود في trainingCourseGroups
  - إضافة دوال جديدة للاستعلام المباشر حسب الكورس: getTrainingAssignmentsByCourse و isStudentEnrolledInCourse
  - تحديث جميع استدعاءات logActivity لتتماشى مع التبسيطات الجديدة
  - تحسين أداء قاعدة البيانات بتقليل عدد الجداول المرتبطة في العمليات الأساسية
  - تحديث جميع عمليات إنشاء التعيينات لاستخدام الربط المباشر بالكورس
  - تبسيط استعلامات حساب عدد الطلاب في الكورسات باستخدام courseId مباشرة
  - إضافة فحوصات سلامة البيانات لمنع التسجيل المتكرر في نفس الكورس فقط (يُسمح بالتسجيل في كورسات متعددة مختلفة)
  - توضيح المنطق: الطالب يمكنه التسجيل في عدة كورسات مختلفة، لكن لا يمكن التسجيل مرتين في نفس الكورس
  - تحسين رسائل الخطأ لتوضح للمستخدم أنه يمكن التسجيل في كورسات أخرى
  - إضافة نظام إدارة حالة الكورسات التلقائية بناءً على تواريخ المجموعات المحددة
  - تطبيق فلترة مخصصة للكورسات حسب دور المستخدم: الطلاب يرون فقط الكورسات المتاحة + المسجلين فيها
  - منع التسجيل في الكورسات المنتهية تلقائياً
  - تحديث حالات الكورسات قبل كل عملية تسجيل أو استعلام
  - إزالة حقل الحالة من نماذج إنشاء الدورات - الحالة تُحدد تلقائياً من تواريخ المجموعات
  - تحديث الحالة فور إنشاء الدورة والمجموعات
  - إضافة تسمية "تلقائية" لعرض الحالات للمسؤولين للإشارة أنها محسوبة تلقائياً
  - إنشاء نظام جدولة يومية لتحديث حالة الكورسات (كل 24 ساعة)
  - تحسين الأداء بتجنب التحديث المتكرر في كل طلب API
  - إضافة API endpoints لمراقبة حالة التحديث والتحديث الفوري للمسؤولين
  - تحديث تلقائي عند بدء تشغيل الخادم وإيقاف آمن عند الإغلاق

- June 23, 2025: إضافة نظام إلغاء التسجيل والتحويل بين المجموعات
  - إضافة API endpoint لإلغاء التسجيل في مجموعة معينة (/api/training-assignments/group/:groupId)
  - تطوير واجهة إلغاء التسجيل في صفحة الدورات للطلاب
  - إضافة زر "إلغاء التسجيل" للطلاب المسجلين في المجموعات
  - تطوير ميزة "تحويل للمجموعة" للانتقال من مجموعة لأخرى في نفس الدورة
  - إضافة زر "إلغاء التسجيل الحالي" للطلاب المسجلين في مجموعة أخرى
  - تحسين واجهة المستخدم لعرض خيارات التسجيل والإلغاء بشكل واضح
  - ضمان منع التسجيل في مجموعات متعددة لنفس الدورة مع إمكانية التحويل

- June 23, 2025: إضافة صفحة عرض تفاصيل المجموعة مع جدول الطلاب والدرجات
  - إنشاء صفحة /admin/view-group/:groupId لعرض تفاصيل المجموعة التدريبية
  - إضافة زر "عرض تفاصيل المجموعة" في بطاقات المجموعات
  - عرض معلومات المجموعة والكورس وموقع التدريب والمشرف
  - جدول تفصيلي للطلاب المسجلين مع حالة التسجيل والدرجات
  - إضافة API endpoint لجلب تفاصيل المجموعة مع البيانات المرتبطة
  - إصلاح مشاكل التسجيل المتكرر ومنع تسجيل الطالب في مجموعات متعددة لنفس الكورس

- June 22, 2025: تطوير نظام إضافة الطلاب للكورسات مع اختيار المجموعة المحددة
  - تطوير نافذة إضافة الطلاب في صفحة الدورات التدريبية لتشمل اختيار المجموعة المحددة
  - إضافة عرض المجموعات المتاحة مع تفاصيل السعة والمقاعد الشاغرة
  - تحسين التحقق من السعة المتاحة قبل إضافة الطلاب
  - عرض معلومات المشرف وموقع التدريب لكل مجموعة
  - إضافة منع إضافة الطلاب للمجموعات الممتلئة
  - تطوير صفحة منفصلة لتعيين الطلاب للمجموعات (/admin/student-group-assignments)
  - إصلاح مشاكل قاعدة البيانات وإضافة البيانات التجريبية الكاملة

- June 21, 2025: تنظيف واجهة المسؤول وإضافة بيانات العينة
  - حذف نافذة "مستويات الطلاب" من قائمة تنقل المسؤول
  - حذف نافذة "تعيين الكورسات" من قائمة تنقل المسؤول
  - إضافة 5 مستويات دراسية (المستوى الأول - الخامس)
  - إضافة 5 مواقع تدريب (مستشفى الملك فهد، أرامكو، سابك، STC، الراجحي)
  - إضافة 5 مشرفين مع كامل البيانات
  - إضافة 25 طالب موزعين على الكليات والتخصصات والمستويات
  - إضافة 5 كورسات تدريبية مع 10 مجموعات تدريبية
  - تحسين عرض المجموعات التدريبية في صفحة المشرف مع البيانات الأكاديمية

- June 19, 2025: تطوير نظام تعيين الطلاب للكورسات بدلاً من المشرفين
  - إنشاء صفحة /admin/student-assignments لتعيين الطلاب للكورسات التدريبية
  - إضافة فلترة متقدمة بناءً على الكلية والتخصص والمستوى الدراسي
  - تحديث API endpoints لدعم فلترة مجموعات الكورسات حسب البيانات الأكاديمية
  - إضافة حقل levelId لجدول training_courses في قاعدة البيانات
  - تطوير واجهة عرض الكورسات المتاحة مع عدد المقاعد الشاغرة

- June 18, 2025: أنشاء واجهة إدارة الكورسات للمشرف بدلاً من واجهة الطلاب
  - تم إضافة صفحة /supervisor/courses تحتوي على المجموعات المسندة للمشرف
  - عرض معلومات الكورس مع تواريخ البدء والانتهاء وبيانات الدورة
  - جدول بأسماء الطلاب في كل مجموعة مع إمكانية إدراج الدرجات
  - واجهة تقييم الطلاب مع نظام حفظ الدرجات
  - تحديث navigation للمشرف لتشمل "إدارة الكورسات" بدلاً من "طلابي"

## Changelog
- June 18, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.