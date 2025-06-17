import {
  users,
  faculties,
  majors,
  levels,
  supervisors,
  students,
  trainingSites,
  trainingCourses,
  trainingCourseGroups,
  trainingAssignments,
  evaluations,
  activityLogs,
  type User,
  type InsertUser,
  type Faculty,
  type InsertFaculty,
  type Major,
  type InsertMajor,
  type Level,
  type InsertLevel,
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
  type Evaluation,
  type InsertEvaluation,
  type ActivityLog,
  type InsertActivityLog,
  LoginData
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
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

  // Major operations
  getAllMajors(): Promise<Major[]>;
  getMajor(id: number): Promise<Major | undefined>;
  createMajor(major: InsertMajor): Promise<Major>;
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

  // Student operations
  getAllStudents(): Promise<Student[]>;
  getStudent(id: number): Promise<Student | undefined>;
  getStudentByUniversityId(universityId: string): Promise<Student | undefined>;
  getStudentByUserId(userId: number): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: number, student: Partial<Student>, userData?: Partial<User>): Promise<Student | undefined>;
  getStudentWithDetails(id: number): Promise<(Student & { user: User, faculty?: Faculty, major?: Major, level?: Level, supervisor?: Supervisor }) | undefined>;
  getStudentsByFaculty(facultyId: number): Promise<Student[]>;
  getStudentsBySupervisor(supervisorId: number): Promise<Student[]>;

  // Training Site operations
  getAllTrainingSites(): Promise<TrainingSite[]>;
  getTrainingSite(id: number): Promise<TrainingSite | undefined>;
  createTrainingSite(site: InsertTrainingSite): Promise<TrainingSite>;

  // Training Course operations
  getAllTrainingCourses(): Promise<TrainingCourse[]>;
  getTrainingCourse(id: number): Promise<TrainingCourse | undefined>;
  createTrainingCourse(course: InsertTrainingCourse): Promise<TrainingCourse>;
  createTrainingCourseWithGroups(course: InsertTrainingCourse, groups: any[]): Promise<{ course: TrainingCourse, groups: TrainingCourseGroup[] }>;
  getTrainingCourseWithDetails(id: number): Promise<(TrainingCourse & { faculty?: Faculty, major?: Major }) | undefined>;
  getTrainingCoursesByFaculty(facultyId: number): Promise<TrainingCourse[]>;
  getTrainingCoursesByMajor(majorId: number): Promise<TrainingCourse[]>;

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
  updateGroupEnrollment(groupId: number, newEnrollment: number): Promise<TrainingCourseGroup | undefined>;

  // Training Assignment operations
  getAllTrainingAssignments(): Promise<TrainingAssignment[]>;
  getTrainingAssignment(id: number): Promise<TrainingAssignment | undefined>;
  createTrainingAssignment(assignment: InsertTrainingAssignment): Promise<TrainingAssignment>;
  getTrainingAssignmentsByStudent(studentId: number): Promise<TrainingAssignment[]>;
  getTrainingAssignmentsByGroup(groupId: number): Promise<TrainingAssignment[]>;
  getTrainingAssignmentWithDetails(id: number): Promise<(TrainingAssignment & { 
    student: Student & { user: User }, 
    group: TrainingCourseGroup & { 
      course: TrainingCourse, 
      site: TrainingSite, 
      supervisor: Supervisor & { user: User } 
    } 
  }) | undefined>;
  confirmTrainingAssignment(id: number): Promise<TrainingAssignment | undefined>;

  // Evaluation operations
  getAllEvaluations(): Promise<Evaluation[]>;
  getEvaluation(id: number): Promise<Evaluation | undefined>;
  createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation>;
  getEvaluationsByAssignment(assignmentId: number): Promise<Evaluation[]>;

  // Update course status
  updateCourseStatus(courseId: number, status: string): Promise<TrainingCourse | undefined>;

  // Update course status based on dates
  updateCourseStatusBasedOnDates(): Promise<void>;

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

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: number, user: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return result[0];
  }

  async login(loginData: LoginData): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, loginData.username));
    const user = result[0];
    // Password verification would be done in the calling code
    return user;
  }

  // Activity log operations
  async getAllActivityLogs(): Promise<ActivityLog[]> {
    const result = await db.select().from(activityLogs).orderBy(desc(activityLogs.timestamp));
    return result;
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

  async getMajorsByFaculty(facultyId: number): Promise<Major[]> {
    const result = await db.select().from(majors).where(eq(majors.facultyId, facultyId));
    return result;
  }

  // Level operations
  async getAllLevels(): Promise<Level[]> {
    const result = await db.select().from(levels);
    return result;
  }

  async getLevel(id: number): Promise<Level | undefined> {
    const result = await db.select().from(levels).where(eq(levels.id, id));
    return result[0];
  }

  async createLevel(level: InsertLevel): Promise<Level> {
    const result = await db.insert(levels).values(level).returning();
    return result[0];
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

  async getStudentByUniversityId(universityId: string): Promise<Student | undefined> {
    const result = await db.select().from(students).where(eq(students.universityId, universityId));
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

  async getStudentWithDetails(id: number): Promise<(Student & { user: User, faculty?: Faculty, major?: Major, level?: Level, supervisor?: Supervisor }) | undefined> {
    const result = await db.select({
      student: students,
      user: users,
      faculty: faculties,
      major: majors,
      level: levels,
      supervisor: supervisors
    }).from(students)
      .leftJoin(users, eq(students.userId, users.id))
      .leftJoin(faculties, eq(students.facultyId, faculties.id))
      .leftJoin(majors, eq(students.majorId, majors.id))
      .leftJoin(levels, eq(students.levelId, levels.id))
      .leftJoin(supervisors, eq(students.supervisorId, supervisors.id))
      .where(eq(students.id, id));

    if (result[0] && result[0].user) {
      return {
        ...result[0].student,
        user: result[0].user,
        faculty: result[0].faculty || undefined,
        major: result[0].major || undefined,
        level: result[0].level || undefined,
        supervisor: result[0].supervisor || undefined
      };
    }
    return undefined;
  }

  async getStudentsByFaculty(facultyId: number): Promise<Student[]> {
    const result = await db.select().from(students).where(eq(students.facultyId, facultyId));
    return result;
  }

  async getStudentsBySupervisor(supervisorId: number): Promise<Student[]> {
    const result = await db.select().from(students).where(eq(students.supervisorId, supervisorId));
    return result;
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

  async createTrainingSite(site: InsertTrainingSite): Promise<TrainingSite> {
    const result = await db.insert(trainingSites).values(site).returning();
    return result[0]; 
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

    return await db.transaction(async (tx) => {
      // 1. إنشاء الدورة أولاً
      const [newCourse] = await tx.insert(trainingCourses).values(courseData).returning();

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
          status: groupStatus,
          createdBy: courseData.createdBy
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
        finalCourseStatus = 'active';
      } else if (courseStatuses.every(s => s === 'completed')) {
        finalCourseStatus = 'completed';
      }

      // تحديث حالة الدورة إذا كانت مختلفة
      if (finalCourseStatus !== newCourse.status) {
        const [updatedCourse] = await tx.update(trainingCourses)
          .set({ status: finalCourseStatus })
          .where(eq(trainingCourses.id, newCourse.id))
          .returning();

        return { course: updatedCourse, groups: createdGroups };
      }

      return { course: newCourse, groups: createdGroups };
    });
  }

  async getTrainingCourseWithDetails(id: number): Promise<(TrainingCourse & { faculty?: Faculty, major?: Major }) | undefined> {
    const result = await db.select({
      course: trainingCourses,
      faculty: faculties,
      major: majors
    }).from(trainingCourses)
      .leftJoin(faculties, eq(trainingCourses.facultyId, faculties.id))
      .leftJoin(majors, eq(trainingCourses.majorId, majors.id))
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
    const result = await db.select().from(trainingCourses).where(eq(trainingCourses.facultyId, facultyId));
    return result;
  }

  async getTrainingCoursesByMajor(majorId: number): Promise<TrainingCourse[]> {
    const result = await db.select().from(trainingCourses).where(eq(trainingCourses.majorId, majorId));
    return result;
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

    const result = await db.insert(trainingCourseGroups).values(data).returning();
    return result[0];
  }

  async getTrainingCourseGroupsByCourse(courseId: number): Promise<TrainingCourseGroup[]> {
    const result = await db.select().from(trainingCourseGroups).where(eq(trainingCourseGroups.courseId, courseId));
    return result;
  }  

  async getTrainingCourseGroupsWithAvailableSpots(majorId?: number): Promise<(TrainingCourseGroup & { 
    course: TrainingCourse, 
    site: TrainingSite, 
    supervisor: Supervisor & { user: User },
    availableSpots: number 
  })[]> {
    const query = db.select({
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
      .where(eq(trainingCourseGroups.status, 'active'));

    const result = majorId 
      ? await query.where(eq(trainingCourses.majorId, majorId))
      : await query;

    return result.map((row: any) => ({
      ...row.group,
      course: row.course!,
      site: row.site!,
      supervisor: {
        ...row.supervisor!,
        user: row.supervisorUser!
      },
      availableSpots: (row.group.capacity || 0) - (row.group.currentEnrollment || 0)
    })).filter((group: any) => group.availableSpots > 0);
  }

  async updateGroupEnrollment(groupId: number, newEnrollment: number): Promise<TrainingCourseGroup | undefined> {
    const result = await db.update(trainingCourseGroups)
      .set({ currentEnrollment: newEnrollment })
      .where(eq(trainingCourseGroups.id, groupId))
      .returning();
    return result[0];
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

    // Update group enrollment
    if (result[0]) {
      const group = await this.getTrainingCourseGroup(result[0].groupId);
      if (group) {
        await this.updateGroupEnrollment(result[0].groupId, (group.currentEnrollment || 0) + 1);
      }
    }

    return result[0];
  }

  async getTrainingAssignmentsByStudent(studentId: number): Promise<TrainingAssignment[]> {
    const result = await db.select().from(trainingAssignments).where(eq(trainingAssignments.studentId, studentId));
    return result;
  }

  async getTrainingAssignmentsByGroup(groupId: number): Promise<TrainingAssignment[]> {
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
    const result = await db.select({
      assignment: trainingAssignments,
      student: students,
      studentUser: users,
      group: trainingCourseGroups,
      course: trainingCourses,
      site: trainingSites,
      supervisor: supervisors,
      supervisorUser: users
    }).from(trainingAssignments)
      .leftJoin(students, eq(trainingAssignments.studentId, students.id))
      .leftJoin(users, eq(students.userId, users.id))
      .leftJoin(trainingCourseGroups, eq(trainingAssignments.groupId, trainingCourseGroups.id))
      .leftJoin(trainingCourses, eq(trainingCourseGroups.courseId, trainingCourses.id))
      .leftJoin(trainingSites, eq(trainingCourseGroups.siteId, trainingSites.id))
      .leftJoin(supervisors, eq(trainingCourseGroups.supervisorId, supervisors.id))
      .leftJoin(users, eq(supervisors.userId, users.id))
      .where(eq(trainingAssignments.id, id));

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

  // Evaluation operations
  async getAllEvaluations(): Promise<Evaluation[]> {
    const result = await db.select().from(evaluations);
    return result;
  }

  async getEvaluation(id: number): Promise<Evaluation | undefined> {
    const result = await db.select().from(evaluations).where(eq(evaluations.id, id));
    return result[0];
  }

  async createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation> {
    const result = await db.insert(evaluations).values(evaluation).returning();
    return result[0];
  }

  async getEvaluationsByAssignment(assignmentId: number): Promise<Evaluation[]> {
    const result = await db.select().from(evaluations).where(eq(evaluations.assignmentId, assignmentId));
    return result;
  }

  // Update course status
  async updateCourseStatus(courseId: number, status: string): Promise<TrainingCourse | undefined> {
    const result = await db.update(trainingCourses)
      .set({ status })
      .where(eq(trainingCourses.id, courseId))
      .returning();
    return result[0];
  }

  // Update course status based on dates
  async updateCourseStatusBasedOnDates(): Promise<void> {
    try {
      const currentDate = new Date();
      const today = currentDate.toISOString().split('T')[0]; // Get YYYY-MM-DD format

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
          }
        }

        // If course has multiple groups, prioritize active > upcoming > completed
        const currentStatus = courseStatuses.get(group.courseId);
        if (!currentStatus || 
            (status === 'active') || 
            (status === 'upcoming' && currentStatus === 'completed')) {
          courseStatuses.set(group.courseId, status);
        }
      }

      // Update course statuses
      for (const [courseId, status] of courseStatuses) {
        await db.update(trainingCourses)
          .set({ status })
          .where(eq(trainingCourses.id, courseId));
      }

      console.log(`Updated status for ${courseStatuses.size} courses based on dates`);
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

    // معالجة كل طالب منفصل لتجنب تضارب العمليات
    for (const studentData of students) {
      try {
        console.log(`Processing student: ${studentData.name} (${studentData.universityId})`);

        if (!studentData.universityId || !studentData.name) {
          errorCount++;
          messages.push(`طالب مرفوض: بيانات ناقصة - ${studentData.name || 'غير محدد'}`);
          continue;
        }

        // التحقق من وجود الطالب أولاً
        const existingStudent = await this.getStudentByUniversityId(studentData.universityId);

        if (existingStudent) {
          console.log(`Student exists: ${studentData.universityId}, updating level only`);

          // البحث عن المستوى الجديد
          let levelId = null;
          if (studentData.level) {
            // البحث بالاسم أولاً
            const allLevels = await this.getAllLevels();
            const levelByName = allLevels.find(level => level.name === studentData.level);
            
            if (levelByName) {
              levelId = levelByName.id;
            } else {
              // محاولة البحث بالرقم
              const levelNum = parseInt(studentData.level);
              if (!isNaN(levelNum)) {
                const levelById = allLevels.find(level => level.id === levelNum);
                if (levelById) {
                  levelId = levelById.id;
                }
              }
            }
          }

          // تحديث المستوى فقط إذا تغير
          if (levelId && existingStudent.levelId !== levelId) {
            await this.updateStudent(existingStudent.id, { levelId });
            successCount++;
            messages.push(`تم تحديث مستوى الطالب: ${studentData.name}`);
          } else {
            messages.push(`الطالب موجود ولا يحتاج تحديث: ${studentData.name}`);
          }
          continue;
        }

        // البحث عن الكلية
        let facultyId = null;
        if (studentData.faculty) {
          const allFaculties = await this.getAllFaculties();
          const facultyByName = allFaculties.find(faculty => faculty.name === studentData.faculty);
          
          if (facultyByName) {
            facultyId = facultyByName.id;
          } else {
            // محاولة البحث بالرقم
            const facultyNum = parseInt(studentData.faculty);
            if (!isNaN(facultyNum)) {
              const facultyById = allFaculties.find(faculty => faculty.id === facultyNum);
              if (facultyById) {
                facultyId = facultyById.id;
              }
            }
          }
        }

        // البحث عن التخصص
        let majorId = null;
        if (studentData.major && facultyId) {
          const majorsByFaculty = await this.getMajorsByFaculty(facultyId);
          const majorByName = majorsByFaculty.find(major => major.name === studentData.major);
          
          if (majorByName) {
            majorId = majorByName.id;
          } else {
            // محاولة البحث بالرقم
            const majorNum = parseInt(studentData.major);
            if (!isNaN(majorNum)) {
              const majorById = majorsByFaculty.find(major => major.id === majorNum);
              if (majorById) {
                majorId = majorById.id;
              }
            }
          }
        }

        // البحث عن المستوى
        let levelId = null;
        if (studentData.level) {
          const allLevels = await this.getAllLevels();
          const levelByName = allLevels.find(level => level.name === studentData.level);
          
          if (levelByName) {
            levelId = levelByName.id;
          } else {
            // محاولة البحث بالرقم
            const levelNum = parseInt(studentData.level);
            if (!isNaN(levelNum)) {
              const levelById = allLevels.find(level => level.id === levelNum);
              if (levelById) {
                levelId = levelById.id;
              }
            }
          }
        }

        console.log(`Found data - FacultyId: ${facultyId}, MajorId: ${majorId}, LevelId: ${levelId}`);

        // إنشاء المستخدم أولاً
        const newUser = await this.createUser({
          username: studentData.universityId,
          password: "password", // كلمة مرور افتراضية
          role: "student",
          name: studentData.name,
          active: true
        });

        // إنشاء سجل الطالب
        const newStudent = await this.createStudent({
          userId: newUser.id,
          universityId: studentData.universityId,
          facultyId: facultyId || undefined,
          majorId: majorId || undefined,
          levelId: levelId || undefined,
          supervisorId: undefined
        });

        console.log(`Student created: ${studentData.name} with ID: ${newStudent.id}`);
        successCount++;
        messages.push(`تم إنشاء الطالب: ${studentData.name}`);

      } catch (error) {
        errorCount++;
        console.error(`Error processing student ${studentData.name}:`, error);
        messages.push(`خطأ في إنشاء الطالب ${studentData.name}: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
      }
    }

    console.log(`Import summary: ${successCount} success, ${errorCount} errors`);
    return { success: successCount, errors: errorCount, messages };
  }
}

// Create storage instance
export const storage = new DatabaseStorage();