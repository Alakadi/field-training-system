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
- July 19, 2025: إصلاح جميع مشاكل قاعدة البيانات وتحسين أداء النظام
  - إصلاح خطأ اتصال قاعدة البيانات بتبديل لـ node-postgres للاستقرار
  - حل مشكلة عدم ظهور أسماء المشرفين وجهات التدريب في صفحة عرض الكورس
  - إصلاح أخطاء الأعمدة المفقودة في جداول activity_logs و evaluations (timestamp, score, comments)
  - تحديث API endpoint /api/training-courses/:id/complete ليشمل تفاصيل المشرف والموقع مع كل مجموعة
  - تطبيق نظام unified endpoint للكورس الكامل بدلاً من 4 استدعاءات منفصلة لتحسين الأداء
  - ضمان عمل النظام بشكل مستقر مع عرض جميع البيانات التجريبية بشكل صحيح
- July 18, 2025: إصلاح مشكلة تداخل درجات الطلاب بين المجموعات المختلفة في صفحة إدارة الكورسات
  - تحديث منطق إدارة الدرجات لاستخدام مفتاح مجمع (studentId_groupId) بدلاً من studentId فقط
  - إصلاح دالة getCurrentDetailedGrade لتدعم groupId لمنع التداخل بين المجموعات
  - تحديث handleDetailedGradeChange لتستخدم مفتاح مجمع يشمل معرف المجموعة
  - إصلاح hasDetailedGradeChanged و hasUnsavedChanges للعمل مع المفتاح المجمع
  - تحديث saveAllDetailedGrades لتعمل مع النظام الجديد
  - إصلاح دالة إلغاء التغييرات لتعمل على المجموعة المحددة فقط
  - عزل حالة الدرجات لكل مجموعة بشكل منفصل لمنع ظهور الدرجات في مجموعات أخرى
- July 17, 2025: إنشاء قاعدة البيانات الكاملة وإضافة البيانات التجريبية
  - إنشاء جميع الجداول المطلوبة للنظام باستخدام PostgreSQL
  - إضافة المسؤول الرئيسي (admin/admin123) مع صلاحيات كاملة
  - إضافة 4 كليات و 6 تخصصات متنوعة
  - إضافة 5 مستويات دراسية و 2 سنة دراسية
  - إضافة 5 مواقع تدريب مختلفة (مستشفيات، شركات، مصانع)
  - إضافة 5 مشرفين مع بيانات تفصيلية لكل قسم
  - إضافة 10 طلاب موزعين على الكليات والتخصصات
  - إضافة 4 دورات تدريبية مع 6 مجموعات تدريبية
  - إضافة 10 تعيينات تدريبية مع درجات مفصلة (حضور، سلوك، اختبار نهائي)
  - إضافة 5 تقييمات للطلاب مع تعليقات المشرفين
  - إصلاح مشكلة الاتصال بقاعدة البيانات وتطبيق البيانات التجريبية
- July 17, 2025: تنفيذ نظام توزيع الدرجات المخصص وتسميات الحقول القابلة للتخصيص
  - تحديث API لحساب الدرجة النهائية باستخدام النسب المخصصة لكل دورة
  - تحديث واجهة المشرف للدرجات المفصلة لعرض التسميات والنسب المخصصة
  - تحديث رؤوس الجداول لتعكس تسميات الحقول المخصصة
  - تحديث دوال حساب الدرجة النهائية لتستخدم النسب المخصصة
  - تحديث تحقق الدرجات في API ليقبل قيم من 0-100 بدلاً من النسب الثابتة
  - تحديث `createTrainingCourseWithGroups` لإضافة القيم الافتراضية للحقول الجديدة
  - تحديث جميع واجهات إدخال الدرجات لتعكس التسميات والنسب المخصصة
  - ضمان التوافق مع النسب الافتراضية (حضور 20%، سلوك 30%، اختبار نهائي 50%)
- July 14, 2025: حذف نظام التحكم في الحقول وإصلاح قسم الأنشطة الأخيرة
  - حذف صفحة التحكم في الحقول (/admin/field-access-demo) حسب طلب المستخدم
  - إزالة رابط "نظام التحكم في الحقول" من القائمة الجانبية للمسؤول
  - تحديث قسم "آخر النشاطات" في الصفحة الرئيسية لاستخدام البيانات الحقيقية
  - ربط قسم النشاطات بـ API الأنشطة الفعلية (/api/activity-logs)
  - إضافة عرض تفصيلي للأنشطة مع أسماء المستخدمين وتواريخ النشاط
  - إضافة رابط "عرض كل النشاطات" يؤدي إلى صفحة سجل النشاطات الكاملة
  - تحسين عرض حالة التحميل وحالة عدم وجود نشاطات

