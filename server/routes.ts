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
          try {
            const courseDetails = await storage.getTrainingCourseWithDetails(course.id);
            if (!courseDetails) {
              console.error(`Course details not found for ID ${course.id}`);
              return null;
            }

            const groups = await storage.getTrainingCourseGroupsByCourse(course.id);

            // Calculate total students across all groups
            let totalStudents = 0;
            for (const group of groups) {
              try {
                const assignments = await storage.getTrainingAssignmentsByGroup(group.id);
                totalStudents += assignments.length;
              } catch (error) {
                console.error(`Error fetching assignments for group ${group.id}:`, error);
              }
            }

            return {
              ...courseDetails,
              groups: groups,
              totalStudents: totalStudents
            };
          } catch (error) {
            console.error(`Error fetching course details for ID ${course.id}:`, error);
            return null;
          }
        })
      );

      const validResults = result.filter(course => course !== null);

      res.json(validResults);
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
      const { name, facultyId, majorId, levelId, description, status, groups } = req.body;

      console.log("Creating course with groups in single transaction:", { name, groupsCount: groups?.length });

      // إنشاء الدورة والمجموعات في عملية واحدة
      const result = await storage.createTrainingCourseWithGroups({
        name,
        facultyId: facultyId ? Number(facultyId) : undefined,
        majorId: majorId ? Number(majorId) : undefined,
        levelId: levelId ? Number(levelId) : undefined,
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
            courseData: { name, facultyId, majorId, levelId, description, groupsCount: result.groups.length }
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
      const supervisorId = req.query.supervisorId ? Number(req.query.supervisorId) : undefined;

      if (supervisorId) {
        // Get groups assigned to this supervisor with full details
        const allGroups = await storage.getAllTrainingCourseGroups();
        const supervisorGroups = allGroups.filter(group => group.supervisorId === supervisorId);
        
        // Fetch complete details for each group
        const result = await Promise.all(
          supervisorGroups.map(async (group) => {
            try {
              // Get course details
              const course = await storage.getTrainingCourseWithDetails(group.courseId);
              if (!course) return null;

              // Get site details
              const site = await storage.getTrainingSite(group.siteId);

              // Get supervisor details
              const supervisor = await storage.getSupervisorWithUser(group.supervisorId);

              // Get students in this group
              const assignments = await storage.getTrainingAssignmentsByGroup(group.id);
              const students = await Promise.all(
                assignments.map(async (assignment) => {
                  const student = await storage.getStudentWithDetails(assignment.studentId);
                  const evaluations = await storage.getEvaluationsByAssignment(assignment.id);
                  const evaluation = evaluations.length > 0 ? evaluations[0] : null;
                  return {
                    ...student,
                    grade: evaluation?.score || null
                  };
                })
              );

              return {
                id: group.id,
                courseId: group.courseId,
                groupName: group.groupName,
                siteId: group.siteId,
                supervisorId: group.supervisorId,
                startDate: group.startDate,
                endDate: group.endDate,
                capacity: group.capacity,
                currentEnrollment: assignments.length,
                location: group.location,
                status: group.status,
                course: course || { name: "دورة غير محددة", status: "unknown" },
                site: site || { name: "موقع غير محدد" },
                supervisor: supervisor,
                students: students.filter(s => s !== null)
              };
            } catch (error) {
              console.error(`Failed to fetch details for group ${group.id}:`, error);
              return null;
            }
          })
        );

        const validGroups = result.filter(group => group !== null);
        res.json(validGroups);
      } else if (available || (facultyId && majorId && levelId)) {
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
      console.error("Error in /api/training-course-groups:", error);
      res.status(500).json({ message: "خطأ في استرجاع بيانات مجموعات التدريب" });
    }
  });

  app.get("/api/training-course-groups/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const groupWithStudents = await storage.getTrainingCourseGroupWithStudents(id);

      if (!groupWithStudents) {
        return res.status(404).json({ message: "مجموعة التدريب غير موجودة" });
      }

      res.json({
        ...groupWithStudents,
        studentCount: groupWithStudents.students.length,
        availableSpots: groupWithStudents.capacity - groupWithStudents.students.length
      });
    } catch (error) {
      console.error("Error fetching group with students:", error);
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

      // Fetch complete details for each assignment including course data
      const result = await Promise.all(
        assignments.map(async (assignment) => {
          try {
            // Get group details with course and site information
            const group = await storage.getTrainingCourseGroup(assignment.groupId);
            if (!group) return null;

            // Get course details
            const course = await storage.getTrainingCourseWithDetails(group.courseId);
            if (!course) return null;

            // Get site details
            const site = await storage.getTrainingSite(group.siteId);

            // Get supervisor details
            const supervisor = group.supervisorId ? await storage.getSupervisorWithUser(group.supervisorId) : null;

            // Get evaluation if exists
            const evaluations = await storage.getEvaluationsByAssignment(assignment.id);
            const evaluation = evaluations.length > 0 ? evaluations[0] : null;

            return {
              id: assignment.id,
              studentId: assignment.studentId,
              groupId: assignment.groupId,
              status: assignment.status,
              confirmed: assignment.confirmed,
              assignedDate: assignment.assignedDate,
              course: {
                id: course.id,
                name: course.name,
                description: course.description,
                startDate: group.startDate,
                endDate: group.endDate,
                location: group.location,
                status: course.status,
                site: site || { name: "غير محدد" },
                supervisor: supervisor || null
              },
              evaluation: evaluation
            };
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

      // Fetch complete details for each assignment
      const result = await Promise.all(
        assignments.map(async (assignment) => {
          try {
            // Get group details with course and site information
            const group = await storage.getTrainingCourseGroup(assignment.groupId);
            if (!group) return null;

            // Get course details
            const course = await storage.getTrainingCourseWithDetails(group.courseId);
            if (!course) return null;

            // Get site details
            const site = await storage.getTrainingSite(group.siteId);

            // Get supervisor details
            const supervisor = group.supervisorId ? await storage.getSupervisorWithUser(group.supervisorId) : null;

            // Get evaluation if exists
            const evaluations = await storage.getEvaluationsByAssignment(assignment.id);
            const evaluation = evaluations.length > 0 ? evaluations[0] : null;

            return {
              id: assignment.id,
              studentId: assignment.studentId,
              groupId: assignment.groupId,
              status: assignment.status,
              confirmed: assignment.confirmed,
              assignedDate: assignment.assignedDate,
              course: {
                id: course.id,
                name: course.name,
                description: course.description,
                startDate: group.startDate,
                endDate: group.endDate,
                location: group.location,
                status: course.status,
                site: site || { name: "غير محدد" },
                supervisor: supervisor || null
              },
              evaluation: evaluation
            };
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
                courseId: assignment ? assignment.groupId : null,
                courseName: "تقييم دورة تدريبية",
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

  // Get course students with complete details
  app.get("/api/training-courses/:id/students", authMiddleware, async (req: Request, res: Response) => {
    try {
      const courseId = Number(req.params.id);
      
      // Get all groups for this course
      const groups = await storage.getTrainingCourseGroupsByCourse(courseId);
      const courseStudents = [];

      for (const group of groups) {
        const groupWithStudents = await storage.getTrainingCourseGroupWithStudents(group.id);
        if (groupWithStudents) {
          groupWithStudents.students.forEach(student => {
            courseStudents.push({
              student: student,
              group: {
                id: group.id,
                name: group.groupName
              }
            });
          });
        }
      }

      res.json(courseStudents);
    } catch (error) {
      console.error("Error fetching course students:", error);
      res.status(500).json({ message: "خطأ في استرجاع بيانات طلاب الدورة" });
    }
  });

  // Get course evaluations
  app.get("/api/training-courses/:id/evaluations", authMiddleware, async (req: Request, res: Response) => {
    try {
      const courseId = Number(req.params.id);
      
      // Get all groups for this course
      const groups = await storage.getTrainingCourseGroupsByCourse(courseId);
      const courseEvaluations = [];

      for (const group of groups) {
        const assignments = await storage.getTrainingAssignmentsByGroup(group.id);
        for (const assignment of assignments) {
          const evaluations = await storage.getEvaluationsByAssignment(assignment.id);
          courseEvaluations.push(...evaluations);
        }
      }

      res.json(courseEvaluations);
    } catch (error) {
      console.error("Error fetching course evaluations:", error);
      res.status(500).json({ message: "خطأ في استرجاع بيانات تقييمات الدورة" });
    }
  });

  // Reports API endpoints
  app.get("/api/reports/students", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      // Get all students with their evaluations and course details
      const students = await storage.getAllStudents();
      const studentsReport = [];

      for (const student of students) {
        const studentDetails = await storage.getStudentWithDetails(student.id);
        if (!studentDetails) continue;

        const assignments = await storage.getTrainingAssignmentsByStudent(student.id);
        const courses = [];

        for (const assignment of assignments) {
          const evaluations = await storage.getEvaluationsByAssignment(assignment.id);
          if (evaluations.length > 0) {
            const group = await storage.getTrainingCourseGroupWithStudents(assignment.groupId);
            if (group) {
              const supervisorDetails = await storage.getSupervisorWithUser(group.supervisorId);
              
              for (const evaluation of evaluations) {
                courses.push({
                  id: group.course.id,
                  name: group.course.name,
                  grade: evaluation.score,
                  groupName: group.groupName,
                  site: group.site.name,
                  supervisor: supervisorDetails?.user?.name || 'غير محدد'
                });
              }
            }
          }
        }

        if (courses.length > 0) {
          studentsReport.push({
            id: student.id,
            name: studentDetails.user.name,
            universityId: student.universityId,
            faculty: studentDetails.faculty?.name || 'غير محدد',
            major: studentDetails.major?.name || 'غير محدد',
            level: studentDetails.level?.name || 'غير محدد',
            courses: courses
          });
        }
      }

      res.json(studentsReport);
    } catch (error) {
      console.error("Error fetching students report:", error);
      res.status(500).json({ message: "خطأ في استرجاع تقرير الطلاب" });
    }
  });

  app.get("/api/reports/courses", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      // Get all completed courses with evaluations
      const courses = await storage.getAllTrainingCourses();
      const coursesReport = [];

      for (const course of courses) {
        const courseDetails = await storage.getTrainingCourseWithDetails(course.id);
        if (!courseDetails) continue;

        const groups = await storage.getTrainingCourseGroupsByCourse(course.id);
        const courseGroups = [];
        let hasEvaluations = false;

        for (const group of groups) {
          const groupWithStudents = await storage.getTrainingCourseGroupWithStudents(group.id);
          if (!groupWithStudents) continue;

          const assignments = await storage.getTrainingAssignmentsByGroup(group.id);
          let completedEvaluations = 0;
          let totalGrades = 0;
          let gradeCount = 0;

          for (const assignment of assignments) {
            const evaluations = await storage.getEvaluationsByAssignment(assignment.id);
            if (evaluations.length > 0) {
              completedEvaluations++;
              hasEvaluations = true;
              for (const evaluation of evaluations) {
                if (evaluation.score) {
                  totalGrades += evaluation.score;
                  gradeCount++;
                }
              }
            }
          }

          const supervisorDetails = await storage.getSupervisorWithUser(group.supervisorId);
          
          courseGroups.push({
            id: group.id,
            name: group.groupName,
            site: groupWithStudents.site.name,
            supervisor: supervisorDetails?.user?.name || 'غير محدد',
            studentsCount: groupWithStudents.students.length,
            averageGrade: gradeCount > 0 ? totalGrades / gradeCount : 0,
            completedEvaluations: completedEvaluations
          });
        }

        if (hasEvaluations) {
          coursesReport.push({
            id: course.id,
            name: course.name,
            faculty: courseDetails.faculty?.name || 'غير محدد',
            major: courseDetails.major?.name || 'غير محدد',
            level: 'غير محدد', // Add level to course schema if needed
            status: course.status || 'active',
            groups: courseGroups
          });
        }
      }

      res.json(coursesReport);
    } catch (error) {
      console.error("Error fetching courses report:", error);
      res.status(500).json({ message: "خطأ في استرجاع تقرير الدورات" });
    }
  });

  // Get supervisor's course assignments (when admin assigns supervisor to courses/groups)
  app.get("/api/supervisor/course-assignments", authMiddleware, requireRole("supervisor"), async (req: Request, res: Response) => {
    try {
      // Get supervisor info
      const supervisor = await storage.getSupervisorByUserId(req.user!.id);
      if (!supervisor) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }

      // Get all groups assigned to this supervisor with course and site details
      const allGroups = await storage.getAllTrainingCourseGroups();
      const supervisorGroups = allGroups.filter(group => group.supervisorId === supervisor.id);

      const courseAssignments = [];
      for (const group of supervisorGroups) {
        // Get full group details with course and site
        const groupWithDetails = await storage.getTrainingCourseGroupWithStudents(group.id);
        if (groupWithDetails) {
          // Get course details
          const courseDetails = await storage.getTrainingCourseWithDetails(groupWithDetails.courseId);
          
          courseAssignments.push({
            id: group.id,
            supervisorId: supervisor.id,
            course: {
              name: groupWithDetails.course.name,
              faculty: courseDetails?.faculty?.name || 'غير محدد',
              major: courseDetails?.major?.name || 'غير محدد'
            },
            groupName: group.groupName,
            site: {
              name: groupWithDetails.site.name
            },
            assignedAt: group.createdAt || new Date().toISOString(),
            assignedBy: 'المسؤول'
          });
        }
      }

      res.json(courseAssignments);
    } catch (error) {
      console.error("Error fetching supervisor course assignments:", error);
      res.status(500).json({ message: "خطأ في استرجاع تعيينات المشرف للكورسات" });
    }
  });

  // Get students for a specific course with enrollment status
  app.get("/api/students/for-course/:courseId", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const courseId = parseInt(req.params.courseId);
      
      // Get course details to filter students by faculty, major, and level
      const course = await storage.getTrainingCourseWithDetails(courseId);
      if (!course) {
        return res.status(404).json({ message: "الكورس غير موجود" });
      }

      // Get all students that match the course criteria
      const allStudents = await storage.getAllStudents();
      const matchingStudents = [];

      for (const student of allStudents) {
        const studentDetails = await storage.getStudentWithDetails(student.id);
        if (!studentDetails) continue;

        // Check if student matches course criteria
        if (studentDetails.faculty?.id === course.facultyId && 
            studentDetails.major?.id === course.majorId &&
            studentDetails.level?.id === course.levelId) {
          
          // Check if student is already enrolled in this course
          const assignments = await storage.getTrainingAssignmentsByStudent(student.id);
          let isEnrolled = false;
          let enrollmentDetails = null;

          for (const assignment of assignments) {
            const group = await storage.getTrainingCourseGroupWithStudents(assignment.groupId);
            if (group && group.courseId === courseId) {
              isEnrolled = true;
              const supervisorDetails = await storage.getSupervisorWithUser(group.supervisorId);
              enrollmentDetails = {
                groupName: group.groupName,
                trainingSite: group.site.name,
                supervisor: supervisorDetails?.user?.name || 'غير محدد'
              };
              break;
            }
          }

          matchingStudents.push({
            id: student.id,
            universityId: student.universityId,
            user: studentDetails.user,
            faculty: studentDetails.faculty,
            major: studentDetails.major,
            level: studentDetails.level,
            isEnrolled,
            enrolledGroup: enrollmentDetails?.groupName,
            trainingSite: enrollmentDetails?.trainingSite,
            supervisor: enrollmentDetails?.supervisor
          });
        }
      }

      res.json(matchingStudents);
    } catch (error) {
      console.error("Error fetching students for course:", error);
      res.status(500).json({ message: "خطأ في استرجاع الطلاب للكورس" });
    }
  });

  // Mark notifications as read
  app.post("/api/notifications/mark-read", authMiddleware, async (req: Request, res: Response) => {
    try {
      // This is a simple implementation - in a real app you might want to track read status per user
      res.json({ message: "تم تحديد الإشعارات كمقروءة" });
    } catch (error) {
      res.status(500).json({ message: "خطأ في تحديث الإشعارات" });
    }
  });

  // API endpoint to save student grades
  app.post("/api/students/grade", authMiddleware, requireRole("supervisor"), async (req: Request, res: Response) => {
    try {
      const { studentId, groupId, grade } = req.body;

      if (!studentId || !groupId || grade === undefined || grade < 0 || grade > 100) {
        return res.status(400).json({ message: "بيانات غير صحيحة" });
      }

      // Get supervisor info
      const supervisor = await storage.getSupervisorByUserId(req.user!.id);
      if (!supervisor) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }

      // Get group and course details
      const group = await storage.getTrainingCourseGroupWithStudents(groupId);
      if (!group) {
        return res.status(404).json({ message: "المجموعة غير موجودة" });
      }

      // Check if supervisor is assigned to this group
      if (group.supervisorId !== supervisor.id) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذه المجموعة" });
      }

      // Check if student is in this group
      const studentInGroup = group.students.find(s => s.id === studentId);
      if (!studentInGroup) {
        return res.status(404).json({ message: "الطالب غير موجود في هذه المجموعة" });
      }

      // Get student details with academic info
      const student = await storage.getStudentWithDetails(studentId);
      if (!student) {
        return res.status(404).json({ message: "الطالب غير موجود" });
      }

      // Find assignment for this student and group
      const assignments = await storage.getTrainingAssignmentsByGroup(groupId);
      const assignment = assignments.find(a => a.studentId === studentId);
      
      if (!assignment) {
        return res.status(404).json({ message: "لا يوجد تعيين للطالب في هذه المجموعة" });
      }

      // Get supervisor details
      const supervisorWithUser = await storage.getSupervisorWithUser(supervisor.id);

      // Create or update evaluation
      const evaluation = await storage.createEvaluation({
        assignmentId: assignment.id,
        score: Math.round(grade),
        comments: `درجة الطالب: ${grade}/100`,
        evaluatorName: supervisorWithUser?.user?.name || 'المشرف',
        evaluationDate: new Date(),
        createdBy: req.user!.id
      });

      // Send notification to admin
      await logActivity(
        req.user!.id,
        "grade_entry",
        "evaluation",
        evaluation.id,
        {
          message: `المشرف ${supervisorWithUser?.user?.name || 'غير محدد'} قد أدخل درجات الكورس "${group.course.name}" - ${group.groupName}`,
          details: {
            supervisorName: supervisorWithUser?.user?.name || 'غير محدد',
            courseName: group.course.name,
            groupName: group.groupName,
            studentName: student.user.name,
            studentId: student.universityId,
            grade: grade,
            faculty: student.faculty?.name || 'غير محدد',
            major: student.major?.name || 'غير محدد',
            level: student.level?.name || 'غير محدد'
          }
        },
        req.ip
      );

      res.json({
        message: "تم حفظ الدرجة بنجاح وإرسال إشعار للمسؤول",
        evaluation
      });

    } catch (error) {
      console.error("Error saving grade:", error);
      res.status(500).json({ message: "خطأ في حفظ الدرجة" });
    }
  });

  // Helper methods are already implemented in DatabaseStorage

  const httpServer = createServer(app);
  return httpServer;
}