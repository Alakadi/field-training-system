import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import * as schema from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import * as XLSX from "xlsx";
import { authMiddleware, requireRole } from "./middlewares/auth";

// Helper function to log activities
async function logActivity(
  userId: number | null, 
  action: string, 
  entityType: string, 
  entityId: number | null = null, 
  details: any = {}, 
  ipAddress: string | null = null
): Promise<void> {
  try {
    await storage.logActivity({
      userId,
      action,
      entityType,
      entityId,
      details,
      ipAddress
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Activity logs route
  app.get("/api/activity-logs", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const logs = await storage.getAllActivityLogs();

      // Log this activity view
      if (req.user) {
        await logActivity(
          req.user.id,
          "view",
          "activity_logs",
          null,
          { message: "عرض سجلات النشاط" },
          req.ip
        );
      }

      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع سجلات النشاط" });
    }
  });

  // Auth routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      console.log("Login attempt:", req.body); // إضافة للتصحيح
      const loginData = schema.loginSchema.parse(req.body);

      // محاولة التسجيل عبر الدالة الأساسية
      let user = await storage.login(loginData);

      // إذا لم تنجح محاولة تسجيل الدخول، نحاول البحث عن المستخدم مباشرة
      if (!user) {
        console.log("Login failed, trying direct lookup"); // إضافة للتصحيح

        // البحث عن المستخدم بناءً على اسم المستخدم
        const userByUsername = await storage.getUserByUsername(loginData.username);

        console.log("Found user by username:", userByUsername ? "yes" : "no"); // إضافة للتصحيح

        // التحقق من كلمة المرور
        if (userByUsername && userByUsername.password === loginData.password) {
          user = userByUsername;
          console.log("Password matched for direct lookup"); // إضافة للتصحيح
        }
      }

      if (!user) {
        console.log("Login failed: Invalid credentials"); // إضافة للتصحيح
        return res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }

      console.log("Login successful for:", user.username); // إضافة للتصحيح

      // Set user in session
      if (!req.session) {
        req.session = {} as any;
      }
      req.session.user = user;

      // Log login activity
      try {
        await logActivity(
          user.id,
          "login",
          "user",
          user.id,
          { message: `تم تسجيل الدخول` },
          req.ip
        );
      } catch (logError) {
        console.error("Error logging activity:", logError);
        // لا نريد أن تفشل عملية تسجيل الدخول بسبب خطأ في تسجيل النشاط
      }

      return res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      });
    } catch (error) {
      console.error("Login error:", error); // إضافة للتصحيح

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
    if (!user) {
      return res.status(401).json({ error: "غير مخول" });
    }
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

  // Get current supervisor info (for logged-in supervisor)
  app.get("/api/supervisors/me", authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.role !== "supervisor") {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }

      // Find supervisor record by user ID
      const supervisor = await storage.getSupervisorByUserId(req.user.id);

      if (!supervisor) {
        return res.status(404).json({ message: "لم يتم العثور على بيانات المشرف" });
      }

      // Get full supervisor details
      const supervisorWithUser = await storage.getSupervisorWithUser(supervisor.id);
      res.json(supervisorWithUser);
    } catch (error) {
      console.error("Error fetching supervisor data:", error);
      res.status(500).json({ message: "خطأ في استرجاع بيانات المشرف" });
    }
  });

  // Get students assigned to supervisor through training groups
  app.get("/api/supervisors/:id/students", authMiddleware, async (req: Request, res: Response) => {
    try {
      const supervisorId = Number(req.params.id);
      
      // Check if user has access to view this supervisor's students
      if (req.user?.role !== "admin") {
        if (req.user?.role !== "supervisor") {
          return res.status(403).json({ message: "غير مصرح بالوصول" });
        }
        
        // Supervisor can only view their own students
        const supervisor = await storage.getSupervisorByUserId(req.user.id);
        if (!supervisor || supervisor.id !== supervisorId) {
          return res.status(403).json({ message: "غير مصرح بالوصول" });
        }
      }

      const students = await storage.getStudentsBySupervisorThroughGroups(supervisorId);
      res.json(students);
    } catch (error) {
      console.error("Error fetching supervisor students:", error);
      res.status(500).json({ message: "خطأ في استرجاع بيانات طلاب المشرف" });
    }
  });

  app.get("/api/supervisors/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const supervisor = await storage.getSupervisor(id);

      if (!supervisor) {
        return res.status(404).json({ message: "المشرف غير موجود" });
      }

      // Get user data
      const user = await storage.getUser(supervisor.userId);

      if (!user) {
        return res.status(404).json({ message: "بيانات المستخدم غير موجودة" });
      }

      res.json({ ...supervisor, user });
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع بيانات المشرف" });
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

      // Log activity
      if (req.user) {
        await logActivity(
          req.user.id,
          "create",
          "supervisor",
          supervisor.id,
          { 
            message: `تم إنشاء حساب مشرف: ${name}`,
            supervisorData: { name, username, facultyId, department }
          },
          req.ip
        );
      }

      res.status(201).json({ ...supervisor, user });
    } catch (error) {
      res.status(500).json({ message: "خطأ في إنشاء حساب المشرف" });
    }
  });

  app.put("/api/supervisors/:id", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { name, username, email, phone, facultyId, department, active } = req.body;

      // Get existing supervisor
      const supervisor = await storage.getSupervisor(id);
      if (!supervisor) {
        return res.status(404).json({ message: "المشرف غير موجود" });
      }

      // Update user data
      const updatedUser = await storage.updateUser(supervisor.userId, {
        username,
        name,
        email,
        phone,
        active
      });

      // Update supervisor data
      const updatedSupervisor = await storage.updateSupervisor(id, {
        facultyId: facultyId ? Number(facultyId) : undefined,
        department
      });

      // Log activity
      if (req.user) {
        await logActivity(
          req.user.id,
          "update",
          "supervisor",
          supervisor.id,
          { 
            message: `تم تحديث بيانات المشرف: ${name}`,
            supervisorData: { name, username, facultyId, department, active }
          },
          req.ip
        );
      }

      res.json({ ...updatedSupervisor, user: updatedUser });
    } catch (error) {
      res.status(500).json({ message: "خطأ في تحديث بيانات المشرف" });
    }
  });
  // Student Routes
  app.get("/api/students", authMiddleware, async (req: Request, res: Response) => {
    try {
      let students = await storage.getAllStudents();

      const facultyId = req.query.facultyId ? Number(req.query.facultyId) : undefined;
      const majorId = req.query.majorId ? Number(req.query.majorId) : undefined;
      const levelId = req.query.levelId ? Number(req.query.levelId) : undefined;

      if (facultyId) {
        students = students.filter(student => student.facultyId === facultyId);
      }

      if (majorId) {
        students = students.filter(student => student.majorId === majorId);
      }

      if (levelId) {
        students = students.filter(student => student.levelId === levelId);
      }

      // Fetch details for each student
      const result = await Promise.all(
        students.map(async (student) => {
          return await storage.getStudentWithDetails(student.id);
        })
      );

      // Filter out any null results
      const validResults = result.filter(student => student !== undefined);

      res.json(validResults);
    } catch (error) {
      console.error("Error fetching students:", error);
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

  app.put("/api/students/:id", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { name, email, phone, facultyId, majorId, levelId, active } = req.body;

      // تحقق من وجود الطالب
      const student = await storage.getStudent(id);
      if (!student) {
        return res.status(404).json({ message: "الطالب غير موجود" });
      }

      // تحديث بيانات الطالب
      const updatedStudent = await storage.updateStudent(
        id,
        {
          facultyId: facultyId ? Number(facultyId) : student.facultyId,
          majorId: majorId ? Number(majorId) : student.majorId,
          levelId: levelId ? Number(levelId) : student.levelId
        },
        {
          name: name || undefined,
          email: email || null,
          phone: phone || null,
          active: active !== undefined ? active : undefined
        }
      );

      // تسجيل النشاط
      if (req.user) {
        await logActivity(
          req.user.id,
          "update",
          "student",
          id,
          { 
            message: `تم تحديث بيانات الطالب: ${name || 'غير محدد'}`,
            studentData: { name, email, phone, facultyId, majorId, levelId }
          },
          req.ip
        );
      }

      const updatedStudentWithDetails = await storage.getStudentWithDetails(id);
      res.json(updatedStudentWithDetails);
    } catch (error) {
      console.error("Error updating student:", error);
      res.status(500).json({ message: "خطأ في تحديث بيانات الطالب" });
    }
  });

  app.post("/api/students", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { name, universityId, email, phone, facultyId, majorId, levelId } = req.body;

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
        levelId: levelId ? Number(levelId) : undefined
      });

      // Log activity
      if (req.user) {
        await logActivity(
          req.user.id,
          "create",
          "student",
          student.id,
          { 
            message: `تم إنشاء حساب طالب: ${name}`,
            studentData: { name, universityId, facultyId, majorId, levelId }
          },
          req.ip
        );
      }

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
          universityId: String(
            row["الرقم الجامعي"] || 
            row["رقم الطالب"] || 
            row["university_id"] || 
            row["University ID"] || 
            ""
          ).trim(),
          name: String(
            row["اسم الطالب"] || 
            row["الاسم"] || 
            row["name"] || 
            row["Name"] || 
            ""
          ).trim(),
          faculty: String(
            row["الكلية"] || 
            row["Faculty"] || 
            row["faculty"] || 
            row["كلية"] || 
            ""
          ).trim(),
          major: String(
            row["التخصص"] || 
            row["Major"] || 
            row["major"] || 
            row["تخصص"] || 
            ""
          ).trim(),
          level: String(
            row["المستوى"] || 
            row["المستوى الدراسي"] || 
            row["Level"] || 
            row["level"] || 
            row["مستوى"] || 
            ""
          ).trim()
        };
      });

      // Import students
      console.log(`Starting import of ${studentsData.length} students`);
      const result = await storage.importStudents(studentsData);

      // Log the import activity
      if (req.user) {
        await logActivity(
          req.user.id,
          "import",
          "students",
          null,
          { 
            message: `تم استيراد بيانات الطلاب`,
            importData: {
              totalRecords: studentsData.length,
              successCount: result.success,
              errorCount: result.errors,
              fileName: "Excel file"
            }
          },
          req.ip
        );
      }

      console.log(`Import completed: ${result.success} success, ${result.errors} errors`);
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

      // Log activity
      if (req.user) {
        await logActivity(
          req.user.id,
          "create",
          "training_site",
          site.id,
          { 
            message: `تم إنشاء جهة تدريب: ${name}`,
            siteData: { name, address, contactName, contactEmail, contactPhone }
          },
          req.ip
        );
      }

      res.status(201).json(site);
    } catch (error) {
      res.status(500).json({ message: "خطأ في إنشاء جهة تدريب جديدة" });
    }
  });

  // Update course statuses based on dates
  app.post("/api/training-courses/update-status", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      await storage.updateCourseStatusBasedOnDates();

      // Log activity
      if (req.user) {
        await logActivity(
          req.user.id,
          "update",
          "training_course",
          null,
          { message: "تم تحديث حالات الدورات بناءً على التواريخ" },
          req.ip
        );
      }

      res.json({ message: "تم تحديث حالات الدورات بنجاح" });
    } catch (error) {
      res.status(500).json({ message: "خطأ في تحديث حالات الدورات" });
    }
  });

  // Training Course Routes
  app.get("/api/training-courses", authMiddleware, async (req: Request, res: Response) => {
    try {
      // Update course statuses before fetching
      await storage.updateCourseStatusBasedOnDates();

      let courses = await storage.getAllTrainingCourses();

      const facultyId = req.query.facultyId ? Number(req.query.facultyId) : undefined;
      const status = req.query.status as string | undefined;

      if (facultyId) {
        courses = courses.filter(course => course.facultyId === facultyId);
      }

      if (status) {
        courses = courses.filter(course => course.status === status);
      }

      // Fetch details for each course including groups and student counts
      const result = await Promise.all(
        courses.map(async (course) => {
          const courseDetails = await storage.getTrainingCourseWithDetails(course.id);
          const groups = await storage.getTrainingCourseGroupsByCourse(course.id);

          // Calculate total students across all groups
          let totalStudents = 0;
          for (const group of groups) {
            const assignments = await storage.getTrainingAssignmentsByGroup(group.id);
            totalStudents += assignments.length;
          }

          return {
            ...courseDetails,
            groups: groups,
            totalStudents: totalStudents
          };
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

      // Fetch groups for this course to determine student count
      const groups = await storage.getTrainingCourseGroupsByCourse(id);
      const totalEnrolled = groups.reduce((sum, group) => sum + (group.currentEnrollment || 0), 0);

      res.json({
        ...course,
        groups: groups,
        totalStudents: totalEnrolled
      });
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع بيانات الدورة التدريبية" });
    }
  });

  app.post("/api/training-courses", authMiddleware, requireRole(["admin", "supervisor"]), async (req: Request, res: Response) => {
    try {
      const { name, facultyId, majorId, description, status, groups } = req.body;

      console.log("Creating course with groups in single transaction:", { name, groupsCount: groups?.length });

      // إنشاء الدورة والمجموعات في عملية واحدة
      const result = await storage.createTrainingCourseWithGroups({
        name,
        facultyId: facultyId ? Number(facultyId) : undefined,
        majorId: majorId ? Number(majorId) : undefined,
        description,
        status: status || "active",
        createdBy: req.user?.id
      }, groups || []);

      // Log activity
      if (req.user) {
        await logActivity(
          req.user.id,
          "create",
          "training_course",
          result.course.id,
          { 
            message: `تم إنشاء دورة تدريبية مع ${result.groups.length} مجموعة: ${name}`,
            courseData: { name, facultyId, majorId, description, groupsCount: result.groups.length }
          },
          req.ip
        );
      }

      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating course with groups:", error);
      res.status(500).json({ message: "خطأ في إنشاء دورة تدريبية جديدة" });
    }
  });

  // Training Course Groups Routes
  app.get("/api/training-course-groups", authMiddleware, async (req: Request, res: Response) => {
    try {
      const courseId = req.query.courseId ? Number(req.query.courseId) : undefined;
      const majorId = req.query.majorId ? Number(req.query.majorId) : undefined;
      const facultyId = req.query.facultyId ? Number(req.query.facultyId) : undefined;
      const levelId = req.query.levelId ? Number(req.query.levelId) : undefined;
      const available = req.query.available === 'true';

      if (available || (facultyId && majorId && levelId)) {
        // Get groups with available spots for student registration
        const groups = await storage.getTrainingCourseGroupsWithAvailableSpots(facultyId, majorId, levelId);
        res.json(groups);
      } else if (courseId) {
        const groups = await storage.getTrainingCourseGroupsByCourse(courseId);
        res.json(groups);
      } else {
        const groups = await storage.getAllTrainingCourseGroups();
        res.json(groups);
      }
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع بيانات مجموعات التدريب" });
    }
  });

  app.get("/api/training-course-groups/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const group = await storage.getTrainingCourseGroup(id);

      if (!group) {
        return res.status(404).json({ message: "مجموعة التدريب غير موجودة" });
      }

      // Get assignments for this group
      const assignments = await storage.getTrainingAssignmentsByGroup(id);

      res.json({
        ...group,
        studentCount: assignments.length,
        availableSpots: group.capacity - (group.currentEnrollment || 0)
      });
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع بيانات مجموعة التدريب" });
    }
  });

  app.post("/api/training-course-groups", authMiddleware, requireRole(["admin", "supervisor"]), async (req: Request, res: Response) => {
    try {
      const { 
        courseId, groupName, siteId, supervisorId, startDate, endDate, 
        capacity, location, status 
      } = req.body;

      console.log("Received training course group data:", req.body);
      console.log("CourseId type and value:", typeof courseId, courseId);

      // Validate required fields
      if (!courseId || !siteId || !supervisorId || !startDate || !endDate || !capacity) {
        console.log("Missing required fields:", {
          courseId: !courseId,
          siteId: !siteId,
          supervisorId: !supervisorId,
          startDate: !startDate,
          endDate: !endDate,
          capacity: !capacity
        });
        return res.status(400).json({ 
          message: "جميع الحقول مطلوبة",
          missing: {
            courseId: !courseId,
            siteId: !siteId,
            supervisorId: !supervisorId,
            startDate: !startDate,
            endDate: !endDate,
            capacity: !capacity
          }
        });
      }

      // Validate numeric fields
      const numericCourseId = Number(courseId);
      const numericSiteId = Number(siteId);
      const numericSupervisorId = Number(supervisorId);
      const numericCapacity = Number(capacity);

      if (isNaN(numericCourseId) || isNaN(numericSiteId) || isNaN(numericSupervisorId) || isNaN(numericCapacity)) {
        return res.status(400).json({ 
          message: "قيم رقمية غير صالحة",
          values: {
            courseId: numericCourseId,
            siteId: numericSiteId,
            supervisorId: numericSupervisorId,
            capacity: numericCapacity
          }
        });
      }

      // Check if course exists
      const course = await storage.getTrainingCourse(numericCourseId);
      if (!course) {
        return res.status(404).json({ message: "الدورة التدريبية غير موجودة" });
      }

      // Determine group status based on dates
      const currentDate = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD format
      let groupStatus = 'upcoming';

      if (startDate && endDate) {
        if (currentDate >= startDate && currentDate <= endDate) {
          groupStatus = 'active';
        } else if (currentDate > endDate) {
          groupStatus = 'completed';
        }
      }

      const group = await storage.createTrainingCourseGroup({
        courseId: numericCourseId,
        groupName: groupName || `مجموعة ${Date.now()}`,
        siteId: numericSiteId,
        supervisorId: numericSupervisorId,
        startDate: startDate,
        endDate: endDate,
        capacity: numericCapacity,
        currentEnrollment: 0,
        location,
        status: groupStatus,
        createdBy: req.user?.id
      });

      console.log("Training course group created successfully:", group);

      // Update course status based on its groups
      const allGroups = await storage.getTrainingCourseGroupsByCourse(Number(courseId));
      const courseStatuses = allGroups.map(g => {
        if (g.startDate && g.endDate) {
          if (currentDate >= g.startDate && currentDate <= g.endDate) {
            return 'active';
          } else if (currentDate > g.endDate) {
            return 'completed';
          }
        }
        return 'upcoming';
      });

      // Determine overall course status
      let courseStatus = 'upcoming';
      if (courseStatuses.includes('active')) {
        courseStatus = 'active';
      } else if (courseStatuses.every(s => s === 'completed')) {
        courseStatus = 'completed';
      }

      // Update course status
      await storage.updateCourseStatus(Number(courseId), courseStatus);

      // Log activity
      if (req.user) {
        await logActivity(
          req.user.id,
          "create",
          "training_course_group",
          group.id,
          { 
            message: `تم إنشاء مجموعة تدريب: ${groupName}`,
            groupData: { courseId, groupName, siteId, supervisorId, capacity, startDate, endDate, status: groupStatus }
          },
          req.ip
        );
      }

      res.status(201).json(group);
    } catch (error) {
      console.error("Error creating training course group:", error);
      res.status(500).json({ message: "خطأ في إنشاء مجموعة تدريب جديدة" });
    }
  });

  // Training Assignment Routes
  app.get("/api/training-assignments/student", authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.role !== "student") {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }

      // Get current student
      const student = await storage.getStudentByUserId(req.user.id);

      if (!student) {
        return res.status(404).json({ message: "لم يتم العثور على بيانات الطالب" });
      }

      // Get assignments for current student
      const assignments = await storage.getTrainingAssignmentsByStudent(student.id);

      // Fetch details for each assignment
      const result = await Promise.all(
        assignments.map(async (assignment) => {
          try {
            const details = await storage.getTrainingAssignmentWithDetails(assignment.id);
            return details || null;
          } catch (error) {
            console.error(`Failed to fetch details for assignment ${assignment.id}:`, error);
            return null;
          }
        })
      );

      // Filter out null values
      const validAssignments = result.filter(assignment => assignment !== null);

      res.json(validAssignments);
    } catch (error) {
      console.error("Error in /api/training-assignments/student:", error);
      res.status(500).json({ message: "خطأ في استرجاع بيانات التعيينات التدريبية" });
    }
  });

  app.get("/api/training-assignments", authMiddleware, async (req: Request, res: Response) => {
    try {
      let assignments = await storage.getAllTrainingAssignments();

      const studentId = req.query.studentId ? Number(req.query.studentId) : undefined;
      const courseId = req.query.courseId ? Number(req.query.courseId) : undefined;

      if (studentId) {
        assignments = assignments.filter(assignment => assignment.studentId === studentId);
      }

      const groupId = req.query.groupId ? Number(req.query.groupId) : undefined;

      if (groupId) {
        assignments = assignments.filter(assignment => assignment.groupId === groupId);
      }

      // Fetch details for each assignment
      const result = await Promise.all(
        assignments.map(async (assignment) => {
          try {
            return await storage.getTrainingAssignmentWithDetails(assignment.id);
          } catch (error) {
            console.error(`Failed to fetch details for assignment ${assignment.id}:`, error);
            return null;
          }
        })
      );

      // Filter out null values
      const validAssignments = result.filter(assignment => assignment !== null);

      res.json(validAssignments);
    } catch (error) {
      console.error("Error in /api/training-assignments:", error);
      res.status(500).json({ message: "خطأ في استرجاع بيانات التعيينات التدريبية" });
    }
  });

  app.post("/api/training-assignments", authMiddleware, requireRole(["admin", "supervisor"]), async (req: Request, res: Response) => {
    try {
      const { studentId, groupId } = req.body;

      // Check if group has available spots
      const group = await storage.getTrainingCourseGroup(Number(groupId));
      if (!group) {
        return res.status(404).json({ message: "مجموعة التدريب غير موجودة" });
      }

      if ((group.currentEnrollment || 0) >= group.capacity) {
        return res.status(400).json({ message: "المجموعة ممتلئة" });
      }

      // Check if student is already enrolled in this group
      const existingAssignments = await storage.getTrainingAssignmentsByStudent(Number(studentId));
      const alreadyEnrolled = existingAssignments.some(assignment => assignment.groupId === Number(groupId));

      if (alreadyEnrolled) {
        return res.status(400).json({ message: "الطالب مسجل بالفعل في هذه المجموعة" });
      }

      const assignment = await storage.createTrainingAssignment({
        studentId: Number(studentId),
        groupId: Number(groupId),
        assignedBySupervisorId: req.user?.role === "supervisor" ? (await storage.getSupervisorByUserId(req.user.id))?.id : undefined,
        assignedByAdminId: req.user?.role === "admin" ? req.user.id : undefined,
        status: "pending"
      });

      // Log activity
      if (req.user) {
        const student = await storage.getStudent(Number(studentId));
        const studentUser = student ? await storage.getUser(student.userId) : null;

        await logActivity(
          req.user.id,
          "create",
          "training_assignment",
          assignment.id,
          { 
            message: `تم تعيين طالب لمجموعة التدريب`,
            assignmentData: { 
              studentId,
              studentName: studentUser?.name,
              groupName: group.groupName,
              assignedBy: req.user.name,
              assignedByRole: req.user.role
            }
          },
          req.ip
        );
      }

      res.status(201).json(assignment);
    } catch (error) {
      res.status(500).json({ message: "خطأ في إنشاء تعيين تدريبي" });
    }
  });

  // Student self-registration endpoint
  app.post("/api/training-assignments/register", authMiddleware, requireRole("student"), async (req: Request, res: Response) => {
    try {
      const { groupId } = req.body;

      if (!req.user) {
        return res.status(401).json({ message: "غير مصرح بالوصول" });
      }

      // Get current student
      const student = await storage.getStudentByUserId(req.user.id);
      if (!student) {
        return res.status(404).json({ message: "لم يتم العثور على بيانات الطالب" });
      }

      // Get group details
      const group = await storage.getTrainingCourseGroup(Number(groupId));
      if (!group) {
        return res.status(404).json({ message: "مجموعة التدريب غير موجودة" });
      }

      // Get course details to check major compatibility
      const course = await storage.getTrainingCourse(group.courseId);
      if (!course) {
        return res.status(404).json({ message: "الدورة التدريبية غير موجودة" });
      }

      // Check if course is for student's major
      if (course.majorId && student.majorId !== course.majorId) {
        return res.status(403).json({ message: "هذه الدورة غير متاحة لتخصصك" });
      }

      // Check if group has available spots
      if ((group.currentEnrollment || 0) >= group.capacity) {
        return res.status(400).json({ message: "المجموعة ممتلئة" });
      }

      // Check if student is already enrolled in this group or any group for the same course
      const existingAssignments = await storage.getTrainingAssignmentsByStudent(student.id);
      const alreadyEnrolledInCourse = existingAssignments.some(assignment => {
        // We need to check if any assignment is for the same course
        return assignment.groupId === Number(groupId);
      });

      if (alreadyEnrolledInCourse) {
        return res.status(400).json({ message: "أنت مسجل بالفعل في هذه المجموعة" });
      }

      // Create assignment with student confirmation
      const assignment = await storage.createTrainingAssignment({
        studentId: student.id,
        groupId: Number(groupId),
        status: "active",
        confirmed: true // Student is registering themselves
      });

      // Log activity
      await logActivity(
        req.user.id,
        "register",
        "training_assignment",
        assignment.id,
        { 
          message: `قام الطالب بالتسجيل في مجموعة التدريب`,
          assignmentData: { 
            studentId: student.id,
            studentName: req.user.name,
            groupName: group.groupName,
            courseName: course.name
          }
        },
        req.ip
      );

      res.status(201).json({
        ...assignment,
        message: "تم التسجيل بنجاح في مجموعة التدريب"
      });
    } catch (error) {
      res.status(500).json({ message: "خطأ في التسجيل في مجموعة التدريب" });
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
      if (!req.user) {
        return res.status(401).json({ message: "غير مخول" });
      }
      const student = await storage.getStudentByUserId(req.user.id);

      if (!student || student.id !== assignment.studentId) {
        return res.status(403).json({ message: "غير مصرح لك بتأكيد هذا التعيين" });
      }

      const updatedAssignment = await storage.confirmTrainingAssignment(id);

      // Log activity
      if (req.user && student) {
        const studentUser = await storage.getUser(student.userId);

        if (studentUser) {
          await logActivity(
            req.user.id,
            "confirm",
            "training_assignment",
            assignment.id,
            { 
              message: `تم تأكيد التسجيل في الدورة التدريبية`,
              confirmationData: { 
                assignmentId: assignment.id,
                studentId: student.id,
                studentName: studentUser.name
              }
            },
            req.ip
          );
        }
      }

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
        createdBy: req.user?.id || 0
      });

      // Log activity
      if (req.user) {
        // Get assignment details
        const assignment = await storage.getTrainingAssignment(Number(assignmentId));
        if (assignment) {
          const student = assignment.studentId ? await storage.getStudent(assignment.studentId) : null;
          const studentUser = student ? await storage.getUser(student.userId) : null;

          await logActivity(
            req.user.id,
            "create",
            "evaluation",
            evaluation.id,
            { 
              message: `تم إنشاء تقييم للطالب: ${studentUser?.name}`,
              evaluationData: { 
                assignmentId,
                studentId: student?.id,
                studentName: studentUser?.name,
                courseId: course?.id,
                courseName: course?.name,
                score
              }
            },
            req.ip
          );
        }
      }

      res.status(201).json(evaluation);
    } catch (error) {
      res.status(500).json({ message: "خطأ في إنشاء تقييم جديد" });
    }
  });

  // Add helper methods to storage for MemStorage compatibility
  if (!storage.getSupervisorByUserId) {
    storage.getSupervisorByUserId = async (userId: number): Promise<Supervisor | undefined> => {
      if ('supervisors' in storage) {
        return Array.from((storage as any).supervisors.values()).find(
          (supervisor) => supervisor.userId === userId
        );
      }
      // For DatabaseStorage, this method is already implemented
      return undefined;
    };
  }

  if (!storage.getStudentByUserId) {
    storage.getStudentByUserId = async (userId: number): Promise<Student | undefined> => {
      if ('students' in storage) {
        return Array.from((storage as any).students.values()).find(
          (student) => student.userId === userId
        );
      }
      // For DatabaseStorage, this method is already implemented
      return undefined;
    };
  }

  const httpServer = createServer(app);
  return httpServer;
}