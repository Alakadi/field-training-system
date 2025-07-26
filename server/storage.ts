import {
  users,
  faculties,
  majors,
  levels,
  academicYears,
  supervisors,
  students,
  trainingSites,
  trainingCourses,
  trainingCourseGroups,
  trainingAssignments,

  activityLogs,
  type User,
  type InsertUser,
  type Faculty,
  type InsertFaculty,
  type Major,
  type InsertMajor,
  type Level,
  type InsertLevel,
  type AcademicYear,
  type InsertAcademicYear,
  type Supervisor,
  type InsertSupervisor,
  type Student,
  type InsertStudent,
  type TrainingSite,
  type InsertTrainingSite,
  type TrainingCourse,
  type InsertTrainingCourse,
  type TrainingCourseGroup,
  type InsertTrainingCourseGroup,
  type TrainingAssignment,
  type InsertTrainingAssignment,

  type ActivityLog,
  type InsertActivityLog,
  LoginData
} from "@shared/schema";
import { eq, and, desc, sql, or, isNull, gte, lte, count } from "drizzle-orm";
import { db } from "./db";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  login(loginData: LoginData): Promise<User | undefined>;

  // Activity logs operations
  getAllActivityLogs(): Promise<ActivityLog[]>;
  getActivityLog(id: number): Promise<ActivityLog | undefined>;
  logActivity(insertLog: InsertActivityLog): Promise<ActivityLog>;

  // Faculty operations
  getAllFaculties(): Promise<Faculty[]>;
  getFaculty(id: number): Promise<Faculty | undefined>;
  createFaculty(faculty: InsertFaculty): Promise<Faculty>;
  updateFaculty(id: number, faculty: Partial<Faculty>): Promise<Faculty | undefined>;

  // Major operations
  getAllMajors(): Promise<Major[]>;
  getMajor(id: number): Promise<Major | undefined>;
  createMajor(major: InsertMajor): Promise<Major>;
  updateMajor(id: number, major: Partial<Major>): Promise<Major | undefined>;
  getMajorsByFaculty(facultyId: number): Promise<Major[]>;

  // Level operations
  getAllLevels(): Promise<Level[]>;
  getLevel(id: number): Promise<Level | undefined>;
  createLevel(level: InsertLevel): Promise<Level>;

  // Supervisor operations
  getAllSupervisors(): Promise<Supervisor[]>;
  getSupervisor(id: number): Promise<Supervisor | undefined>;
  getSupervisorByUserId(userId: number): Promise<Supervisor | undefined>;
  createSupervisor(supervisor: InsertSupervisor): Promise<Supervisor>;
  updateSupervisor(id: number, supervisor: Partial<Supervisor>, userData?: Partial<User>): Promise<Supervisor | undefined>;
  getSupervisorWithUser(id: number): Promise<(Supervisor & { user: User }) | undefined>;
  deleteSupervisor(id: number): Promise<void>;
  getActiveAssignmentsBySupervisor(supervisorId: number): Promise<TrainingAssignment[]>;

  // Student operations
  getAllStudents(): Promise<Student[]>;
  getStudent(id: number): Promise<Student | undefined>;
  getStudentByUniversityId(universityId: string): Promise<Student | undefined>;
  getStudentByUserId(userId: number): Promise<Student | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: number, student: Partial<Student>, userData?: Partial<User>): Promise<Student | undefined>;
  getStudentWithDetails(id: number): Promise<(Student & { user: User, faculty?: Faculty, major?: Major, level?: Level }) | undefined>;
  getStudentsByFaculty(facultyId: number): Promise<Student[]>;
  getStudentsBySupervisorThroughGroups(supervisorId: number): Promise<(Student & { user: User, faculty?: Faculty, major?: Major, level?: Level })[]>;
  deleteStudent(id: number): Promise<void>;
  getActiveAssignmentsByStudent(studentId: number): Promise<TrainingAssignment[]>;

  // Training Site operations
  getAllTrainingSites(): Promise<TrainingSite[]>;
  getTrainingSite(id: number): Promise<TrainingSite | undefined>;
  getTrainingSiteById(id: number): Promise<TrainingSite | undefined>;
  createTrainingSite(site: InsertTrainingSite): Promise<TrainingSite>;
  updateTrainingSite(id: number, site: Partial<InsertTrainingSite>): Promise<TrainingSite | undefined>;
  deleteTrainingSite(id: number): Promise<void>;
  getTrainingGroupsBySite(siteId: number): Promise<any[]>;

  // Training Course operations
  getAllTrainingCourses(): Promise<TrainingCourse[]>;
  getTrainingCourse(id: number): Promise<TrainingCourse | undefined>;
  createTrainingCourse(course: InsertTrainingCourse): Promise<TrainingCourse>;
  createTrainingCourseWithGroups(course: InsertTrainingCourse, groups: any[]): Promise<{ course: TrainingCourse, groups: TrainingCourseGroup[] }>;
  getTrainingCourseWithDetails(id: number): Promise<(TrainingCourse & { faculty?: Faculty, major?: Major }) | undefined>;
  getTrainingCoursesByFaculty(facultyId: number): Promise<TrainingCourse[]>;
  getTrainingCoursesByMajor(majorId: number): Promise<TrainingCourse[]>;
  deleteTrainingCourse(id: number): Promise<void>;
  updateTrainingCourse(id: number, data: Partial<InsertTrainingCourse>): Promise<TrainingCourse | undefined>;

  // Training Course Group operations
  getAllTrainingCourseGroups(): Promise<TrainingCourseGroup[]>;
  getTrainingCourseGroup(id: number): Promise<TrainingCourseGroup | undefined>;
  createTrainingCourseGroup(group: InsertTrainingCourseGroup): Promise<TrainingCourseGroup>;
  getTrainingCourseGroupsByCourse(courseId: number): Promise<TrainingCourseGroup[]>;
  getTrainingCourseGroupsWithAvailableSpots(majorId?: number): Promise<(TrainingCourseGroup & { 
    course: TrainingCourse, 
    site: TrainingSite, 
    supervisor: Supervisor & { user: User },
    availableSpots: number 
  })[]>;
  updateTrainingCourseGroup(id: number, data: Partial<InsertTrainingCourseGroup>): Promise<TrainingCourseGroup | undefined>;
  updateGroupEnrollment(groupId: number, newEnrollment: number): Promise<TrainingCourseGroup | undefined>;
  getTrainingCourseGroupWithStudents(groupId: number): Promise<(TrainingCourseGroup & {
    course: TrainingCourse,
    site: TrainingSite,
    supervisor: Supervisor & { user: User },
    students: (Student & { user: User })[]
  }) | undefined>;
  getCoursesWithGroups(): Promise<(TrainingCourse & {
    faculty?: Faculty,
    major?: Major,
    level?: Level,
    groups: (TrainingCourseGroup & {
      site: TrainingSite,
      supervisor: Supervisor & { user: User },
      currentEnrollment: number
    })[]
  })[]>;

  // Training Assignment operations
  getAllTrainingAssignments(): Promise<TrainingAssignment[]>;
  getTrainingAssignment(id: number): Promise<TrainingAssignment | undefined>;
  createTrainingAssignment(assignment: InsertTrainingAssignment): Promise<TrainingAssignment>;
  deleteTrainingAssignment(id: number): Promise<void>;
  getTrainingAssignmentsByStudent(studentId: number): Promise<TrainingAssignment[]>;
  getTrainingAssignmentsByGroup(groupId: number): Promise<TrainingAssignment[]>;
  getTrainingAssignmentsByCourse(courseId: number): Promise<TrainingAssignment[]>;
  isStudentEnrolledInCourse(studentId: number, courseId: number): Promise<boolean>;
  getTrainingAssignmentWithDetails(id: number): Promise<(TrainingAssignment & { 
    student: Student & { user: User }, 
    group: TrainingCourseGroup & { 
      course: TrainingCourse, 
      site: TrainingSite, 
      supervisor: Supervisor & { user: User } 
    } 
  }) | undefined>;
  confirmTrainingAssignment(id: number): Promise<TrainingAssignment | undefined>;

  // Evaluation operations are now handled through training assignments table

  // Update course status
  updateCourseStatus(courseId: number, status: string): Promise<TrainingCourse | undefined>;

  // Update course status based on dates
  updateCourseStatusBasedOnDates(): Promise<void>;

  // Academic Years operations
  getAllAcademicYears(): Promise<AcademicYear[]>;
  getAcademicYear(id: number): Promise<AcademicYear | undefined>;
  createAcademicYear(academicYear: InsertAcademicYear): Promise<AcademicYear>;
  updateAcademicYear(id: number, academicYear: Partial<AcademicYear>): Promise<AcademicYear | undefined>;
  setAllAcademicYearsNonCurrent(): Promise<void>;

  // Unified Activity/Notification operations
  getAllNotifications(): Promise<ActivityLog[]>;
  getNotificationsByUserId(userId: number): Promise<ActivityLog[]>;
  createNotification(userId: number, title: string, message: string, type?: string, performedBy?: string): Promise<ActivityLog>;
  markNotificationAsRead(id: number, userId: number): Promise<ActivityLog | undefined>;
  getUnreadNotificationCount(userId: number): Promise<number>;
  getTrainingAssignmentById(id: number): Promise<TrainingAssignment | undefined>;
  getStudentById(id: number): Promise<(Student & { user?: User }) | undefined>;

  // Training Assignment Grades operations
  updateTrainingAssignmentGrades(assignmentId: number, grades: {
    attendanceGrade?: number;
    behaviorGrade?: number;
    finalExamGrade?: number;
    calculatedFinalGrade?: number;
  }): Promise<TrainingAssignment | undefined>;

  // Update Evaluation operations are now handled through training assignments table

  // Import/Export operations
  importStudents(students: {
    universityId: string,
    name: string, 
    faculty: string, 
    major: string, 
    level: string 
  }[]): Promise<{ success: number, errors: number, messages: string[] }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      console.log("Querying getUserByEmail with email:", email);
      if (!email || email.trim() === '') {
        return undefined;
      }
      const result = await db.select().from(users).where(eq(users.email, email.trim()));
      console.log("Query result for email:", result.length > 0 ? "found" : "not found");
      return result[0];
    } catch (error) {
      console.error("Error in getUserByEmail:", error);
      return undefined; // بدلاً من throw، أعد undefined
    }
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    try {
      console.log("Querying getUserByPhone with phone:", phone);
      if (!phone || phone.trim() === '') {
        return undefined;
      }
      const result = await db.select().from(users).where(eq(users.phone, phone.trim()));
      console.log("Query result for phone:", result.length > 0 ? "found" : "not found");
      return result[0];
    } catch (error) {
      console.error("Error in getUserByPhone:", error);
      return undefined; // بدلاً من throw، أعد undefined
    }
  }

  async getStudentByUniversityId(universityId: string): Promise<Student | undefined> {
    const result = await db.select().from(students).where(eq(students.universityId, universityId));
    return result[0];
  }

  async createUser(userData: InsertUser): Promise<User> {
    // تشفير كلمة المرور قبل الحفظ
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const userDataWithHashedPassword = {
      ...userData,
      password: hashedPassword
    };

    const [user] = await db.insert(users).values(userDataWithHashedPassword).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    // إذا كانت كلمة المرور موجودة في التحديثات، قم بتشفيرها
    const updatesWithHashedPassword = { ...updates };
    if (updates.password) {
      updatesWithHashedPassword.password = await bcrypt.hash(updates.password, 10);
    }

    const [user] = await db.update(users)
      .set(updatesWithHashedPassword)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async login(credentials: LoginData): Promise<User | undefined> {
    try {
      console.log(`Login attempt for username: ${credentials.username}`);

      // Try to find user by username first
      let user = await this.getUserByUsername(credentials.username);

      // If not found by username, try by university ID (for students)
      if (!user) {
        console.log(`User not found by username, trying university ID...`);
        const student = await this.getStudentByUniversityId(credentials.username);
        if (student) {
          user = await this.getUser(student.userId);
          console.log(`User found by university ID: ${user?.username}`);
        }
      }

      if (!user) {
        console.log(`User not found: ${credentials.username}`);
        return undefined;
      }

      console.log(`User found: ${user.username}, checking password...`);

      // Check if password matches using bcrypt
      const passwordMatch = await bcrypt.compare(credentials.password, user.password);
      if (!passwordMatch) {
        console.log(`Password mismatch for user: ${credentials.username}`);
        return undefined;
      }

      console.log(`Login successful for: ${user.username}`);
      return user;
    } catch (error) {
      console.error("Login error:", error);
      return undefined;
    }
  }

  // Activity log operations - عرض الأنشطة الأمنية فقط
  async getAllActivityLogs(): Promise<ActivityLog[]> {
    try {
      console.log("Starting getAllActivityLogs query...");
      const result = await db.select({
        id: activityLogs.id,
        username: activityLogs.username,
        action: activityLogs.action,
        entityType: activityLogs.entityType,
        entityId: activityLogs.entityId,
        details: activityLogs.details,
        timestamp: activityLogs.createdAt,
        targetUserId: activityLogs.targetUserId,
        notificationTitle: activityLogs.notificationTitle,
        notificationMessage: activityLogs.notificationMessage,
        notificationType: activityLogs.notificationType,
        isRead: activityLogs.isRead,
        isNotification: activityLogs.isNotification,
        user: {
          id: users.id,
          name: users.name,
          role: users.role,
          username: users.username
        }
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.username, users.username))
      .where(eq(activityLogs.isNotification, false)) // فقط الأنشطة الأمنية وليس الإشعارات
      .orderBy(desc(activityLogs.createdAt));

      console.log("Query completed, found", result.length, "security logs");

      // إضافة description مناسب لكل نشاط
      const resultWithDescription = result.map((log: any) => ({
        ...log,
        description: this.generateActivityDescription(log)
      }));

      return resultWithDescription;
    } catch (error) {
      console.error("Error in getAllActivityLogs:", error);
      throw error;
    }
  }

  private generateActivityDescription(log: any): string {
    try {
      const details = log.details || {};

      switch (log.action) {
        case 'login':
          return `تسجيل دخول المستخدم ${log.username}`;
        case 'logout':
          return `تسجيل خروج المستخدم ${log.username}`;
        case 'create':
          return `إنشاء ${this.getEntityTypeInArabic(log.entityType)} جديد`;
        case 'update':
          if (log.entityType === 'users' && details.message) {
            return details.message;
          }
          return `تحديث ${this.getEntityTypeInArabic(log.entityType)}`;
        case 'delete':
          return `حذف ${this.getEntityTypeInArabic(log.entityType)}`;
        case 'grade_entry':
          return `إدخال درجات للطلاب`;
        case 'grade_update':
          return `تحديث درجات الطلاب`;
        case 'assignment':
          return `تعيين طلاب للدورات التدريبية`;
        case 'import':
          return `استيراد بيانات الطلاب`;
        case 'export':
          return `تصدير التقارير`;
        case 'course_status_update':
          return `تحديث حالة الدورات التدريبية`;
        default:
          return `نشاط ${log.action} على ${this.getEntityTypeInArabic(log.entityType)}`;
      }
    } catch (error) {
      console.error("Error generating description:", error);
      return `نشاط ${log.action}`;
    }
  }

  private getEntityTypeInArabic(entityType: string): string {
    const entityTypes: { [key: string]: string } = {
      'users': 'المستخدمين',
      'students': 'الطلاب',
      'supervisors': 'المشرفين',
      'training_courses': 'الدورات التدريبية',
      'training_sites': 'مواقع التدريب',
      'training_assignments': 'تعيينات التدريب',
      'evaluations': 'التقييمات',
      'faculties': 'الكليات',
      'majors': 'التخصصات',
      'academic_years': 'السنوات الدراسية',
      'training_course_groups': 'مجموعات التدريب'
    };
    return entityTypes[entityType] || entityType;
  }

  async getActivityLog(id: number): Promise<ActivityLog | undefined> {
    const result = await db.select().from(activityLogs).where(eq(activityLogs.id, id));
    return result[0];
  }

  async logActivity(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const result = await db.insert(activityLogs).values(insertLog).returning();
    return result[0];
  }

  // Faculty operations
  async getAllFaculties(): Promise<Faculty[]> {
    const result = await db.select().from(faculties);
    return result;
  }

  async getFaculty(id: number): Promise<Faculty | undefined> {
    const result = await db.select().from(faculties).where(eq(faculties.id, id));
    return result[0];
  }

  async createFaculty(faculty: InsertFaculty): Promise<Faculty> {
    const result = await db.insert(faculties).values(faculty).returning();
    return result[0];
  }

  async updateFaculty(id: number, faculty: Partial<Faculty>): Promise<Faculty | undefined> {
    const result = await db.update(faculties).set(faculty).where(eq(faculties.id, id)).returning();
    return result[0];
  }

  // Major operations
  async getAllMajors(): Promise<Major[]> {
    const result = await db.select().from(majors);
    return result;
  }

  async getMajor(id: number): Promise<Major | undefined> {
    const result = await db.select().from(majors).where(eq(majors.id, id));
    return result[0];
  }

  async createMajor(major: InsertMajor): Promise<Major> {
    const result = await db.insert(majors).values(major).returning();
    return result[0];
  }

  async updateMajor(id: number, major: Partial<Major>): Promise<Major | undefined> {
    const result = await db.update(majors).set(major).where(eq(majors.id, id)).returning();
    return result[0];
  }

  async getMajorsByFaculty(facultyId: number): Promise<Major[]> {
    const result = await db.select().from(majors).where(eq(majors.facultyId, facultyId));
    return result;
  }

  // Level operations
  async getAllLevels(): Promise<Level[]> {
    return await db.select().from(levels).orderBy(desc(levels.id));
  }

  async getLevel(id: number): Promise<Level | undefined> {
    const result = await db.select().from(levels).where(eq(levels.id, id));
    return result[0];
  }

  async createLevel(level: InsertLevel): Promise<Level> {
    const result = await db.insert(levels).values(level).returning();
    return result[0];
  }

  async deleteLevel(id: number): Promise<void> {
    await db.delete(levels).where(eq(levels.id, id));
  }

  // Supervisor operations
  async getAllSupervisors(): Promise<Supervisor[]> {
    const result = await db.select().from(supervisors);
    return result;
  }

  async getSupervisor(id: number): Promise<Supervisor | undefined> {
    const result = await db.select().from(supervisors).where(eq(supervisors.id, id));
    return result[0];
  }

  async getSupervisorByUserId(userId: number): Promise<Supervisor | undefined> {
    const result = await db.select().from(supervisors).where(eq(supervisors.userId, userId));
    return result[0];
  }

  async createSupervisor(supervisor: InsertSupervisor): Promise<Supervisor> {
    const result = await db.insert(supervisors).values(supervisor).returning();
    return result[0];
  }

  async updateSupervisor(id: number, supervisor: Partial<Supervisor>, userData?: Partial<User>): Promise<Supervisor | undefined> {
    const result = await db.update(supervisors).set(supervisor).where(eq(supervisors.id, id)).returning();
    if (userData && result[0]?.userId) {
      await this.updateUser(result[0].userId, userData);
    }
    return result[0];
  }

  async getSupervisorWithUser(id: number): Promise<(Supervisor & { user: User }) | undefined> {
    const result = await db.select({
      id: supervisors.id,
      userId: supervisors.userId,
      facultyId: supervisors.facultyId,
      department: supervisors.department,
      user: users
    }).from(supervisors)
      .leftJoin(users, eq(supervisors.userId, users.id))
      .where(eq(supervisors.id, id));

    if (result[0] && result[0].user) {
      return {
        id: result[0].id,
        userId: result[0].userId,
        facultyId: result[0].facultyId,
        department: result[0].department,
        user: result[0].user
      } as Supervisor & { user: User };
    }
    return undefined;
  }

  // Student operations
  async getAllStudents(): Promise<Student[]> {
    const result = await db.select().from(students);
    return result;
  }

  async getStudent(id: number): Promise<Student | undefined> {
    const result = await db.select().from(students).where(eq(students.id, id));
    return result[0];
  }



  async getStudentByUserId(userId: number): Promise<Student | undefined> {
    const result = await db.select().from(students).where(eq(students.userId, userId));
    return result[0];
  }



  async createStudent(student: InsertStudent): Promise<Student> {
    const result = await db.insert(students).values(student).returning();
    return result[0];
  }

  async updateStudent(id: number, student: Partial<Student>, userData?: Partial<User>): Promise<Student | undefined> {
    const result = await db.update(students).set(student).where(eq(students.id, id)).returning();
    if (userData && result[0]?.userId) {
      await this.updateUser(result[0].userId, userData);
    }
    return result[0];
  }

  async getStudentWithDetails(id: number): Promise<(Student & { user: User, faculty?: Faculty, major?: Major, level?: Level }) | undefined> {
    const result = await db.select({
      student: students,
      user: users,
      faculty: faculties,
      major: majors,
      level: levels
    }).from(students)
      .leftJoin(users, eq(students.userId, users.id))
      .leftJoin(majors, eq(students.majorId, majors.id))
      .leftJoin(faculties, eq(majors.facultyId, faculties.id))
      .leftJoin(levels, eq(students.levelId, levels.id))
      .where(eq(students.id, id));

    if (result[0] && result[0].user) {
      return {
        ...result[0].student,
        user: result[0].user,
        faculty: result[0].faculty || undefined,
        major: result[0].major || undefined,
        level: result[0].level || undefined
      };
    }
    return undefined;
  }

  async getStudentsByFaculty(facultyId: number): Promise<Student[]> {
    const result = await db.select({
      student: students
    }).from(students)
      .leftJoin(majors, eq(students.majorId, majors.id))
      .where(eq(majors.facultyId, facultyId));

    return result.map((row: any) => row.student);
  }

  // Get students assigned to a supervisor through training groups
  async getStudentsBySupervisorThroughGroups(supervisorId: number): Promise<(Student & { user: User, faculty?: Faculty, major?: Major, level?: Level })[]> {
    const result = await db.select({
      student: students,
      user: users,
      faculty: faculties,
      major: majors,
      level: levels
    }).from(students)
      .leftJoin(users, eq(students.userId, users.id))
      .leftJoin(majors, eq(students.majorId, majors.id))
      .leftJoin(faculties, eq(majors.facultyId, faculties.id))
      .leftJoin(levels, eq(students.levelId, levels.id))
      .innerJoin(trainingAssignments, eq(students.id, trainingAssignments.studentId))
      .innerJoin(trainingCourseGroups, eq(trainingAssignments.groupId, trainingCourseGroups.id))
      .where(eq(trainingCourseGroups.supervisorId, supervisorId));

    return result.map((row: any) => ({
      ...row.student,
      user: row.user!,
      faculty: row.faculty || undefined,
      major: row.major || undefined,
      level: row.level || undefined
    }));
  }

  // Training Site operations
  async getAllTrainingSites(): Promise<TrainingSite[]> {
    const result = await db.select().from(trainingSites);
    return result;
  }

  async getTrainingSite(id: number): Promise<TrainingSite | undefined> {
    const result = await db.select().from(trainingSites).where(eq(trainingSites.id, id));
    return result[0];
  }

  async getTrainingSiteById(id: number): Promise<TrainingSite | undefined> {
    const result = await db.select().from(trainingSites).where(eq(trainingSites.id, id));
    return result[0];
  }

  async createTrainingSite(site: InsertTrainingSite): Promise<TrainingSite> {
    const result = await db.insert(trainingSites).values(site).returning();
    return result[0]; 
  }

  async updateTrainingSite(id: number, site: Partial<InsertTrainingSite>): Promise<TrainingSite | undefined> {
    const result = await db.update(trainingSites)
      .set(site)
      .where(eq(trainingSites.id, id))
      .returning();
    return result[0];
  }

  async deleteTrainingSite(id: number): Promise<void> {
    await db.delete(trainingSites).where(eq(trainingSites.id, id));
  }

  async getTrainingGroupsBySite(siteId: number): Promise<any[]> {
    const groups = await db
      .select({
        id: trainingCourseGroups.id,
        groupName: trainingCourseGroups.groupName,
        startDate: trainingCourseGroups.startDate,
        endDate: trainingCourseGroups.endDate,
        capacity: trainingCourseGroups.capacity,
        currentEnrollment: trainingCourseGroups.currentEnrollment,
        status: trainingCourseGroups.status,
        location: trainingCourseGroups.location,
        course: {
          id: trainingCourses.id,
          name: trainingCourses.name,
          description: trainingCourses.description,
          status: trainingCourses.status,
          academicYear: sql`json_build_object('id', ${academicYears.id}, 'name', ${academicYears.name})`,
          major: sql`json_build_object('id', ${majors.id}, 'name', ${majors.name}, 'faculty', json_build_object('id', ${faculties.id}, 'name', ${faculties.name}))`,
          level: sql`json_build_object('id', ${levels.id}, 'name', ${levels.name})`
        },
        supervisor: sql`json_build_object('id', ${supervisors.id}, 'user', json_build_object('id', ${users.id}, 'name', ${users.name}), 'department', ${supervisors.department})`
      })
      .from(trainingCourseGroups)
      .leftJoin(trainingCourses, eq(trainingCourseGroups.courseId, trainingCourses.id))
      .leftJoin(academicYears, eq(trainingCourses.academicYearId, academicYears.id))
      .leftJoin(majors, eq(trainingCourses.majorId, majors.id))
      .leftJoin(faculties, eq(majors.facultyId, faculties.id))
      .leftJoin(levels, eq(trainingCourses.levelId, levels.id))
      .leftJoin(supervisors, eq(trainingCourseGroups.supervisorId, supervisors.id))
      .leftJoin(users, eq(supervisors.userId, users.id))
      .where(eq(trainingCourseGroups.siteId, siteId))
      .orderBy(desc(trainingCourseGroups.startDate));

    return groups;
  }

  // Training Course operations
  async getAllTrainingCourses(): Promise<TrainingCourse[]> {
    const result = await db.select().from(trainingCourses);
    return result;
  }

  async getTrainingCourse(id: number): Promise<TrainingCourse | undefined> {
    console.log("Getting training course with id:", id, "type:", typeof id);
    const course = await db.select().from(trainingCourses).where(eq(trainingCourses.id, id));
    console.log("Found course:", course ? "yes" : "no");
    return course[0];
  }

  async createTrainingCourse(data: InsertTrainingCourse): Promise<TrainingCourse> {
    console.log("Creating training course with data:", data);

    // التحقق من البيانات المطلوبة
    if (!data.name || data.name.trim() === '') {
      throw new Error("اسم الدورة مطلوب");
    }

    const result = await db.insert(trainingCourses).values(data).returning();
    return result[0];
  }

  async createTrainingCourseWithGroups(courseData: InsertTrainingCourse, groupsData: any[]): Promise<{ course: TrainingCourse, groups: TrainingCourseGroup[] }> {
    console.log("Creating training course with groups in transaction:", { courseData, groupsCount: groupsData.length });

    // التحقق من البيانات المطلوبة
    if (!courseData.name || courseData.name.trim() === '') {
      throw new Error("اسم الدورة مطلوب");
    }

    // حساب تاريخ البدء والانتهاء من المجموعات
    const groupDates = groupsData.map(group => ({
      startDate: new Date(group.startDate),
      endDate: new Date(group.endDate)
    }));

    const earliestStartDate = new Date(Math.min(...groupDates.map(d => d.startDate.getTime())));
    const latestEndDate = new Date(Math.max(...groupDates.map(d => d.endDate.getTime())));

    // تحديد السنة الدراسية المناسبة بناءً على تاريخ البدء
    const academicYears = await this.getAllAcademicYears();
    let appropriateAcademicYearId = courseData.academicYearId;
    let academicYearMessage: string | null = null;

    if (academicYears && academicYears.length > 0) {
      let foundMatchingYear = false;
      for (const year of academicYears) {
        const yearStart = new Date(year.startDate);
        const yearEnd = new Date(year.endDate);

        if (earliestStartDate >= yearStart && earliestStartDate <= yearEnd) {
          appropriateAcademicYearId = year.id;
          academicYearMessage = `تم تعيين الكورس للسنة الدراسية: ${year.name} بناءً على تاريخ البدء: ${earliestStartDate.toISOString().split('T')[0]}`;
          console.log(academicYearMessage);
          foundMatchingYear = true;
          break;
        }
      }
      if (!foundMatchingYear) {
        academicYearMessage = "لم يتم العثور على سنة دراسية مناسبة لتاريخ بدء الدورة.";
        console.log(academicYearMessage);
      }
    } else {
      academicYearMessage = 'لم يتم العثور على سنوات دراسية في النظام';
      console.log(academicYearMessage);
    }

    console.log(`تواريخ الكورس المحسوبة: البدء ${earliestStartDate.toISOString().split('T')[0]} - الانتهاء ${latestEndDate.toISOString().split('T')[0]}`);

    // إعداد بيانات الدورة مع التواريخ والسنة الدراسية المحسوبة
    const finalCourseData = {
      ...courseData,
      academicYearId: appropriateAcademicYearId,
      // إضافة القيم الافتراضية للحقول الجديدة إذا لم تكن موجودة
      attendancePercentage: courseData.attendancePercentage || 20,
      behaviorPercentage: courseData.behaviorPercentage || 30,
      finalExamPercentage: courseData.finalExamPercentage || 50,
      attendanceGradeLabel: courseData.attendanceGradeLabel || "درجة الحضور",
      behaviorGradeLabel: courseData.behaviorGradeLabel || "درجة السلوك",
      finalExamGradeLabel: courseData.finalExamGradeLabel || "درجة الاختبار النهائي",
      // يمكن إضافة حقول startDate و endDate إذا كانت موجودة في schema
    };

    return await db.transaction(async (tx: any) => {
      // 1. إنشاء الدورة أولاً
      const [newCourse] = await tx.insert(trainingCourses).values(finalCourseData).returning();

      if (!newCourse) {
        throw new Error("فشل في إنشاء الدورة");
      }

      console.log("Course created with ID:", newCourse.id);

      // 2. إنشاء المجموعات
      const createdGroups: TrainingCourseGroup[] = [];

      for (let i = 0; i < groupsData.length; i++) {
        const group = groupsData[i];

        // التحقق من البيانات المطلوبة للمجموعة
        if (!group.siteId || !group.supervisorId || !group.capacity || !group.startDate || !group.endDate) {
          throw new Error(`بيانات المجموعة ${i + 1} غير مكتملة`);
        }

        // تحديد حالة المجموعة بناءً على التواريخ
        const currentDate = new Date().toISOString().split('T')[0];
        let groupStatus = 'upcoming';

        if (group.startDate && group.endDate) {
          if (currentDate >= group.startDate && currentDate <= group.endDate) {
            groupStatus = 'active';
          } else if (currentDate > group.endDate) {
            groupStatus = 'completed';
          }
        }

        const groupInsertData: InsertTrainingCourseGroup = {
          courseId: newCourse.id,
          groupName: group.groupName || `مجموعة ${i + 1}`,
          siteId: Number(group.siteId),
          supervisorId: Number(group.supervisorId),
          startDate: group.startDate,
          endDate: group.endDate,
          capacity: Number(group.capacity),
          currentEnrollment: 0,
          location: group.location || null,
          status: groupStatus
        };

        const [createdGroup] = await tx.insert(trainingCourseGroups).values(groupInsertData).returning();

        if (createdGroup) {
          createdGroups.push(createdGroup);
          console.log(`Group ${i + 1} created with ID:`, createdGroup.id);
        }
      }

      // 3. تحديث حالة الدورة بناءً على المجموعات
      const courseStatuses = createdGroups.map(g => {
        if (g.startDate && g.endDate) {
          const currentDate = new Date().toISOString().split('T')[0];
          if (currentDate >= g.startDate && currentDate <= g.endDate) {
            return 'active';
          } else if (currentDate > g.endDate) {
            return 'completed';
          }
        }
        return 'upcoming';
      });

      let finalCourseStatus = 'upcoming';
      if (courseStatuses.includes('active')) {
        finalCourseStatus ='active';
      } else if (courseStatuses.every(s => s === 'completed')) {
        finalCourseStatus = 'completed';
      }

      // تحديث حالة الدورة إذا كانت مختلفة
      if (finalCourseStatus !== newCourse.status) {
        const [updatedCourse] = await tx.update(trainingCourses)
          .set({ status: finalCourseStatus })
          .where(eq(trainingCourses.id, newCourse.id))
          .returning();

        return { course: updatedCourse, groups: createdGroups, academicYearMessage: academicYearMessage || undefined };
      }

      return {
        course: newCourse,
        groups: createdGroups,
        academicYearMessage: academicYearMessage || undefined
      };
    });
  }

  async getTrainingCourseWithDetails(id: number): Promise<(TrainingCourse & { faculty?: Faculty, major?: Major }) | undefined> {
    const result = await db.select({
      course: trainingCourses,
      faculty: faculties,
      major: majors
    }).from(trainingCourses)
      .leftJoin(majors, eq(trainingCourses.majorId, majors.id))
      .leftJoin(faculties, eq(majors.facultyId, faculties.id))
      .where(eq(trainingCourses.id, id));

    if (result[0]) {
      return {
        ...result[0].course,
        faculty: result[0].faculty || undefined,
        major: result[0].major || undefined
      };
    }
    return undefined;
  }

  async getTrainingCoursesByFaculty(facultyId: number): Promise<TrainingCourse[]> {
    const result = await db.select({
      course: trainingCourses
    }).from(trainingCourses)
      .leftJoin(majors, eq(trainingCourses.majorId, majors.id))
      .where(eq(majors.facultyId, facultyId));

    return result.map((row: any) => row.course);
  }

  async getTrainingCoursesByMajor(majorId: number): Promise<TrainingCourse[]> {
    const result = await db.select().from(trainingCourses).where(eq(trainingCourses.majorId, majorId));
    return result;
  }

  // Get courses available for student registration (upcoming and active only, excludes completed)
  async getAvailableCoursesForStudents(studentId?: number): Promise<TrainingCourse[]> {
    // Only show upcoming and active courses for new registrations
    const result = await db.select().from(trainingCourses)
      .where(sql`status IN ('upcoming', 'active')`);

    // If studentId provided, filter out courses the student is already enrolled in
    if (studentId) {
      const enrolledCourses = await this.getEnrolledCoursesForStudent(studentId);
      const enrolledCourseIds = enrolledCourses.map(c => c.id);
      return result.filter((course: any) => !enrolledCourseIds.includes(course.id));
    }

    return result;
  }

  // Get courses the student is enrolled in (all statuses)
  async getEnrolledCoursesForStudent(studentId: number): Promise<TrainingCourse[]> {
    const result = await db.select({
      id: trainingCourses.id,
      name: trainingCourses.name,
      majorId: trainingCourses.majorId,
      levelId: trainingCourses.levelId,
      academicYearId: trainingCourses.academicYearId,
      description: trainingCourses.description,
      status: trainingCourses.status,
      attendancePercentage: trainingCourses.attendancePercentage,
      behaviorPercentage: trainingCourses.behaviorPercentage,
      finalExamPercentage: trainingCourses.finalExamPercentage,
      attendanceGradeLabel: trainingCourses.attendanceGradeLabel,
      behaviorGradeLabel: trainingCourses.behaviorGradeLabel,
      finalExamGradeLabel: trainingCourses.finalExamGradeLabel,
      createdAt: trainingCourses.createdAt,
      createdBy: trainingCourses.createdBy
    })
    .from(trainingCourses)
    .innerJoin(trainingCourseGroups, eq(trainingCourses.id, trainingCourseGroups.courseId))
    .innerJoin(trainingAssignments, eq(trainingCourseGroups.id, trainingAssignments.groupId))
    .where(eq(trainingAssignments.studentId, studentId));

    return result;
  }

  async updateTrainingCourse(id: number, data: Partial<InsertTrainingCourse>) {
    try {
      const [updatedCourse] = await db
        .update(trainingCourses)
        .set(data)
        .where(eq(trainingCourses.id, id))
        .returning();

      return updatedCourse;
    } catch (error) {
      console.error("Error updating training course:", error);
      throw error;
    }
  }

  // Training Course Group operations
  async getAllTrainingCourseGroups(): Promise<TrainingCourseGroup[]> {
    const result = await db.select().from(trainingCourseGroups);
    return result;
  }

  async getTrainingCourseGroup(id: number): Promise<TrainingCourseGroup | undefined> {
    const result = await db.select().from(trainingCourseGroups).where(eq(trainingCourseGroups.id, id));
    return result[0];
  }

  async createTrainingCourseGroup(data: InsertTrainingCourseGroup): Promise<TrainingCourseGroup> {
    console.log("Creating training course group with data:", data);

    // التحقق من صحة courseId
    if (!data.courseId || typeof data.courseId !== 'number') {
      throw new Error(`معرف الدورة غير صالح: ${data.courseId}`);
    }

    // التحقق من وجود الدورة
    const course = await this.getTrainingCourse(data.courseId);
    if (!course) {
      throw new Error(`الدورة التدريبية غير موجودة: ${data.courseId}`);
    }

    // Remove createdBy field if it exists to match schema
    const { createdBy, ...cleanData } = data as any;
    const result = await db.insert(trainingCourseGroups).values(cleanData).returning();
    return result[0];
  }

  async getTrainingCourseGroupsByCourse(courseId: number): Promise<TrainingCourseGroup[]> {
    const result = await db.select().from(trainingCourseGroups).where(eq(trainingCourseGroups.courseId, courseId));
    return result;
  }  

  async getTrainingCourseGroupsWithAvailableSpots(facultyId?: number, majorId?: number, levelId?: number): Promise<(TrainingCourseGroup & { 
    course: TrainingCourse, 
    site: TrainingSite, 
    supervisor: Supervisor & { user: User },
    availableSpots: number,
    _count: { assignments: number }
  })[]> {
    let query = db.select({
      group: trainingCourseGroups,
      course: trainingCourses,
      site: trainingSites,
      supervisor: supervisors,
      supervisorUser: users
    }).from(trainingCourseGroups)
      .leftJoin(trainingCourses, eq(trainingCourseGroups.courseId, trainingCourses.id))
      .leftJoin(trainingSites, eq(trainingCourseGroups.siteId, trainingSites.id))
      .leftJoin(supervisors, eq(trainingCourseGroups.supervisorId, supervisors.id))
      .leftJoin(users, eq(supervisors.userId, users.id))
      .leftJoin(majors, eq(trainingCourses.majorId, majors.id));

    // Apply filters based on parameters
    const whereConditions = [];

    if (facultyId) {
      whereConditions.push(eq(majors.facultyId, facultyId));
    }

    if (majorId) {
      whereConditions.push(eq(trainingCourses.majorId, majorId));
    }

    if (levelId) {
      whereConditions.push(eq(trainingCourses.levelId, levelId));
    }

    // Apply where conditions if any exist
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }

    const result = await query;

    // Get assignment counts for each group
    const groupIds = result.map((row: any) => row.group.id);
    const assignmentCounts = await Promise.all(
      groupIds.map(async (groupId: any) => {
        const assignments = await db.select().from(trainingAssignments).where(eq(trainingAssignments.groupId, groupId));
        return { groupId, count: assignments.length };
      })
    );

    const assignmentCountMap = new Map(
      assignmentCounts.map(item => [item.groupId, item.count])
    );

    return result.map((row: any) => {
      const assignmentCount = assignmentCountMap.get(row.group.id) || 0;
      return {
        ...row.group,
        course: row.course!,
        site: row.site!,
        supervisor: {
          ...row.supervisor!,
          user: row.supervisorUser!
        },
        availableSpots: (row.group.capacity || 0) - assignmentCount,
        _count: { assignments: assignmentCount }
      };
    }).filter((group: any) => group.availableSpots > 0);
  }

  async updateGroupEnrollment(groupId: number, newEnrollment: number): Promise<TrainingCourseGroup | undefined> {
    const result = await db.update(trainingCourseGroups)
      .set({ currentEnrollment: newEnrollment })
      .where(eq(trainingCourseGroups.id, groupId))
      .returning();
    return result[0];
  }

  async updateTrainingCourseGroup(id: number, data: Partial<InsertTrainingCourseGroup>): Promise<TrainingCourseGroup | undefined> {
    const result = await db.update(trainingCourseGroups)
      .set(data)
      .where(eq(trainingCourseGroups.id, id))
      .returning();
    return result[0];
  }

  async getTrainingCourseGroupWithStudents(groupId: number): Promise<(TrainingCourseGroup & {
    course: TrainingCourse,
    site: TrainingSite,
    supervisor: Supervisor & { user: User },
    students: (Student & { user: User })[]
  }) | undefined> {
    // Get group details
    const groupResult = await db.select({
      group: trainingCourseGroups,
      course: trainingCourses,
      site: trainingSites,
      supervisor: supervisors
    }).from(trainingCourseGroups)
      .leftJoin(trainingCourses, eq(trainingCourseGroups.courseId, trainingCourses.id))
      .leftJoin(trainingSites, eq(trainingCourseGroups.siteId, trainingSites.id))
      .leftJoin(supervisors, eq(trainingCourseGroups.supervisorId, supervisors.id))
      .where(eq(trainingCourseGroups.id, groupId));

    if (!groupResult[0]) {
      return undefined;
    }

    // Get supervisor user
    const supervisorUser = groupResult[0].supervisor ?
      await db.select().from(users).where(eq(users.id, groupResult[0].supervisor.userId)).then((r: any) => r[0]) : null;

    // Get students in this group
    const assignments = await db.select({
      assignment: trainingAssignments,
      student: students
    }).from(trainingAssignments)
      .leftJoin(students, eq(trainingAssignments.studentId, students.id))
      .where(eq(trainingAssignments.groupId, groupId));

    // Get student users
    const studentsWithUsers = await Promise.all(
      assignments.map(async (assignment: any) => {
        if (!assignment.student) return null;
        const studentUser = await db.select().from(users).where(eq(users.id, assignment.student.userId)).then((r: any) => r[0]);
        return {
          ...assignment.student,
          user: studentUser
        };
      })
    );

    return {
      ...groupResult[0].group,
      course: groupResult[0].course!,
      site: groupResult[0].site!,
      supervisor: {
        ...groupResult[0].supervisor!,
        user: supervisorUser!
      },
      students: studentsWithUsers.filter(s => s !== null) as (Student & { user: User })[]
    };
  }

  // Training Assignment operations
  async getAllTrainingAssignments(): Promise<TrainingAssignment[]> {
    const result = await db.select().from(trainingAssignments);
    return result;
  }

  async getTrainingAssignment(id: number): Promise<TrainingAssignment | undefined> {
    const result = await db.select().from(trainingAssignments).where(eq(trainingAssignments.id, id));
    return result[0];
  }

  async createTrainingAssignment(assignment: InsertTrainingAssignment): Promise<TrainingAssignment> {
    const result = await db.insert(trainingAssignments).values(assignment).returning();

    // Update group enrollment if groupId is provided
    if (result[0] && result[0].groupId) {
      const group = await this.getTrainingCourseGroup(result[0].groupId);
      if (group) {
        await this.updateGroupEnrollment(result[0].groupId, (group.currentEnrollment || 0) + 1);
      }
    }

    return result[0];
  }

  async deleteTrainingAssignment(id: number): Promise<void> {
    // Get assignment details before deletion to update group enrollment
    const assignment = await this.getTrainingAssignment(id);

    // Delete the assignment
    await db.delete(trainingAssignments).where(eq(trainingAssignments.id, id));

    // Update group enrollment if groupId exists
    if (assignment && assignment.groupId) {
      const group = await this.getTrainingCourseGroup(assignment.groupId);
      if (group && group.currentEnrollment && group.currentEnrollment > 0) {
        await this.updateGroupEnrollment(assignment.groupId, group.currentEnrollment - 1);
      }
    }
  }

  async getTrainingAssignmentsByStudent(studentId: number): Promise<TrainingAssignment[]> {
    const result = await db.select().from(trainingAssignments).where(eq(trainingAssignments.studentId, studentId));
    return result;
  }

  // جديد: استرجاع تعيينات الطلاب حسب الكورس مباشرة
  async getTrainingAssignmentsByCourse(courseId: number): Promise<TrainingAssignment[]> {
    const result = await db.select({
      assignment: trainingAssignments
    }).from(trainingAssignments)
      .leftJoin(trainingCourseGroups, eq(trainingAssignments.groupId, trainingCourseGroups.id))
      .where(eq(trainingCourseGroups.courseId, courseId));
    return result.map((row: any) => row.assignment);
  }

  // جديد: التحقق من تسجيل الطالب في كورس معين
  async isStudentEnrolledInCourse(studentId: number, courseId: number): Promise<boolean> {
    const result = await db.select({
      assignment: trainingAssignments
    }).from(trainingAssignments)
      .leftJoin(trainingCourseGroups, eq(trainingAssignments.groupId, trainingCourseGroups.id))
      .where(and(
        eq(trainingAssignments.studentId, studentId), 
        eq(trainingCourseGroups.courseId, courseId)
      ));
    return result.length > 0;
  }

  async getTrainingAssignmentsByGroup(groupId: number): Promise<TrainingAssignment[]> {
    const result = await db.select().from(trainingAssignments).where(eq(trainingAssignments.groupId, groupId));
    return result;
  }

  async getAssignmentsByGroup(groupId: number): Promise<TrainingAssignment[]> {
    const result = await db.select().from(trainingAssignments).where(eq(trainingAssignments.groupId, groupId));
    return result;
  }

  async getTrainingAssignmentWithDetails(id: number): Promise<(TrainingAssignment & { 
    student: Student & { user: User }, 
    group: TrainingCourseGroup & { 
      course: TrainingCourse, 
      site: TrainingSite, 
      supervisor: Supervisor & { user: User } 
    } 
  }) | undefined> {
    // First get the assignment with student and group info
    const assignmentResult = await db.select({
      assignment: trainingAssignments,
      student: students,
      group: trainingCourseGroups,
      course: trainingCourses,
      site: trainingSites,
      supervisor: supervisors
    }).from(trainingAssignments)
      .leftJoin(students, eq(trainingAssignments.studentId, students.id))
      .leftJoin(trainingCourseGroups, eq(trainingAssignments.groupId, trainingCourseGroups.id))
      .leftJoin(trainingCourses, eq(trainingCourseGroups.courseId, trainingCourses.id))
      .leftJoin(trainingSites, eq(trainingCourseGroups.siteId, trainingSites.id))
      .leftJoin(supervisors, eq(trainingCourseGroups.supervisorId, supervisors.id))
      .where(eq(trainingAssignments.id, id));

    if (!assignmentResult[0]) {
      return undefined;
    }

    // Get student user separately
    const studentUser = assignmentResult[0].student ? 
      await db.select().from(users).where(eq(users.id, assignmentResult[0].student.userId)).then((r: any) => r[0]) : null;

    // Get supervisor user separately  
    const supervisorUser = assignmentResult[0].supervisor ?
      await db.select().from(users).where(eq(users.id, assignmentResult[0].supervisor.userId)).then((r: any) => r[0]) : null;

    const result = [{
      assignment: assignmentResult[0].assignment,
      student: assignmentResult[0].student,
      studentUser,
      group: assignmentResult[0].group,
      course: assignmentResult[0].course,
      site: assignmentResult[0].site,
      supervisor: assignmentResult[0].supervisor,
      supervisorUser
    }];

    if (result[0] && result[0].student && result[0].studentUser) {
      return {
        ...result[0].assignment,
        student: {
          ...result[0].student,
          user: result[0].studentUser
        },
        group: {
          ...result[0].group!,
          course: result[0].course!,
          site: result[0].site!,
          supervisor: {
            ...result[0].supervisor!,
            user: result[0].supervisorUser!
          }
        }
      };
    }
    return undefined;
  }

  async confirmTrainingAssignment(id: number): Promise<TrainingAssignment | undefined> {
    const result = await db.update(trainingAssignments)
      .set({ confirmed: true, status: 'active' })
      .where(eq(trainingAssignments.id, id))
      .returning();
    return result[0];
  }

  // Note: Evaluation operations removed - using training_assignments grades directly

  // Update course status
  async updateCourseStatus(courseId: number, status: string): Promise<TrainingCourse | undefined> {
    const result = await db.update(trainingCourses)
      .set({ status })
      .where(eq(trainingCourses.id, courseId))
      .returning();
    return result[0];
  }

  // Update course status based on dates with enhanced logic
  async updateCourseStatusBasedOnDates(): Promise<void> {
    try {
      const currentDate = new Date();
      const today = currentDate.toISOString().split('T')[0]; // Get YYYY-MM-DD format
      // No registration deadline logic needed, use actual group start dates

      // Get all training course groups
      const groups = await db.select({
        id: trainingCourseGroups.id,
        courseId: trainingCourseGroups.courseId,
        startDate: trainingCourseGroups.startDate,
        endDate: trainingCourseGroups.endDate
      }).from(trainingCourseGroups);

      // Group by course ID to determine overall course status
      const courseStatuses = new Map<number, string>();

      for (const group of groups) {
        const startDate = group.startDate;
        const endDate = group.endDate;

        let status = 'upcoming';

        if (startDate && endDate) {
          if (today >= startDate && today <= endDate) {
            status = 'active';
          } else if (today > endDate) {
            status = 'completed';
          } else if (today < startDate) {
            status = 'upcoming';
          }
        }

        // Priority: active > upcoming > completed
        const currentStatus = courseStatuses.get(group.courseId);
        if (!currentStatus || 
            (status === 'active') || 
            (status === 'upcoming' && currentStatus === 'completed')) {
          courseStatuses.set(group.courseId, status);
        }
      }

      // Update course statuses
      for (const [courseId, status] of Array.from(courseStatuses)) {
        await db.update(trainingCourses)
          .set({ status })
          .where(eq(trainingCourses.id, courseId));
      }

      console.log(`Updated status for ${courseStatuses.size} courses based on group dates`);
    } catch (error) {
      console.error('Error updating course statuses:', error);
    }
  }

  // Import/Export operations
  async importStudents(students: {
    universityId: string,
    name: string, 
    faculty: string, 
    major: string, 
    level: string 
  }[]): Promise<{ success: number, errors: number, messages: string[] }> {
    let successCount = 0;
    let errorCount = 0;
    const messages: string[] = [];

    for (const studentData of students) {
      try {
        // التحقق من البيانات المطلوبة
        if (!studentData.universityId || !studentData.name) {
          errorCount++;
          messages.push(`الطالب ${studentData.name || 'غير محدد'}: الرقم الجامعي والاسم مطلوبان`);
          continue;
        }

        // البحث عن الكلية (بالاسم أو الرقم)
        let faculty = null;
        if (studentData.faculty) {
          const facultyId = parseInt(studentData.faculty);
          if (!isNaN(facultyId)) {
            faculty = await this.getFaculty(facultyId);
          } else {
            const allFaculties = await this.getAllFaculties();
            faculty = allFaculties.find(f => f.name === studentData.faculty);
          }
        }

        // البحث عن التخصص (بالاسم أو الرقم)
        let major = null;
        if (studentData.major && faculty) {
          const majorId = parseInt(studentData.major);
          if (!isNaN(majorId)) {
            major = await this.getMajor(majorId);
          } else {
            const facultyMajors = await this.getMajorsByFaculty(faculty.id);
            major = facultyMajors.find(m => m.name === studentData.major);
          }
        }

        // البحث عن المستوى (بالاسم أو الرقم)
        let level = null;
        if (studentData.level) {
          const levelId = parseInt(studentData.level);
          if (!isNaN(levelId)) {
            level = await this.getLevel(levelId);
          } else {
            const allLevels = await this.getAllLevels();
            level = allLevels.find(l => l.name === studentData.level);
          }
        }

        // التحقق من وجود الطالب
        const existingStudent = await this.getStudentByUniversityId(studentData.universityId);

        if (existingStudent) {
          // الطالب موجود - تحديث المستوى فقط إذا تغير
          let needsUpdate = false;
          const updateData: Partial<Student> = {};

          if (level && existingStudent.levelId !== level.id) {
            updateData.levelId = level.id;
            needsUpdate = true;
          }

          if (needsUpdate) {
            await this.updateStudent(existingStudent.id, updateData);
            successCount++;
            messages.push(`تم تحديث مستوى الطالب: ${studentData.name} (${studentData.universityId})`);
          } else {
            messages.push(`الطالب موجود بالفعل ولا يحتاج تحديث: ${studentData.name} (${studentData.universityId})`);
          }
        } else {
          // طالب جديد - إنشاء حساب جديد
          // إنشاء حساب المستخدم
          const user = await this.createUser({
            username: studentData.universityId,
            password: "password", // كلمة مرور افتراضية
            role: "student",
            name: studentData.name,
            active: true
          });

          // إنشاء سجل الطالب
          await this.createStudent({
            userId: user.id,
            universityId: studentData.universityId,
            majorId: major?.id || null,
            levelId: level?.id || null
          });

          successCount++;
          messages.push(`تم إنشاء حساب جديد للطالب: ${studentData.name} (${studentData.universityId})`);
        }

      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
        messages.push(`خطأ في معالجة الطالب ${studentData.name || 'غير محدد'}: ${errorMessage}`);
      }
    }

    return {
      success: successCount,
      errors: errorCount,
      messages: messages
    };
  }

  // Get courses with their groups for students
  async getCoursesWithGroups(): Promise<(TrainingCourse & {
    faculty?: Faculty,
    major?: Major,
    level?: Level,
    groups: (TrainingCourseGroup & {
      site: TrainingSite,
      supervisor: Supervisor & { user: User },
      currentEnrollment: number
    })[]
  })[]> {
    const courses = await db.select({
      id: trainingCourses.id,
      name: trainingCourses.name,
      majorId: trainingCourses.majorId,
      levelId: trainingCourses.levelId,
      academicYearId: trainingCourses.academicYearId,
      description: trainingCourses.description,
      status: trainingCourses.status,
      attendancePercentage: trainingCourses.attendancePercentage,
      behaviorPercentage: trainingCourses.behaviorPercentage,
      finalExamPercentage: trainingCourses.finalExamPercentage,
      attendanceGradeLabel: trainingCourses.attendanceGradeLabel,
      behaviorGradeLabel: trainingCourses.behaviorGradeLabel,
      finalExamGradeLabel: trainingCourses.finalExamGradeLabel,
      createdAt: trainingCourses.createdAt,
      createdBy: trainingCourses.createdBy
    }).from(trainingCourses);

    const result = await Promise.all(
      courses.map(async (course: any) => {
        // Get course details (faculty, major, level, academic year)
        const [major, level, academicYear] = await Promise.all([
          course.majorId ? this.getMajor(course.majorId) : undefined,
          course.levelId ? this.getLevel(course.levelId) : undefined,
          course.academicYearId ? this.getAcademicYear(course.academicYearId) : undefined
        ]);

        // Get faculty through major if major exists
        const faculty = major?.facultyId ? await this.getFaculty(major.facultyId) : undefined;

        // Get course groups
        const groups = await db.select().from(trainingCourseGroups)
          .where(eq(trainingCourseGroups.courseId, course.id));

        // Get group details with site, supervisor, and enrollment
        const groupsWithDetails = await Promise.all(
          groups.map(async (group: any) => {
            const [site, supervisor, assignments] = await Promise.all([
              this.getTrainingSite(group.siteId),
              this.getSupervisorWithUser(group.supervisorId),
              this.getTrainingAssignmentsByGroup(group.id)
            ]);

            return {
              ...group,
              site: site!,
              supervisor: supervisor!,
              currentEnrollment: assignments.length
            };
          })
        );

        return {
          ...course,
          faculty,
          major,
          level,
          academicYear,
          groups: groupsWithDetails
        };
      })
    );

    return result;
  }



  // Academic Years operations

  async getAcademicYear(id: number): Promise<AcademicYear | undefined> {
    const result = await db.select().from(academicYears).where(eq(academicYears.id, id));
    return result[0];
  }

  async createAcademicYear(academicYear: InsertAcademicYear): Promise<AcademicYear> {
    const result = await db.insert(academicYears).values(academicYear).returning();
    return result[0];
  }

  async updateAcademicYear(id: number, academicYear: Partial<AcademicYear>): Promise<AcademicYear | undefined> {
    const result = await db.update(academicYears).set(academicYear).where(eq(academicYears.id, id)).returning();
    return result[0];
  }

  async setAllAcademicYearsNonCurrent(): Promise<void> {
    await db.update(academicYears).set({ isCurrent: false });
  }

  // Unified Activity/Notification operations
  async getAllNotifications(): Promise<ActivityLog[]> {
    return await db.select()
      .from(activityLogs)
      .where(eq(activityLogs.isNotification, true))
      .orderBy(desc(activityLogs.createdAt));
  }

  async getNotificationsByUserId(userId: number): Promise<ActivityLog[]> {
    return await db.select()
      .from(activityLogs)
      .where(and(
        eq(activityLogs.targetUserId, userId),
        eq(activityLogs.isNotification, true)
      ))
      .orderBy(desc(activityLogs.createdAt));
  }

  async createNotification(userId: number, title: string, message: string, type: string = 'info', performedBy?: string): Promise<ActivityLog> {
    const result = await db.insert(activityLogs).values({
      username: performedBy || 'النظام',
      action: 'notification',
      entityType: 'notification',
      entityId: null,
      details: { automated: true },
      targetUserId: userId,
      notificationTitle: title,
      notificationMessage: message,
      notificationType: type,
      isRead: false,
      isNotification: true
    }).returning();
    return result[0];
  }




  // // Get Training Assignment by ID
  // async getTrainingAssignmentById(id: number): Promise<TrainingAssignment | undefined> {
  //   const result = await db.select()
  //     .from(trainingAssignments)
  //     .where(eq(trainingAssignments.id, id));
  //   return result[0];
  // }


  async markNotificationAsRead(id: number, userId: number): Promise<ActivityLog | undefined> {
    const result = await db.update(activityLogs)
      .set({ isRead: true })
      .where(and(
        eq(activityLogs.id, id), 
        eq(activityLogs.targetUserId, userId),
        eq(activityLogs.isNotification, true)
      ))
      .returning();
    return result[0];
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const result = await db.select({ count: count() })
      .from(activityLogs)
      .where(and(
        eq(activityLogs.targetUserId, userId),
        eq(activityLogs.isNotification, true),
        eq(activityLogs.isRead, false)
      ));
    return result[0]?.count || 0;
  }

  // Training Assignment Grades operations
  async updateTrainingAssignmentGrades(assignmentId: number, grades: {
    attendanceGrade?: number;
    behaviorGrade?: number;
    finalExamGrade?: number;
    calculatedFinalGrade?: number;
  }): Promise<TrainingAssignment | undefined> {
    const result = await db.update(trainingAssignments)
      .set(grades)
      .where(eq(trainingAssignments.id, assignmentId))
      .returning();
    return result[0];
  }

  // Evaluation operations are now handled through training assignments table

  // Update Student Detailed Grades operations
  async updateStudentDetailedGrades(assignmentId: number, grades: {
    attendanceGrade?: number;
    behaviorGrade?: number;
    finalExamGrade?: number;
    calculatedFinalGrade?: number;
  }): Promise<TrainingAssignment | undefined> {
    const result = await db.update(trainingAssignments)
      .set(grades)
      .where(eq(trainingAssignments.id, assignmentId))
      .returning();
    return result[0];
  }

  // Get Training Assignment by ID
  async getTrainingAssignmentById(id: number): Promise<TrainingAssignment | undefined> {
    const result = await db.select()
      .from(trainingAssignments)
      .where(eq(trainingAssignments.id, id));
    return result[0];
  }

  // Get Student by ID with User details
  async getStudentById(id: number): Promise<(Student & { user?: User }) | undefined> {
    const result = await db.select({
      student: students,
      user: users
    }).from(students)
      .leftJoin(users, eq(students.userId, users.id))
      .where(eq(students.id, id));

    if (result[0]) {
      return {
        ...result[0].student,
        user: result[0].user || undefined
      };
    }
    return undefined;
  }

  // Notification System Support Functions
  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  async getRecentlyEndedGroups(): Promise<any[]> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return await db.select({
      id: trainingCourseGroups.id,
      groupName: trainingCourseGroups.groupName,
      supervisorId: trainingCourseGroups.supervisorId,
      endDate: trainingCourseGroups.endDate,
      course: {
        id: trainingCourses.id,
        name: trainingCourses.name
      }
    })
    .from(trainingCourseGroups)
    .leftJoin(trainingCourses, eq(trainingCourseGroups.courseId, trainingCourses.id))
    .where(and(
      gte(trainingCourseGroups.endDate, yesterday.toISOString().split('T')[0]),
      lte(trainingCourseGroups.endDate, new Date().toISOString().split('T')[0])
    ));
  }

  async getStudentsByGroupId(groupId: number): Promise<any[]> {
    return await db.select({
      id: students.id,
      studentId: trainingAssignments.studentId
    })
    .from(trainingAssignments)
    .leftJoin(students, eq(trainingAssignments.studentId, students.id))
    .where(eq(trainingAssignments.groupId, groupId));
  }

  async getStudentsWithoutGrades(groupId: number): Promise<any[]> {
    return await db.select({
      id: students.id,
      assignmentId: trainingAssignments.id
    })
    .from(trainingAssignments)
    .leftJoin(students, eq(trainingAssignments.studentId, students.id))
    .where(and(
      eq(trainingAssignments.groupId, groupId),
      or(
        isNull(trainingAssignments.attendanceGrade),
        isNull(trainingAssignments.behaviorGrade),
        isNull(trainingAssignments.finalExamGrade)
      )
    ));
  }

  async getGroupWithCourseInfo(groupId: number): Promise<any | undefined> {
    const result = await db.select({
      id: trainingCourseGroups.id,
      groupName: trainingCourseGroups.groupName,
      supervisorId: trainingCourseGroups.supervisorId,
      course: {
        id: trainingCourses.id,
        name: trainingCourses.name
      }
    })
    .from(trainingCourseGroups)
    .leftJoin(trainingCourses, eq(trainingCourseGroups.courseId, trainingCourses.id))
    .where(eq(trainingCourseGroups.id, groupId));

    return result[0];
  }

  // Evaluation operations (handled through training assignments)
  async getEvaluationsByAssignment(assignmentId: number): Promise<any[]> {
    // Since evaluations are now part of training assignments, return assignment with grades
    const assignment = await this.getTrainingAssignmentById(assignmentId);
    if (!assignment || !assignment.calculatedFinalGrade) {
      return [];
    }

    return [{
      id: assignment.id,
      assignmentId: assignment.id,
      score: Number(assignment.calculatedFinalGrade),
      comments: 'تقييم مفصل',
      evaluatedAt: assignment.assignedAt,
      attendanceGrade: assignment.attendanceGrade,
      behaviorGrade: assignment.behaviorGrade,
      finalExamGrade: assignment.finalExamGrade
    }];
  }

  async getAllEvaluations(): Promise<any[]> {
    // Return all assignments that have detailed grades as evaluations
    const assignments = await db.select().from(trainingAssignments)
      .where(isNull(trainingAssignments.calculatedFinalGrade));

    return assignments.map((assignment: any) => ({
      id: assignment.id,
      assignmentId: assignment.id,
      score: Number(assignment.calculatedFinalGrade || 0),
      comments: 'تقييم مفصل',
      evaluatedAt: assignment.assignedAt,
      attendanceGrade: assignment.attendanceGrade,
      behaviorGrade: assignment.behaviorGrade,
      finalExamGrade: assignment.finalExamGrade
    }));
  }

  async createEvaluation(evalData: any): Promise<any> {
    // Create evaluation by updating training assignment with calculated grade
    const assignment = await this.getTrainingAssignmentById(evalData.assignmentId);
    if (!assignment) {
      throw new Error("التعيين غير موجود");
    }

    await this.updateTrainingAssignmentGrades(evalData.assignmentId, {
      calculatedFinalGrade: evalData.score.toString()
    });

    return {
      id: evalData.assignmentId,
      assignmentId: evalData.assignmentId,
      score: evalData.score,
      comments: evalData.comments,
      evaluatedAt: new Date()
    };
  }

  async updateEvaluation(id: number, evalData: any): Promise<any> {
    // Update evaluation by updating training assignment
    await this.updateTrainingAssignmentGrades(id, {
      calculatedFinalGrade: evalData.score.toString()
    });

    return {
      id: id,
      assignmentId: id,
      score: evalData.score,
      comments: evalData.comments,
      evaluatedAt: new Date()
    };
  }

  // Delete operations
  async deleteSupervisor(id: number): Promise<void> {
    const supervisor = await this.getSupervisor(id);
    if (!supervisor) {
      throw new Error("المشرف غير موجود");
    }

    try {
      // Update training course groups to remove supervisor reference
      await db.update(trainingCourseGroups)
        .set({ supervisorId: null })
        .where(eq(trainingCourseGroups.supervisorId, id));

      // Delete supervisor record
      await db.delete(supervisors).where(eq(supervisors.id, id));

      // Delete associated user
      await db.delete(users).where(eq(users.id, supervisor.userId));
    } catch (error) {
      console.error("Error deleting supervisor:", error);
      throw new Error("خطأ في حذف المشرف من قاعدة البيانات");
    }
  }

  async deleteStudent(id: number): Promise<void> {
    const student = await this.getStudent(id);
    if (!student) {
      throw new Error("الطالب غير موجود");
    }

    try {
      // Delete related records first (foreign key constraints)
      await db.delete(trainingAssignments).where(eq(trainingAssignments.studentId, id));

      // Delete student record
      await db.delete(students).where(eq(students.id, id));

      // Delete associated user
      await db.delete(users).where(eq(users.id, student.userId));
    } catch (error) {
      console.error("Error deleting student:", error);
      throw new Error("خطأ في حذف الطالب من قاعدة البيانات");
    }
  }

  async deleteTrainingCourse(id: number): Promise<void> {
    try {
      // Delete related records first (foreign key constraints)
      // Get all groups for this course first
      const courseGroups = await this.getTrainingCourseGroupsByCourse(id);
      for (const group of courseGroups) {
        await db.delete(trainingAssignments).where(eq(trainingAssignments.groupId, group.id));
      }

      // Delete course groups
      await db.delete(trainingCourseGroups).where(eq(trainingCourseGroups.courseId, id));

      // Delete training course
      await db.delete(trainingCourses).where(eq(trainingCourses.id, id));
    } catch (error) {
      console.error("Error deleting training course:", error);
      throw new Error("خطأ في حذف الدورة التدريبية من قاعدة البيانات");
    }
  }

  async getActiveAssignmentsBySupervisor(supervisorId: number): Promise<TrainingAssignment[]> {
    const result = await db.select()
      .from(trainingAssignments)
      .leftJoin(trainingCourseGroups, eq(trainingAssignments.groupId, trainingCourseGroups.id))
      .leftJoin(trainingCourses, eq(trainingCourseGroups.courseId, trainingCourses.id))
      .where(and(
        eq(trainingCourseGroups.supervisorId, supervisorId),
        or(
          eq(trainingCourses.status, "active"),
          eq(trainingCourses.status, "upcoming")
        )
      ));

    return result.map((row: any) => row.training_assignments);
  }

  async getActiveAssignmentsByStudent(studentId: number): Promise<TrainingAssignment[]> {
    const result = await db.select()
      .from(trainingAssignments)
      .leftJoin(trainingCourseGroups, eq(trainingAssignments.groupId, trainingCourseGroups.id))
      .leftJoin(trainingCourses, eq(trainingCourseGroups.courseId, trainingCourses.id))
      .where(and(
        eq(trainingAssignments.studentId, studentId),
        or(
          eq(trainingCourses.status, "active"),
          eq(trainingCourses.status, "upcoming")
        )
      ));

    return result.map((row: any) => row.training_assignments);
  }

  async getAllAcademicYears(): Promise<AcademicYear[]> {
    return await db.select().from(academicYears).orderBy(desc(academicYears.isCurrent), desc(academicYears.startDate));
  }

  async getStudentsByLevel(levelId: number): Promise<Student[]> {
      const result = await db.select().from(students).where(eq(students.levelId, levelId));
      return result;
  }
}


// Create storage instance
export const storage = new DatabaseStorage();