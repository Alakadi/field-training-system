import {
  users,
  faculties,
  majors,
  levels,
  supervisors,
  students,
  trainingSites,
  trainingCourses,
  trainingAssignments,
  evaluations,
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
  type TrainingAssignment,
  type InsertTrainingAssignment,
  type Evaluation,
  type InsertEvaluation,
  LoginData
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  login(loginData: LoginData): Promise<User | undefined>;
  
  // Faculty operations
  getAllFaculties(): Promise<Faculty[]>;
  getFaculty(id: number): Promise<Faculty | undefined>;
  createFaculty(faculty: InsertFaculty): Promise<Faculty>;
  
  // Major operations
  getAllMajors(): Promise<Major[]>;
  getMajorsByFaculty(facultyId: number): Promise<Major[]>;
  getMajor(id: number): Promise<Major | undefined>;
  createMajor(major: InsertMajor): Promise<Major>;
  
  // Level operations
  getAllLevels(): Promise<Level[]>;
  getLevel(id: number): Promise<Level | undefined>;
  createLevel(level: InsertLevel): Promise<Level>;
  
  // Supervisor operations
  getAllSupervisors(): Promise<Supervisor[]>;
  getSupervisor(id: number): Promise<Supervisor | undefined>;
  createSupervisor(supervisor: InsertSupervisor): Promise<Supervisor>;
  getSupervisorWithUser(id: number): Promise<(Supervisor & { user: User }) | undefined>;
  
  // Student operations
  getAllStudents(): Promise<Student[]>;
  getStudent(id: number): Promise<Student | undefined>;
  getStudentByUniversityId(universityId: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
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
  getTrainingCourseWithDetails(id: number): Promise<(TrainingCourse & { site: TrainingSite, faculty?: Faculty, supervisor?: Supervisor }) | undefined>;
  getTrainingCoursesByFaculty(facultyId: number): Promise<TrainingCourse[]>;
  getTrainingCoursesBySupervisor(supervisorId: number): Promise<TrainingCourse[]>;
  
  // Training Assignment operations
  getAllTrainingAssignments(): Promise<TrainingAssignment[]>;
  getTrainingAssignment(id: number): Promise<TrainingAssignment | undefined>;
  createTrainingAssignment(assignment: InsertTrainingAssignment): Promise<TrainingAssignment>;
  getTrainingAssignmentsByStudent(studentId: number): Promise<TrainingAssignment[]>;
  getTrainingAssignmentsByCourse(courseId: number): Promise<TrainingAssignment[]>;
  getTrainingAssignmentWithDetails(id: number): Promise<(TrainingAssignment & { 
    student: Student & { user: User }, 
    course: TrainingCourse & { site: TrainingSite } 
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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private faculties: Map<number, Faculty>;
  private majors: Map<number, Major>;
  private levels: Map<number, Level>;
  private supervisors: Map<number, Supervisor>;
  private students: Map<number, Student>;
  private trainingSites: Map<number, TrainingSite>;
  private trainingCourses: Map<number, TrainingCourse>;
  private trainingAssignments: Map<number, TrainingAssignment>;
  private evaluations: Map<number, Evaluation>;
  
  private currentUserId: number;
  private currentFacultyId: number;
  private currentMajorId: number;
  private currentLevelId: number;
  private currentSupervisorId: number;
  private currentStudentId: number;
  private currentSiteId: number;
  private currentCourseId: number;
  private currentAssignmentId: number;
  private currentEvaluationId: number;

  constructor() {
    this.users = new Map();
    this.faculties = new Map();
    this.majors = new Map();
    this.levels = new Map();
    this.supervisors = new Map();
    this.students = new Map();
    this.trainingSites = new Map();
    this.trainingCourses = new Map();
    this.trainingAssignments = new Map();
    this.evaluations = new Map();
    
    this.currentUserId = 1;
    this.currentFacultyId = 1;
    this.currentMajorId = 1;
    this.currentLevelId = 1;
    this.currentSupervisorId = 1;
    this.currentStudentId = 1;
    this.currentSiteId = 1;
    this.currentCourseId = 1;
    this.currentAssignmentId = 1;
    this.currentEvaluationId = 1;
    
    // Initialize with sample data
    this.initializeData();
  }

  // Initialize with sample data for development
  private initializeData() {
    // Add admin user
    this.createUser({
      username: "admin",
      password: "admin",
      role: "admin",
      name: "مسؤول النظام",
      email: "admin@example.com",
      active: true
    });
    
    // Create faculties
    const engineeringFaculty = this.createFaculty({ name: "كلية الهندسة" });
    const businessFaculty = this.createFaculty({ name: "كلية إدارة الأعمال" });
    const scienceFaculty = this.createFaculty({ name: "كلية العلوم" });
    
    // Create majors
    const csMajor = this.createMajor({ name: "علوم الحاسب", facultyId: scienceFaculty.id });
    const isMajor = this.createMajor({ name: "نظم المعلومات", facultyId: scienceFaculty.id });
    const ceMajor = this.createMajor({ name: "هندسة الحاسب", facultyId: engineeringFaculty.id });
    const businessMajor = this.createMajor({ name: "إدارة أعمال", facultyId: businessFaculty.id });
    
    // Create levels
    const level1 = this.createLevel({ name: "المستوى الأول" });
    const level2 = this.createLevel({ name: "المستوى الثاني" });
    const level3 = this.createLevel({ name: "المستوى الثالث" });
    const level4 = this.createLevel({ name: "المستوى الرابع" });
    const level5 = this.createLevel({ name: "المستوى الخامس" });
    const level6 = this.createLevel({ name: "المستوى السادس" });
    const level7 = this.createLevel({ name: "المستوى السابع" });
    const level8 = this.createLevel({ name: "المستوى الثامن" });
    
    // Create supervisor users
    const user1 = this.createUser({
      username: "supervisor1",
      password: "password",
      role: "supervisor",
      name: "د. خالد العمري",
      email: "supervisor1@example.com",
      active: true
    });
    
    const user2 = this.createUser({
      username: "supervisor2",
      password: "password",
      role: "supervisor",
      name: "د. سارة القحطاني",
      email: "supervisor2@example.com",
      active: true
    });
    
    const user3 = this.createUser({
      username: "supervisor3",
      password: "password",
      role: "supervisor",
      name: "د. محمد السالم",
      email: "supervisor3@example.com",
      active: true
    });
    
    // Create supervisors
    const supervisor1 = this.createSupervisor({
      userId: user1.id,
      facultyId: engineeringFaculty.id,
      department: "قسم الهندسة"
    });
    
    const supervisor2 = this.createSupervisor({
      userId: user2.id,
      facultyId: businessFaculty.id,
      department: "قسم إدارة الأعمال"
    });
    
    const supervisor3 = this.createSupervisor({
      userId: user3.id,
      facultyId: scienceFaculty.id,
      department: "قسم علوم الحاسب"
    });
    
    // Create student users
    const studentUser1 = this.createUser({
      username: "43219876",
      password: "password",
      role: "student",
      name: "محمد أحمد عبدالله",
      email: "student1@example.com",
      active: true
    });
    
    const studentUser2 = this.createUser({
      username: "43215432",
      password: "password",
      role: "student",
      name: "فاطمة محمد أحمد",
      email: "student2@example.com",
      active: true
    });
    
    const studentUser3 = this.createUser({
      username: "43217654",
      password: "password",
      role: "student",
      name: "عبدالرحمن خالد العلي",
      email: "student3@example.com",
      active: true
    });
    
    // Create students
    const student1 = this.createStudent({
      userId: studentUser1.id,
      universityId: "43219876",
      facultyId: engineeringFaculty.id,
      majorId: ceMajor.id,
      levelId: level8.id,
      supervisorId: supervisor1.id
    });
    
    const student2 = this.createStudent({
      userId: studentUser2.id,
      universityId: "43215432",
      facultyId: businessFaculty.id,
      majorId: businessMajor.id,
      levelId: level7.id,
      supervisorId: supervisor2.id
    });
    
    const student3 = this.createStudent({
      userId: studentUser3.id,
      universityId: "43217654",
      facultyId: scienceFaculty.id,
      majorId: csMajor.id,
      levelId: level6.id,
      supervisorId: supervisor3.id
    });
    
    // Create training sites
    const site1 = this.createTrainingSite({
      name: "شركة الاتصالات السعودية",
      address: "الرياض - حي العليا",
      contactName: "أحمد محمد",
      contactEmail: "contact@stc.com",
      contactPhone: "0555555555"
    });
    
    const site2 = this.createTrainingSite({
      name: "شركة أرامكو",
      address: "الدمام - حي الشاطئ",
      contactName: "خالد علي",
      contactEmail: "contact@aramco.com",
      contactPhone: "0566666666"
    });
    
    const site3 = this.createTrainingSite({
      name: "شركة علم",
      address: "الرياض - حي الملز",
      contactName: "سارة عبدالله",
      contactEmail: "contact@elm.com",
      contactPhone: "0577777777"
    });
    
    // Create training courses
    const course1 = this.createTrainingCourse({
      name: "تدريب الشبكات المتقدم",
      siteId: site1.id,
      facultyId: engineeringFaculty.id,
      supervisorId: supervisor1.id,
      startDate: new Date("2023-02-15"),
      endDate: new Date("2023-05-15"),
      description: "دورة متقدمة في تكنولوجيا الشبكات وتصميمها",
      capacity: 15,
      location: "مقر الشركة - الرياض",
      status: "active",
      createdBy: user1.id
    });
    
    const course2 = this.createTrainingCourse({
      name: "إدارة المشاريع الاحترافية",
      siteId: site2.id,
      facultyId: businessFaculty.id,
      supervisorId: supervisor2.id,
      startDate: new Date("2023-03-01"),
      endDate: new Date("2023-05-30"),
      description: "دورة في أساسيات إدارة المشاريع والتخطيط الاستراتيجي",
      capacity: 22,
      location: "مقر الشركة - الدمام",
      status: "active",
      createdBy: user2.id
    });
    
    const course3 = this.createTrainingCourse({
      name: "تطوير تطبيقات الويب",
      siteId: site3.id,
      facultyId: scienceFaculty.id,
      supervisorId: supervisor3.id,
      startDate: new Date("2023-06-10"),
      endDate: new Date("2023-08-10"),
      description: "دورة في تطوير تطبيقات الويب باستخدام التقنيات الحديثة",
      capacity: 18,
      location: "مقر الشركة - الرياض",
      status: "upcoming",
      createdBy: user3.id
    });
    
    // Create training assignments
    const assignment1 = this.createTrainingAssignment({
      studentId: student1.id,
      courseId: course1.id,
      assignedBySupervisorId: supervisor1.id,
      status: "active",
      confirmed: true
    });
    
    const assignment2 = this.createTrainingAssignment({
      studentId: student2.id,
      courseId: course2.id,
      assignedBySupervisorId: supervisor2.id,
      status: "active",
      confirmed: true
    });
    
    const assignment3 = this.createTrainingAssignment({
      studentId: student3.id,
      courseId: course3.id,
      assignedByAdminId: user1.id,
      status: "pending",
      confirmed: false
    });
    
    // Create evaluations
    this.createEvaluation({
      assignmentId: assignment1.id,
      score: 92,
      comments: "أداء ممتاز في التدريب، يتميز بالمهارات التقنية العالية",
      evaluatorName: "م. سلطان الحربي",
      createdBy: user1.id
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const createdAt = new Date();
    const user: User = { ...insertUser, id, createdAt };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async login(loginData: LoginData): Promise<User | undefined> {
    const user = await this.getUserByUsername(loginData.username);
    if (user && user.password === loginData.password) {
      return user;
    }
    return undefined;
  }

  // Faculty operations
  async getAllFaculties(): Promise<Faculty[]> {
    return Array.from(this.faculties.values());
  }

  async getFaculty(id: number): Promise<Faculty | undefined> {
    return this.faculties.get(id);
  }

  async createFaculty(insertFaculty: InsertFaculty): Promise<Faculty> {
    const id = this.currentFacultyId++;
    const faculty: Faculty = { ...insertFaculty, id };
    this.faculties.set(id, faculty);
    return faculty;
  }

  // Major operations
  async getAllMajors(): Promise<Major[]> {
    return Array.from(this.majors.values());
  }

  async getMajorsByFaculty(facultyId: number): Promise<Major[]> {
    return Array.from(this.majors.values()).filter(
      (major) => major.facultyId === facultyId
    );
  }

  async getMajor(id: number): Promise<Major | undefined> {
    return this.majors.get(id);
  }

  async createMajor(insertMajor: InsertMajor): Promise<Major> {
    const id = this.currentMajorId++;
    const major: Major = { ...insertMajor, id };
    this.majors.set(id, major);
    return major;
  }

  // Level operations
  async getAllLevels(): Promise<Level[]> {
    return Array.from(this.levels.values());
  }

  async getLevel(id: number): Promise<Level | undefined> {
    return this.levels.get(id);
  }

  async createLevel(insertLevel: InsertLevel): Promise<Level> {
    const id = this.currentLevelId++;
    const level: Level = { ...insertLevel, id };
    this.levels.set(id, level);
    return level;
  }

  // Supervisor operations
  async getAllSupervisors(): Promise<Supervisor[]> {
    return Array.from(this.supervisors.values());
  }

  async getSupervisor(id: number): Promise<Supervisor | undefined> {
    return this.supervisors.get(id);
  }

  async createSupervisor(insertSupervisor: InsertSupervisor): Promise<Supervisor> {
    const id = this.currentSupervisorId++;
    const supervisor: Supervisor = { ...insertSupervisor, id };
    this.supervisors.set(id, supervisor);
    return supervisor;
  }

  async getSupervisorWithUser(id: number): Promise<(Supervisor & { user: User }) | undefined> {
    const supervisor = await this.getSupervisor(id);
    if (!supervisor) return undefined;
    
    const user = await this.getUser(supervisor.userId);
    if (!user) return undefined;
    
    return { ...supervisor, user };
  }

  // Student operations
  async getAllStudents(): Promise<Student[]> {
    return Array.from(this.students.values());
  }

  async getStudent(id: number): Promise<Student | undefined> {
    return this.students.get(id);
  }

  async getStudentByUniversityId(universityId: string): Promise<Student | undefined> {
    return Array.from(this.students.values()).find(
      (student) => student.universityId === universityId
    );
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const id = this.currentStudentId++;
    const student: Student = { ...insertStudent, id };
    this.students.set(id, student);
    return student;
  }

  async getStudentWithDetails(id: number): Promise<(Student & { 
    user: User, 
    faculty?: Faculty, 
    major?: Major, 
    level?: Level, 
    supervisor?: Supervisor 
  }) | undefined> {
    const student = await this.getStudent(id);
    if (!student) return undefined;
    
    const user = await this.getUser(student.userId);
    if (!user) return undefined;
    
    const result: any = { ...student, user };
    
    if (student.facultyId) {
      result.faculty = await this.getFaculty(student.facultyId);
    }
    
    if (student.majorId) {
      result.major = await this.getMajor(student.majorId);
    }
    
    if (student.levelId) {
      result.level = await this.getLevel(student.levelId);
    }
    
    if (student.supervisorId) {
      result.supervisor = await this.getSupervisor(student.supervisorId);
      
      if (result.supervisor) {
        const supervisorUser = await this.getUser(result.supervisor.userId);
        if (supervisorUser) {
          result.supervisor.user = supervisorUser;
        }
      }
    }
    
    return result;
  }

  async getStudentsByFaculty(facultyId: number): Promise<Student[]> {
    return Array.from(this.students.values()).filter(
      (student) => student.facultyId === facultyId
    );
  }

  async getStudentsBySupervisor(supervisorId: number): Promise<Student[]> {
    return Array.from(this.students.values()).filter(
      (student) => student.supervisorId === supervisorId
    );
  }

  // Training Site operations
  async getAllTrainingSites(): Promise<TrainingSite[]> {
    return Array.from(this.trainingSites.values());
  }

  async getTrainingSite(id: number): Promise<TrainingSite | undefined> {
    return this.trainingSites.get(id);
  }

  async createTrainingSite(insertSite: InsertTrainingSite): Promise<TrainingSite> {
    const id = this.currentSiteId++;
    const site: TrainingSite = { ...insertSite, id };
    this.trainingSites.set(id, site);
    return site;
  }

  // Training Course operations
  async getAllTrainingCourses(): Promise<TrainingCourse[]> {
    return Array.from(this.trainingCourses.values());
  }

  async getTrainingCourse(id: number): Promise<TrainingCourse | undefined> {
    return this.trainingCourses.get(id);
  }

  async createTrainingCourse(insertCourse: InsertTrainingCourse): Promise<TrainingCourse> {
    const id = this.currentCourseId++;
    const createdAt = new Date();
    const course: TrainingCourse = { ...insertCourse, id, createdAt };
    this.trainingCourses.set(id, course);
    return course;
  }

  async getTrainingCourseWithDetails(id: number): Promise<(TrainingCourse & { 
    site: TrainingSite, 
    faculty?: Faculty, 
    supervisor?: Supervisor 
  }) | undefined> {
    const course = await this.getTrainingCourse(id);
    if (!course) return undefined;
    
    const site = await this.getTrainingSite(course.siteId);
    if (!site) return undefined;
    
    const result: any = { ...course, site };
    
    if (course.facultyId) {
      result.faculty = await this.getFaculty(course.facultyId);
    }
    
    if (course.supervisorId) {
      result.supervisor = await this.getSupervisorWithUser(course.supervisorId);
    }
    
    return result;
  }

  async getTrainingCoursesByFaculty(facultyId: number): Promise<TrainingCourse[]> {
    return Array.from(this.trainingCourses.values()).filter(
      (course) => course.facultyId === facultyId
    );
  }

  async getTrainingCoursesBySupervisor(supervisorId: number): Promise<TrainingCourse[]> {
    return Array.from(this.trainingCourses.values()).filter(
      (course) => course.supervisorId === supervisorId
    );
  }

  // Training Assignment operations
  async getAllTrainingAssignments(): Promise<TrainingAssignment[]> {
    return Array.from(this.trainingAssignments.values());
  }

  async getTrainingAssignment(id: number): Promise<TrainingAssignment | undefined> {
    return this.trainingAssignments.get(id);
  }

  async createTrainingAssignment(insertAssignment: InsertTrainingAssignment): Promise<TrainingAssignment> {
    const id = this.currentAssignmentId++;
    const assignedAt = new Date();
    const assignment: TrainingAssignment = { ...insertAssignment, id, assignedAt };
    this.trainingAssignments.set(id, assignment);
    return assignment;
  }

  async getTrainingAssignmentsByStudent(studentId: number): Promise<TrainingAssignment[]> {
    return Array.from(this.trainingAssignments.values()).filter(
      (assignment) => assignment.studentId === studentId
    );
  }

  async getTrainingAssignmentsByCourse(courseId: number): Promise<TrainingAssignment[]> {
    return Array.from(this.trainingAssignments.values()).filter(
      (assignment) => assignment.courseId === courseId
    );
  }

  async getTrainingAssignmentWithDetails(id: number): Promise<(TrainingAssignment & { 
    student: Student & { user: User }, 
    course: TrainingCourse & { site: TrainingSite } 
  }) | undefined> {
    const assignment = await this.getTrainingAssignment(id);
    if (!assignment) return undefined;
    
    const student = await this.getStudentWithDetails(assignment.studentId);
    if (!student) return undefined;
    
    const course = await this.getTrainingCourseWithDetails(assignment.courseId);
    if (!course) return undefined;
    
    return { ...assignment, student, course };
  }

  async confirmTrainingAssignment(id: number): Promise<TrainingAssignment | undefined> {
    const assignment = await this.getTrainingAssignment(id);
    if (!assignment) return undefined;
    
    const updatedAssignment: TrainingAssignment = { ...assignment, confirmed: true };
    this.trainingAssignments.set(id, updatedAssignment);
    
    return updatedAssignment;
  }

  // Evaluation operations
  async getAllEvaluations(): Promise<Evaluation[]> {
    return Array.from(this.evaluations.values());
  }

  async getEvaluation(id: number): Promise<Evaluation | undefined> {
    return this.evaluations.get(id);
  }

  async createEvaluation(insertEvaluation: InsertEvaluation): Promise<Evaluation> {
    const id = this.currentEvaluationId++;
    const evaluationDate = new Date();
    const evaluation: Evaluation = { ...insertEvaluation, id, evaluationDate };
    this.evaluations.set(id, evaluation);
    return evaluation;
  }

  async getEvaluationsByAssignment(assignmentId: number): Promise<Evaluation[]> {
    return Array.from(this.evaluations.values()).filter(
      (evaluation) => evaluation.assignmentId === assignmentId
    );
  }

  // Import/Export operations
  async importStudents(studentsData: { 
    universityId: string, 
    name: string, 
    faculty: string, 
    major: string, 
    level: string 
  }[]): Promise<{ success: number, errors: number, messages: string[] }> {
    const result = { success: 0, errors: 0, messages: [] as string[] };
    
    for (const studentData of studentsData) {
      try {
        // Check if student with this university ID already exists
        const existingStudent = await this.getStudentByUniversityId(studentData.universityId);
        if (existingStudent) {
          result.errors++;
          result.messages.push(`الطالب برقم جامعي ${studentData.universityId} موجود بالفعل`);
          continue;
        }
        
        // Find or create faculty
        let faculty = Array.from(this.faculties.values()).find(f => f.name === studentData.faculty);
        if (!faculty) {
          faculty = await this.createFaculty({ name: studentData.faculty });
        }
        
        // Find or create major
        let major = Array.from(this.majors.values()).find(
          m => m.name === studentData.major && m.facultyId === faculty.id
        );
        if (!major) {
          major = await this.createMajor({ name: studentData.major, facultyId: faculty.id });
        }
        
        // Find or create level
        let level = Array.from(this.levels.values()).find(l => l.name === studentData.level);
        if (!level) {
          level = await this.createLevel({ name: studentData.level });
        }
        
        // Create user
        const user = await this.createUser({
          username: studentData.universityId,
          password: "password", // Default password
          role: "student",
          name: studentData.name,
          active: true
        });
        
        // Create student
        await this.createStudent({
          userId: user.id,
          universityId: studentData.universityId,
          facultyId: faculty.id,
          majorId: major.id,
          levelId: level.id
        });
        
        result.success++;
      } catch (error) {
        result.errors++;
        result.messages.push(`خطأ في استيراد الطالب ${studentData.name}: ${error}`);
      }
    }
    
    return result;
  }
}

export const storage = new MemStorage();