- July 13, 2025: إعادة تنظيم نظام تسجيل الأنشطة الأمنية وتحسين الحماية
  - تحويل جميع استدعاءات logActivity إلى logSecurityActivity للأنشطة الأمنية الهامة
  - فصل تسجيل الأنشطة الأمنية عن الإشعارات لتجنب التكرار في سجل النشاطات
  - إضافة فلترة للأنشطة الأمنية فقط في صفحة سجل النشاطات (isNotification = false)
  - منع المشرفين من إدخال الدرجات للدورات التدريبية التي لم تبدأ بعد (upcoming status)
  - تحديث صفحات الدرجات المفصلة والعادية لتطبيق منع إدخال الدرجات للدورات القادمة
  - تحسين middleware حماية الحقول الحساسة لتتضمن المزيد من الحماية للبيانات الشخصية
  - إضافة تنبيهات مرئية واضحة عند محاولة إدخال الدرجات للدورات غير المتاحة

- July 10, 2025: دمج نظام الإشعارات مع activity_logs - نظام موحد للأنشطة والإشعارات
  - إلغاء جدول notifications منفصل واستخدام activity_logs كنظام موحد
  - إضافة حقول جديدة لـ activity_logs: target_user_id, notification_title, notification_message, notification_type, is_read, is_notification
  - تحديث NotificationService لاستخدام النظام الجديد مع دوال مبسطة
  - تحديث واجهة المستخدم (notification bell) لتتوافق مع النموذج الجديد
  - تطبيق الإشعارات التلقائية عند إدخال الدرجات وتعيين المشرفين والطلاب
  - تبسيط هيكل قاعدة البيانات بإزالة التكرار وتوحيد تسجيل الأنشطة والإشعارات

- July 8, 2025: إصلاح مشكلة تسجيل الدخول وتحسين آلية التحقق من كلمة المرور
  - إصلاح دالة login في storage.ts لتتحقق من كلمة المرور بشكل صحيح
  - تبسيط كود تسجيل الدخول في routes.ts وإزالة الآلية المضاعفة
  - تحسين رسائل الأخطاء وإضافة التصحيح للمساعدة في حل المشاكل
  - التأكد من أن النظام يتحقق من حالة الحساب النشط قبل السماح بتسجيل الدخول

- July 7, 2025: إكمال تحسينات نظام إدارة التدريب الميداني
  - تحسين نظام الإشعارات المركز: إشعارات المسؤول للدرجات والدورات المنتهية، إشعارات المشرف للمجموعات المنتهية والتعيينات الجديدة، إشعارات الطالب للدرجات الجديدة
  - إضافة وظيفة الحذف للمشرفين: حذف الطلاب والمشرفين والدورات التدريبية مع حوارات التأكيد
  - تحسين فلترة التقارير: إظهار الطلاب المُقيمين فقط مع فلترة السنة الدراسية
  - تعزيز عرض البيانات: إظهار أسماء المشرفين ومواقع التدريب في بطاقات الدورات

- July 5, 2025: إضافة دعم التشغيل المحلي وحل مشكلة المنفذ 8080
  - إنشاء ملفات إعداد للبيئة المحلية: .env.example, LOCAL_SETUP.md, README-LOCAL.md
  - إضافة سكريبت إعداد محلي: scripts/setup-local.js
  - إنشاء سكريبتات تشغيل للأنظمة المختلفة: run-local.sh (Linux/Mac), run-local.bat (Windows)
  - توثيق شامل للاختلافات بين البيئة المحلية والمستضافة
  - حل مشكلة تشغيل النظام على المنفذ 8080 محلياً
  - إضافة تعليمات مفصلة لإعداد قاعدة البيانات المحلية
  - توضيح خطوات حل المشاكل الشائعة في التشغيل المحلي

