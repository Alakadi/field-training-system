import { pgTable, text, serial, integer, boolean, timestamp, date, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
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
  supervisorId: integer("supervisor_id").references(() => supervisors.id),
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
  siteId: integer("site_id").notNull().references(() => trainingSites.id),
  facultyId: integer("faculty_id").references(() => faculties.id),
  supervisorId: integer("supervisor_id").references(() => supervisors.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  description: text("description"),
  capacity: integer("capacity").default(20),
  location: text("location"),
  status: text("status").default("active"), // "active", "upcoming", "completed"
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// Training Assignments table
export const trainingAssignments = pgTable("training_assignments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id),
  courseId: integer("course_id").notNull().references(() => trainingCourses.id),
  assignedBySupervisorId: integer("assigned_by_supervisor_id").references(() => supervisors.id),
  assignedByAdminId: integer("assigned_by_admin_id").references(() => users.id),
  status: text("status").default("pending"), // "pending", "active", "completed"
  confirmed: boolean("confirmed").default(false), // Student confirmation
  assignedAt: timestamp("assigned_at").defaultNow(),
}, (table) => {
  return {
    studentCourseUnique: uniqueIndex("student_course_unique").on(table.studentId, table.courseId),
  };
});

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

// Activity Logs table
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(), // e.g. "create", "update", "delete"
  entityType: text("entity_type").notNull(), // e.g. "student", "course", "assignment"
  entityId: integer("entity_id"), // ID of the affected entity
  details: jsonb("details"), // JSON details about the activity
  ipAddress: text("ip_address"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertFacultySchema = createInsertSchema(faculties);
export const insertMajorSchema = createInsertSchema(majors);
export const insertLevelSchema = createInsertSchema(levels);
export const insertSupervisorSchema = createInsertSchema(supervisors);
export const insertStudentSchema = createInsertSchema(students);
export const insertTrainingSiteSchema = createInsertSchema(trainingSites);
export const insertTrainingCourseSchema = createInsertSchema(trainingCourses);
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

export type Supervisor = typeof supervisors.$inferSelect;
export type InsertSupervisor = z.infer<typeof insertSupervisorSchema>;

export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

export type TrainingSite = typeof trainingSites.$inferSelect;
export type InsertTrainingSite = z.infer<typeof insertTrainingSiteSchema>;

export type TrainingCourse = typeof trainingCourses.$inferSelect;
export type InsertTrainingCourse = z.infer<typeof insertTrainingCourseSchema>;

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
