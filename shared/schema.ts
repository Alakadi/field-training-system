import { pgTable, text, serial, integer, boolean, timestamp, date, uniqueIndex, jsonb, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - common fields for all user types
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // "admin", "supervisor", "student"
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Faculties table
export const faculties = pgTable("faculties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

// Majors table
export const majors = pgTable("majors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  facultyId: integer("faculty_id").notNull().references(() => faculties.id),
});

// Study Levels table
export const levels = pgTable("levels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g. "First Level", "Second Level", etc.
});

// Academic Years table - إدارة السنوات الدراسية
export const academicYears = pgTable("academic_years", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // مثل "2024/2025"
  startDate: date("start_date").notNull(), // تاريخ بداية السنة الدراسية
  endDate: date("end_date").notNull(), // تاريخ نهاية السنة الدراسية
  isCurrent: boolean("is_current").default(false), // السنة الحالية
  createdAt: timestamp("created_at").defaultNow(),
});

// تم حذف جدول notifications - نستخدم activity_logs الآن للإشعارات والأنشطة معاً

// Supervisors table - extends users
export const supervisors = pgTable("supervisors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  facultyId: integer("faculty_id").references(() => faculties.id),
  department: text("department"),
});

// Students table - extends users
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  universityId: text("university_id").notNull().unique(), // University ID number
  facultyId: integer("faculty_id").references(() => faculties.id),
  majorId: integer("major_id").references(() => majors.id),
  levelId: integer("level_id").references(() => levels.id),
});

// Training Sites table
export const trainingSites = pgTable("training_sites", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
});

// Training Courses table
export const trainingCourses = pgTable("training_courses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  facultyId: integer("faculty_id").references(() => faculties.id),
  majorId: integer("major_id").references(() => majors.id), // ربط الدورة بتخصص معين
  levelId: integer("level_id").references(() => levels.id), // ربط الدورة بمستوى دراسي معين
  academicYearId: integer("academic_year_id").references(() => academicYears.id), // ربط بالسنة الدراسية
  description: text("description"),
  status: text("status").default("upcoming"), // "upcoming", "active", "completed", "cancelled", "registration_closed"
  // حقول نسب الدرجات القابلة للتعديل
  attendancePercentage: integer("attendance_percentage").default(20), // نسبة درجة الحضور (افتراضي 20%)
  behaviorPercentage: integer("behavior_percentage").default(30), // نسبة درجة السلوك (افتراضي 30%)
  finalExamPercentage: integer("final_exam_percentage").default(50), // نسبة درجة الاختبار النهائي (افتراضي 50%)
  // أسماء الحقول القابلة للتعديل
  attendanceGradeLabel: text("attendance_grade_label").default("درجة الحضور"), // تسمية درجة الحضور
  behaviorGradeLabel: text("behavior_grade_label").default("درجة السلوك"), // تسمية درجة السلوك
  finalExamGradeLabel: text("final_exam_grade_label").default("درجة الاختبار النهائي"), // تسمية درجة الاختبار النهائي
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// Training Course Groups table - تقسيم الدورات إلى مجموعات
export const trainingCourseGroups = pgTable("training_course_groups", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => trainingCourses.id),
  groupName: text("group_name").notNull(), // اسم المجموعة (مجموعة 1، مجموعة 2)
  siteId: integer("site_id").notNull().references(() => trainingSites.id),
  supervisorId: integer("supervisor_id").notNull().references(() => supervisors.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  capacity: integer("capacity").notNull().default(10), // العدد الأقصى للطلاب
  currentEnrollment: integer("current_enrollment").default(0), // العدد الحالي للطلاب المسجلين
  location: text("location"),
  status: text("status").default("active"), // "active", "full", "completed"
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("course_group_unique").on(table.courseId, table.groupName),
]);

// Training Assignments table - ربط الطلاب بالكورسات والمجموعات
export const trainingAssignments = pgTable("training_assignments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id),
  courseId: integer("course_id").notNull().references(() => trainingCourses.id), // ربط مباشر بالكورس
  groupId: integer("group_id").references(() => trainingCourseGroups.id), // ربط بالمجموعة (اختياري للمرونة)
  assignedBy: integer("assigned_by").references(() => users.id),
  status: text("status").default("pending"), // "pending", "active", "completed"
  confirmed: boolean("confirmed").default(false), // Student confirmation
  assignedAt: timestamp("assigned_at").defaultNow(),
  // الدرجات المفصلة
  attendanceGrade: numeric("attendance_grade", { precision: 5, scale: 2 }), // درجة الحضور (20%)
  behaviorGrade: numeric("behavior_grade", { precision: 5, scale: 2 }), // درجة السلوك (30%)
  finalExamGrade: numeric("final_exam_grade", { precision: 5, scale: 2 }), // درجة الاختبار النهائي (50%)
  calculatedFinalGrade: numeric("calculated_final_grade", { precision: 5, scale: 2 }), // الدرجة النهائية المحسوبة
}, (table) => [
  uniqueIndex("student_course_unique").on(table.studentId, table.courseId), // منع التسجيل المتكرر في نفس الكورس
]);