- July 5, 2025: إصلاح مشكلة الإشعارات وتحديث النظام الكامل
  - إنشاء جدول الإشعارات المفقود في قاعدة البيانات
  - إضافة جميع الجداول المطلوبة: academic_years, activity_logs, training_course_groups
  - إضافة بيانات تجريبية شاملة: 5 مواقع تدريب، 3 دورات تدريبية، 5 مجموعات تدريبية
  - إضافة 10 إشعارات تجريبية موزعة على جميع الأدوار (مسؤول، مشرف، طلاب)
  - تفعيل نظام الإشعارات في الواجهة مع جرس الإشعارات
  - إضافة تعيينات تدريبية وتقييمات للطلاب
  - إضافة سنوات دراسية وربطها بالنظام
  - إصلاح كلمات المرور المشفرة للمستخدمين
  - تحديث قاعدة البيانات لتشمل جميع الجداول والبيانات المطلوبة

- July 4, 2025: تفعيل نظام إدارة الحسابات النشطة وغير النشطة للمشرفين والطلاب
  - إضافة التحقق من الحالة النشطة في عملية تسجيل الدخول مع رسالة خطأ واضحة: "تم إلغاء تنشيط حسابك، يرجى مراجعة مدير النظام"
  - إضافة أزرار تفعيل/إلغاء تفعيل في صفحات إدارة المشرفين والطلاب مع أيقونات مميزة
  - إنشاء API endpoints جديدة: PUT /api/supervisors/:id/toggle-active و PUT /api/students/:id/toggle-active
  - إضافة أيقونات UserCheck و UserX للتمييز بين حالات التفعيل وإلغاء التفعيل
  - تحديث عرض حالة المستخدمين بألوان مختلفة (أخضر للنشط، رمادي لغير النشط)
  - إضافة تسجيل النشاطات عند تغيير حالة المستخدمين
  - إنشاء قاعدة البيانات الكاملة مع جميع الجداول المطلوبة والبيانات التجريبية

- July 2, 2025: ربط نظام عرض الدرجات بالدرجات الفعلية المدخلة من المشرف
  - تحديث API endpoint للتقييمات (/api/students/:id/evaluations) لإرجاع بيانات الدرجات المفصلة حتى بدون تقييم نهائي
  - تحديث API endpoint للتقارير (/api/reports/students) لإدراج الدرجات المفصلة الفعلية (attendanceGrade, behaviorGrade, finalExamGrade, calculatedFinalGrade)
  - إصلاح عرض الدرجات في صفحة عرض الطالب لتظهر الدرجات الحقيقية: الحضور 19/20، السلوك 18/30، الاختبار النهائي 45/50، المجموع النهائي 31.7/100
  - إصلاح عرض الدرجات في صفحة التقارير لتظهر الدرجة النهائية المحسوبة بدلاً من درجة التقييم التقليدية
  - إضافة حقول hasDetailedGrades و hasEvaluations للتمييز بين أنواع البيانات المتوفرة
  - ضمان عرض جميع الطلاب الذين لديهم درجات مفصلة حتى لو لم يكملوا التقييم النهائي

- July 1, 2025: تطبيق النظام التلقائي لحساب تواريخ الكورسات وتعيين السنة الدراسية
  - إضافة حساب تلقائي لتاريخ بدء الكورس من أقرب تاريخ بدء مجموعة
  - إضافة حساب تلقائي لتاريخ انتهاء الكورس من أبعد تاريخ انتهاء مجموعة
  - تطبيق تعيين تلقائي للكورسات في السنة الدراسية المناسبة بناءً على تاريخ البدء
  - إزالة حقل السنة الدراسية من نموذج إنشاء الكورسات (يتم تحديدها تلقائياً)
  - تحديث منطق createTrainingCourseWithGroups لتشمل الحسابات التلقائية
  - إضافة سجلات تفصيلية لعملية تعيين السنة الدراسية في console logs

- June 30, 2025: إضافة نظام السنوات الدراسية والدرجات المفصلة ونظام الإشعارات المحسن
  - إنشاء جداول قاعدة البيانات للسنوات الدراسية والإشعارات
  - إضافة نظام الدرجات المفصلة: درجة الحضور 20%، درجة السلوك 30%، الاختبار النهائي 50%
  - تطوير صفحة إدارة السنوات الدراسية للمسؤول (/admin/academic-years)
  - إنشاء صفحة الدرجات المفصلة للمشرف (/supervisor/detailed-grading)
  - تطوير نظام إشعارات محسن مع عرض الإشعارات غير المقروءة
  - إضافة حساب الدرجة النهائية التلقائي بناءً على النسب المئوية
  - تحديث قواعد البيانات لتشمل الدرجات المفصلة وربط الكورسات بالسنوات الدراسية
  - إصلاح مشاكل الأيقونات المفقودة في النظام
  - تحسين واجهات المستخدم لتشمل الوظائف الجديدة

