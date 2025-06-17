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
    const result = await db.select().from(trainingCourses).where(eq(trainingCourses.id, id));
    return result[0];
  }

  async createTrainingCourse(course: InsertTrainingCourse): Promise<TrainingCourse> {
    const result = await db.insert(trainingCourses).values(course).returning();
    return result[0];
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

  async createTrainingCourseGroup(group: InsertTrainingCourseGroup): Promise<TrainingCourseGroup> {
    const result = await db.insert(trainingCourseGroups).values(group).returning();
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

  // Import/Export operations
  async importStudents(students: {
    universityId: string,
    name: string, 
    faculty: string, 
    major: string, 
    level: string 
  }[]): Promise<{ success: number, errors: number, messages: string[] }> {
    // Implementation would involve processing the students array
    // This is a simplified placeholder
    return { success: 0, errors: 0, messages: [] };
  }
}

// Create storage instance
export const storage = new DatabaseStorage();