// Evaluations table
export const evaluations = pgTable("evaluations", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull().references(() => trainingAssignments.id),
  score: integer("score"), // 0-100
  comments: text("comments"),
  evaluatorName: text("evaluator_name"),
  evaluationDate: timestamp("evaluation_date").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// Activity Logs table - نظام موحد للأنشطة والإشعارات
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  username: text("username"), // اسم المستخدم الذي قام بالعملية
  action: text("action").notNull(), // e.g. "create", "update", "delete", "notification"
  entityType: text("entity_type").notNull(), // e.g. "student", "course", "assignment", "notification"
  entityId: integer("entity_id"), // ID of the affected entity
  details: jsonb("details"), // JSON details about the activity
  timestamp: timestamp("timestamp").defaultNow(),
  
  // حقول الإشعارات
  targetUserId: integer("target_user_id").references(() => users.id), // المستخدم المستهدف للإشعار
  notificationTitle: text("notification_title"), // عنوان الإشعار
  notificationMessage: text("notification_message"), // رسالة الإشعار
  notificationType: text("notification_type").default("info"), // info, warning, error, success
  isRead: boolean("is_read").default(false), // هل تم قراءة الإشعار
  isNotification: boolean("is_notification").default(false), // هل هذا السجل إشعار أم نشاط عادي
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertFacultySchema = createInsertSchema(faculties);
export const insertMajorSchema = createInsertSchema(majors);
export const insertLevelSchema = createInsertSchema(levels);
export const insertAcademicYearSchema = createInsertSchema(academicYears);
// تم حذف insertNotificationSchema - نستخدم insertActivityLogSchema للإشعارات
export const insertSupervisorSchema = createInsertSchema(supervisors);
export const insertStudentSchema = createInsertSchema(students);
export const insertTrainingSiteSchema = createInsertSchema(trainingSites);
export const insertTrainingCourseSchema = createInsertSchema(trainingCourses);
export const insertTrainingCourseGroupSchema = createInsertSchema(trainingCourseGroups);
export const insertTrainingAssignmentSchema = createInsertSchema(trainingAssignments);
export const insertEvaluationSchema = createInsertSchema(evaluations);
export const insertActivityLogSchema = createInsertSchema(activityLogs);

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Faculty = typeof faculties.$inferSelect;
export type InsertFaculty = z.infer<typeof insertFacultySchema>;

export type Major = typeof majors.$inferSelect;
export type InsertMajor = z.infer<typeof insertMajorSchema>;

export type Level = typeof levels.$inferSelect;
export type InsertLevel = z.infer<typeof insertLevelSchema>;

export type AcademicYear = typeof academicYears.$inferSelect;
export type InsertAcademicYear = z.infer<typeof insertAcademicYearSchema>;

// تم حذف types الخاصة بـ notifications - نستخدم ActivityLog types للإشعارات

export type Supervisor = typeof supervisors.$inferSelect;
export type InsertSupervisor = z.infer<typeof insertSupervisorSchema>;

export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

export type TrainingSite = typeof trainingSites.$inferSelect;
export type InsertTrainingSite = z.infer<typeof insertTrainingSiteSchema>;

export type TrainingCourse = typeof trainingCourses.$inferSelect;
export type InsertTrainingCourse = z.infer<typeof insertTrainingCourseSchema>;

export type TrainingCourseGroup = typeof trainingCourseGroups.$inferSelect;
export type InsertTrainingCourseGroup = z.infer<typeof insertTrainingCourseGroupSchema>;

export type TrainingAssignment = typeof trainingAssignments.$inferSelect;
export type InsertTrainingAssignment = z.infer<typeof insertTrainingAssignmentSchema>;

export type Evaluation = typeof evaluations.$inferSelect;
export type InsertEvaluation = z.infer<typeof insertEvaluationSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, { message: "يرجى إدخال اسم المستخدم أو الرقم الجامعي" }),
  password: z.string().min(1, { message: "يرجى إدخال كلمة المرور" }),
});

export type LoginData = z.infer<typeof loginSchema>;
