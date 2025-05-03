import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import * as schema from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import * as XLSX from "xlsx";
import { authMiddleware, requireRole } from "./middlewares/auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const loginData = schema.loginSchema.parse(req.body);
      const user = await storage.login(loginData);
      
      if (!user) {
        return res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }
      
      // Set user in session
      if (!req.session) {
        req.session = {} as any;
      }
      req.session.user = user;
      
      return res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "بيانات غير صالحة",
          errors: fromZodError(error).message
        });
      }
      
      return res.status(500).json({ message: "حدث خطأ في تسجيل الدخول" });
    }
  });
  
  app.get("/api/auth/me", authMiddleware, async (req: Request, res: Response) => {
    const user = req.user;
    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    });
  });
  
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session?.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "خطأ في تسجيل الخروج" });
      }
      
      res.json({ message: "تم تسجيل الخروج بنجاح" });
    });
  });

  // Faculty Routes
  app.get("/api/faculties", authMiddleware, async (req: Request, res: Response) => {
    const faculties = await storage.getAllFaculties();
    res.json(faculties);
  });
  
  // Major Routes
  app.get("/api/majors", authMiddleware, async (req: Request, res: Response) => {
    const facultyId = req.query.facultyId ? Number(req.query.facultyId) : undefined;
    
    if (facultyId) {
      const majors = await storage.getMajorsByFaculty(facultyId);
      return res.json(majors);
    }
    
    const majors = await storage.getAllMajors();
    res.json(majors);
  });
  
  // Level Routes
  app.get("/api/levels", authMiddleware, async (req: Request, res: Response) => {
    const levels = await storage.getAllLevels();
    res.json(levels);
  });
  
  // Supervisor Routes
  app.get("/api/supervisors", authMiddleware, async (req: Request, res: Response) => {
    try {
      const supervisors = await storage.getAllSupervisors();
      
      // Fetch user data for each supervisor
      const result = await Promise.all(
        supervisors.map(async (supervisor) => {
          const user = await storage.getUser(supervisor.userId);
          return { ...supervisor, user };
        })
      );
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع بيانات المشرفين" });
    }
  });
  
  app.post("/api/supervisors", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { name, username, password, email, phone, facultyId, department } = req.body;
      
      // Create user
      const user = await storage.createUser({
        username,
        password,
        role: "supervisor",
        name,
        email,
        phone,
        active: true
      });
      
      // Create supervisor
      const supervisor = await storage.createSupervisor({
        userId: user.id,
        facultyId: facultyId ? Number(facultyId) : undefined,
        department
      });
      
      res.status(201).json({ ...supervisor, user });
    } catch (error) {
      res.status(500).json({ message: "خطأ في إنشاء حساب المشرف" });
    }
  });

  // Student Routes
  app.get("/api/students", authMiddleware, async (req: Request, res: Response) => {
    try {
      let students = await storage.getAllStudents();
      
      const facultyId = req.query.facultyId ? Number(req.query.facultyId) : undefined;
      const supervisorId = req.query.supervisorId ? Number(req.query.supervisorId) : undefined;
      
      if (facultyId) {
        students = students.filter(student => student.facultyId === facultyId);
      }
      
      if (supervisorId) {
        students = students.filter(student => student.supervisorId === supervisorId);
      }
      
      // Fetch details for each student
      const result = await Promise.all(
        students.map(async (student) => {
          return await storage.getStudentWithDetails(student.id);
        })
      );
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع بيانات الطلاب" });
    }
  });
  
  // Get current student info (for logged-in student)
  app.get("/api/students/me", authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.role !== "student") {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }
      
      // Find student record by user ID
      const student = await storage.getStudentByUserId(req.user.id);
      
      if (!student) {
        return res.status(404).json({ message: "لم يتم العثور على بيانات الطالب" });
      }
      
      // Get full student details
      const studentWithDetails = await storage.getStudentWithDetails(student.id);
      res.json(studentWithDetails);
    } catch (error) {
      console.error("Error fetching student data:", error);
      res.status(500).json({ message: "خطأ في استرجاع بيانات الطالب" });
    }
  });
  
  app.get("/api/students/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const student = await storage.getStudentWithDetails(id);
      
      if (!student) {
        return res.status(404).json({ message: "الطالب غير موجود" });
      }
      
      res.json(student);
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع بيانات الطالب" });
    }
  });
  
  app.post("/api/students", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { name, universityId, email, phone, facultyId, majorId, levelId, supervisorId } = req.body;
      
      // Check if student with this university ID already exists
      const existingStudent = await storage.getStudentByUniversityId(universityId);
      if (existingStudent) {
        return res.status(400).json({ message: "الطالب برقم جامعي موجود بالفعل" });
      }
      
      // Create user
      const user = await storage.createUser({
        username: universityId,
        password: "password", // Default password
        role: "student",
        name,
        email,
        phone,
        active: true
      });
      
      // Create student
      const student = await storage.createStudent({
        userId: user.id,
        universityId,
        facultyId: facultyId ? Number(facultyId) : undefined,
        majorId: majorId ? Number(majorId) : undefined,
        levelId: levelId ? Number(levelId) : undefined,
        supervisorId: supervisorId ? Number(supervisorId) : undefined
      });
      
      res.status(201).json({ ...student, user });
    } catch (error) {
      res.status(500).json({ message: "خطأ في إنشاء حساب الطالب" });
    }
  });
  
  // Import Students from Excel
  app.post("/api/students/import", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      if (!req.body.excelData) {
        return res.status(400).json({ message: "لم يتم العثور على بيانات Excel" });
      }
      
      // Parse Base64 encoded Excel data
      const workbook = XLSX.read(req.body.excelData, { type: "base64" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      if (!data || data.length === 0) {
        return res.status(400).json({ message: "ملف Excel فارغ" });
      }
      
      // Prepare student data for import
      const studentsData = data.map((row: any) => {
        return {
          universityId: String(row["الرقم الجامعي"] || row["رقم الطالب"] || ""),
          name: String(row["اسم الطالب"] || row["الاسم"] || ""),
          faculty: String(row["الكلية"] || ""),
          major: String(row["التخصص"] || ""),
          level: String(row["المستوى"] || row["المستوى الدراسي"] || "")
        };
      });
      
      // Import students
      const result = await storage.importStudents(studentsData);
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        message: "خطأ في استيراد بيانات الطلاب", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Training Site Routes
  app.get("/api/training-sites", authMiddleware, async (req: Request, res: Response) => {
    try {
      const sites = await storage.getAllTrainingSites();
      res.json(sites);
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع بيانات جهات التدريب" });
    }
  });
  
  app.post("/api/training-sites", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { name, address, contactName, contactEmail, contactPhone } = req.body;
      
      const site = await storage.createTrainingSite({
        name,
        address,
        contactName,
        contactEmail,
        contactPhone
      });
      
      res.status(201).json(site);
    } catch (error) {
      res.status(500).json({ message: "خطأ في إنشاء جهة تدريب جديدة" });
    }
  });

  // Training Course Routes
  app.get("/api/training-courses", authMiddleware, async (req: Request, res: Response) => {
    try {
      let courses = await storage.getAllTrainingCourses();
      
      const facultyId = req.query.facultyId ? Number(req.query.facultyId) : undefined;
      const supervisorId = req.query.supervisorId ? Number(req.query.supervisorId) : undefined;
      const status = req.query.status as string | undefined;
      
      if (facultyId) {
        courses = courses.filter(course => course.facultyId === facultyId);
      }
      
      if (supervisorId) {
        courses = courses.filter(course => course.supervisorId === supervisorId);
      }
      
      if (status) {
        courses = courses.filter(course => course.status === status);
      }
      
      // Fetch details for each course
      const result = await Promise.all(
        courses.map(async (course) => {
          return await storage.getTrainingCourseWithDetails(course.id);
        })
      );
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع بيانات الدورات التدريبية" });
    }
  });
  
  app.get("/api/training-courses/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const course = await storage.getTrainingCourseWithDetails(id);
      
      if (!course) {
        return res.status(404).json({ message: "الدورة التدريبية غير موجودة" });
      }
      
      // Fetch assignments to determine student count
      const assignments = await storage.getTrainingAssignmentsByCourse(id);
      
      res.json({
        ...course,
        studentCount: assignments.length
      });
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع بيانات الدورة التدريبية" });
    }
  });
  
  app.post("/api/training-courses", authMiddleware, requireRole(["admin", "supervisor"]), async (req: Request, res: Response) => {
    try {
      const { 
        name, siteId, facultyId, supervisorId, startDate, endDate, 
        description, capacity, location, status 
      } = req.body;
      
      const course = await storage.createTrainingCourse({
        name,
        siteId: Number(siteId),
        facultyId: facultyId ? Number(facultyId) : undefined,
        supervisorId: supervisorId ? Number(supervisorId) : undefined,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        description,
        capacity: Number(capacity),
        location,
        status: status || "upcoming",
        createdBy: req.user.id
      });
      
      res.status(201).json(course);
    } catch (error) {
      res.status(500).json({ message: "خطأ في إنشاء دورة تدريبية جديدة" });
    }
  });

  // Training Assignment Routes
  app.get("/api/training-assignments", authMiddleware, async (req: Request, res: Response) => {
    try {
      let assignments = await storage.getAllTrainingAssignments();
      
      const studentId = req.query.studentId ? Number(req.query.studentId) : undefined;
      const courseId = req.query.courseId ? Number(req.query.courseId) : undefined;
      
      if (studentId) {
        assignments = assignments.filter(assignment => assignment.studentId === studentId);
      }
      
      if (courseId) {
        assignments = assignments.filter(assignment => assignment.courseId === courseId);
      }
      
      // Fetch details for each assignment
      const result = await Promise.all(
        assignments.map(async (assignment) => {
          return await storage.getTrainingAssignmentWithDetails(assignment.id);
        })
      );
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع بيانات التعيينات التدريبية" });
    }
  });
  
  app.post("/api/training-assignments", authMiddleware, requireRole(["admin", "supervisor"]), async (req: Request, res: Response) => {
    try {
      const { studentId, courseId } = req.body;
      
      // Check if assignment already exists
      const existingAssignments = await storage.getTrainingAssignmentsByStudent(Number(studentId));
      const alreadyAssigned = existingAssignments.some(a => a.courseId === Number(courseId));
      
      if (alreadyAssigned) {
        return res.status(400).json({ message: "الطالب مسجل بالفعل في هذه الدورة التدريبية" });
      }
      
      // Create assignment
      const assignment = await storage.createTrainingAssignment({
        studentId: Number(studentId),
        courseId: Number(courseId),
        assignedBySupervisorId: req.user.role === "supervisor" ? (await storage.getSupervisorByUserId(req.user.id))?.id : undefined,
        assignedByAdminId: req.user.role === "admin" ? req.user.id : undefined,
        status: "pending",
        confirmed: false
      });
      
      res.status(201).json(assignment);
    } catch (error) {
      res.status(500).json({ message: "خطأ في إنشاء تعيين تدريبي جديد" });
    }
  });
  
  app.post("/api/training-assignments/:id/confirm", authMiddleware, requireRole("student"), async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const assignment = await storage.getTrainingAssignment(id);
      
      if (!assignment) {
        return res.status(404).json({ message: "التعيين التدريبي غير موجود" });
      }
      
      // Get student id from logged in user
      const student = await storage.getStudentByUserId(req.user.id);
      
      if (!student || student.id !== assignment.studentId) {
        return res.status(403).json({ message: "غير مصرح لك بتأكيد هذا التعيين" });
      }
      
      const updatedAssignment = await storage.confirmTrainingAssignment(id);
      
      res.json(updatedAssignment);
    } catch (error) {
      res.status(500).json({ message: "خطأ في تأكيد التعيين التدريبي" });
    }
  });

  // Evaluation Routes
  app.get("/api/evaluations", authMiddleware, async (req: Request, res: Response) => {
    try {
      let evaluations = await storage.getAllEvaluations();
      
      const assignmentId = req.query.assignmentId ? Number(req.query.assignmentId) : undefined;
      
      if (assignmentId) {
        evaluations = evaluations.filter(evaluation => evaluation.assignmentId === assignmentId);
      }
      
      res.json(evaluations);
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع بيانات التقييمات" });
    }
  });
  
  app.post("/api/evaluations", authMiddleware, requireRole("supervisor"), async (req: Request, res: Response) => {
    try {
      const { assignmentId, score, comments, evaluatorName } = req.body;
      
      const evaluation = await storage.createEvaluation({
        assignmentId: Number(assignmentId),
        score: Number(score),
        comments,
        evaluatorName,
        createdBy: req.user.id
      });
      
      res.status(201).json(evaluation);
    } catch (error) {
      res.status(500).json({ message: "خطأ في إنشاء تقييم جديد" });
    }
  });

  // Add helper methods to storage
  storage.getSupervisorByUserId = async (userId: number): Promise<Supervisor | undefined> => {
    return Array.from(storage.supervisors.values()).find(
      (supervisor) => supervisor.userId === userId
    );
  };

  storage.getStudentByUserId = async (userId: number): Promise<Student | undefined> => {
    return Array.from(storage.students.values()).find(
      (student) => student.userId === userId
    );
  };

  const httpServer = createServer(app);
  return httpServer;
}