- June 27, 2025: إضافة صفحة إدارة الكليات والتخصصات للمسؤول
  - إنشاء صفحة /admin/faculties لإدارة الكليات والتخصصات
  - إضافة إمكانية إنشاء وتعديل الكليات مع validation شامل
  - إضافة إمكانية إنشاء وتعديل التخصصات مع ربطها بالكليات
  - تطوير واجهة تفاعلية لعرض الكليات مع عدد التخصصات
  - إضافة جدول ملخص للكليات والتخصصات
  - تطوير API endpoints للكليات والتخصصات: GET, POST, PUT
  - إضافة رابط الصفحة الجديدة في قائمة تنقل المسؤول
  - دعم تسجيل النشاطات عند إضافة أو تعديل الكليات والتخصصات
  - تحسين نظام التصدير بدعم أفضل للعربية باستخدام Canvas

- June 27, 2025: إضافة نظام التصدير الشامل للبيانات مع دعم اللغة العربية
  - إنشاء نظام تصدير شامل يدعم Excel (.xlsx) و PDF (.pdf) والطباعة المباشرة
  - إضافة إمكانية تحديد الأعمدة المراد تصديرها بواجهة تفاعلية
  - دعم اختيار اتجاه الصفحة (عمودي/أفقي) لملفات PDF
  - حل مشكلة عرض النص العربي في PDF بنظام ترجمة للأحرف اللاتينية
  - تحسين وظيفة الطباعة مع دعم أفضل للنص العربي وإضافة معلومات الطباعة
  - إضافة مكونة ExportDialog قابلة للاستخدام في أي صفحة
  - تطبيق التصدير في صفحات: إدارة الطلاب، إدارة المشرفين، تقييمات الطلاب
  - إضافة أيقونات جديدة للتصدير والطباعة في نظام الأيقونات المحلية
  - دعم تنسيق البيانات المخصص (التواريخ، الدرجات، الحالات) في التصدير

- June 27, 2025: إكمال نظام الأيقونات المحلية للعمل بدون انترنت
  - إزالة جميع مراجع Google Material Icons الخارجية من التطبيق
  - إنشاء نظام أيقونات SVG محلية شاملة في client/src/components/ui/icons.tsx
  - تطوير نظام Icon map في client/src/components/ui/icon-map.tsx للوصول للأيقونات بالأسماء
  - تحديث جميع مكونات واجهة المستخدم لاستخدام الأيقونات المحلية
  - استبدال أكثر من 50 مرجع أيقونة خارجية بأيقونات SVG محلية
  - إزالة تبعية Material Icons من main.tsx لضمان العمل الكامل بدون انترنت
  - تحديث Header, Sidebar, Dashboard وجميع صفحات Admin/Supervisor/Student
  - ضمان عمل جميع الأيقونات في البيئة المحلية بدون اتصال بالانترنت

- June 25, 2025: تحسين صفحة إدراج الدرجات للمشرف وإضافة إمكانية التعديل
  - تحديث صفحة إدراج الدرجات لتشمل زر حفظ واحد لجميع الدرجات بدلاً من أزرار منفصلة
  - إضافة مؤشر للتغييرات غير المحفوظة مع تنبيه بصري وعداد للتغييرات
  - إنشاء API endpoint جديد (/api/students/grades/bulk) للحفظ الجماعي للدرجات
  - إضافة إمكانية تعديل الدرجات المحفوظة مسبقاً في حالة وجود أخطاء
  - تحسين واجهة المستخدم لإظهار الدرجة الحالية والدرجة الجديدة المُعدلة
  - إضافة تمييز بصري للحقول المُعدلة (لون خلفية مختلف)
  - إضافة زر "إلغاء التغييرات" لإعادة تعيين جميع التعديلات
  - إصلاح مشكلة إنشاء حسابات المشرفين مع إضافة validation أفضل وlogging للأخطاء
  - تحسين معالجة الأخطاء وإظهار رسائل خطأ واضحة للمستخدم

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