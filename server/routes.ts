import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import * as schema from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import * as XLSX from "xlsx";
import { authMiddleware, requireRole } from "./middlewares/auth";
import { applyFieldAccessControl, filterSensitiveData } from "./middlewares/field-access";
import { NotificationService } from "./services/notification-service";

// Initialize notification service
const notificationService = new NotificationService(storage);

// الأنشطة الأمنية المهمة التي يجب تسجيلها
const SECURITY_ACTIVITIES = {
  // إدارة الدرجات
  'grades': ['create', 'update', 'bulk_update'],
  // تسجيل الطلاب في المجموعات
  'training_assignments': ['create', 'update', 'delete', 'register', 'transfer'],
  // عمليات المسؤول المهمة
  'users': ['create', 'update', 'delete', 'toggle_active'],
  'students': ['create', 'update', 'delete', 'toggle_active', 'import'],
  'supervisors': ['create', 'update', 'delete', 'toggle_active'],
  'training_courses': ['create', 'update', 'delete'],
  'training_course_groups': ['create', 'update', 'delete'],
  'faculties': ['create', 'update', 'delete'],
  'majors': ['create', 'update', 'delete'],
  'academic_years': ['create', 'update', 'delete']
};

// Helper function to log security activities only
async function logSecurityActivity(
  username: string | null, 
  action: string, 
  entityType: string, 
  entityId: number | null = null, 
  details: any = {}
): Promise<void> {
  try {
    // تحقق من أن النشاط أمني مهم
    const allowedActions = SECURITY_ACTIVITIES[entityType];
    if (!allowedActions || !allowedActions.includes(action)) {
      return; // لا تسجل النشاط إذا لم يكن أمنياً مهماً
    }

    await storage.logActivity({
      username,
      action,
      entityType,
      entityId,
      details
    });
  } catch (error) {
    console.error("Error logging security activity:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Activity logs route
  app.get("/api/activity-logs", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      console.log("Getting activity logs...");
      const logs = await storage.getAllActivityLogs();
      console.log("Retrieved logs:", logs.length);

      // لا نسجل عرض سجلات النشاط لأنه ليس نشاطاً أمنياً مهماً

      res.json(logs);
    } catch (error) {
      console.error("Error in activity logs API:", error);
      res.status(500).json({ message: "خطأ في استرجاع سجلات النشاط" });
    }
  });

  // Auth routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const loginData = schema.loginSchema.parse(req.body);

      // محاولة التسجيل عبر الدالة الأساسية
      const user = await storage.login(loginData);

      if (!user) {
        return res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }

      // التحقق من أن الحساب نشط
      if (user.active === false) {
        return res.status(403).json({ message: "تم إلغاء تنشيط حسابك، يرجى مراجعة مدير النظام" });
      }

      // Set user in session
      if (!req.session) {
        req.session = {} as any;
      }
      req.session.user = user;

      // Log login activity
      try {
        await logSecurityActivity(
          user.username,
          "login",
          "users",
          user.id,
          { message: `تم تسجيل الدخول` }
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
      console.error("Login error:", error);

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

    // Return user data without sensitive information
    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email,
      phone: user.phone,
      active: user.active
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

  // Update user profile (available for all roles)
  app.put("/api/auth/profile", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { name, email, phone, currentPassword, newPassword } = req.body;
      const userId = req.user!.id;

      // If changing password, verify current password
      if (newPassword && currentPassword) {
        const user = await storage.getUser(userId);
        if (!user || user.password !== currentPassword) {
          return res.status(400).json({ message: "كلمة المرور الحالية غير صحيحة" });
        }
      }

      // Prepare update data
      const updateData: any = {};
      if (name && name.trim()) updateData.name = name.trim();
      if (email !== undefined) updateData.email = email ? email.trim() : null;
      if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
      if (newPassword && newPassword.trim()) updateData.password = newPassword.trim();

      // Update user
      const updatedUser = await storage.updateUser(userId, updateData);

      if (!updatedUser) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }

      // Log activity
      await logSecurityActivity(
        req.user!.username,
        "update",
        "users",
        userId,
        { 
          message: `تم تحديث الملف الشخصي`,
          updatedFields: Object.keys(updateData).filter(key => key !== 'password')
        }
      );

      // Return user without password
      const { password, ...userWithoutPassword } = updatedUser;
      res.json({ 
        message: "تم تحديث الملف الشخصي بنجاح",
        user: userWithoutPassword 
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "خطأ في تحديث الملف الشخصي" });
    }
  });

  // Change username (admin only, or user changing their own)
  app.put("/api/auth/username", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { newUsername, targetUserId } = req.body;
      const currentUser = req.user!;
      const userId = targetUserId || currentUser.id;

      // Check permissions
      if (targetUserId && currentUser.role !== "admin") {
        return res.status(403).json({ message: "غير مصرح لك بتغيير اسم مستخدم آخر" });
      }

      // Validate new username
      if (!newUsername || newUsername.trim().length < 3) {
        return res.status(400).json({ message: "اسم المستخدم يجب أن يكون 3 أحرف على الأقل" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(newUsername.trim());
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: "اسم المستخدم موجود بالفعل" });
      }

      // Update username
      const updatedUser = await storage.updateUser(userId, { username: newUsername.trim() });

      if (!updatedUser) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }

      // Log activity
      await logSecurityActivity(
        currentUser.username,
        "update",
        "users",
        userId,
        { 
          message: `تم تغيير اسم المستخدم إلى: ${newUsername.trim()}`,
          oldUsername: currentUser.username,
          newUsername: newUsername.trim()
        }
      );

      res.json({ 
        message: "تم تغيير اسم المستخدم بنجاح",
        username: updatedUser.username 
      });
    } catch (error) {
      console.error("Error changing username:", error);
      res.status(500).json({ message: "خطأ في تغيير اسم المستخدم" });
    }
  });

  // Faculty Routes
  app.get("/api/faculties", authMiddleware, async (req: Request, res: Response) => {
    const faculties = await storage.getAllFaculties();
    res.json(faculties);
  });

  app.post("/api/faculties", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { name } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ message: "اسم الكلية مطلوب" });
      }

      const faculty = await storage.createFaculty({ name: name.trim() });
      await logSecurityActivity(req.user!.username, "create", "faculties", faculty.id, { message: `تم إنشاء كلية: ${name}` });

      res.status(201).json(faculty);
    } catch (error) {
      console.error("Error creating faculty:", error);
      res.status(500).json({ message: "فشل في إضافة الكلية" });
    }
  });

  app.put("/api/faculties/:id", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { name } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ message: "اسم الكلية مطلوب" });
      }

      const faculty = await storage.updateFaculty(id, { name: name.trim() });
      if (!faculty) {
        return res.status(404).json({ message: "الكلية غير موجودة" });
      }

      await logSecurityActivity(req.user!.username, "update", "faculties", id, { message: `تم تعديل كلية: ${name}` });

      res.json(faculty);
    } catch (error) {
      console.error("Error updating faculty:", error);
      res.status(500).json({ message: "فشل في تحديث الكلية" });
    }
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

  app.post("/api/majors", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { name, facultyId } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ message: "اسم التخصص مطلوب" });
      }

      if (!facultyId) {
        return res.status(400).json({ message: "يجب تحديد الكلية" });
      }

      // Check if faculty exists
      const faculty = await storage.getFaculty(facultyId);
      if (!faculty) {
        return res.status(400).json({ message: "الكلية المحددة غير موجودة" });
      }

      const major = await storage.createMajor({ name: name.trim(), facultyId });
      await logSecurityActivity(req.user!.username, "create", "majors", major.id, { message: `تم إنشاء تخصص: ${name}` });

      res.status(201).json(major);
    } catch (error) {
      console.error("Error creating major:", error);
      res.status(500).json({ message: "فشل في إضافة التخصص" });
    }
  });

  app.put("/api/majors/:id", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { name, facultyId } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ message: "اسم التخصص مطلوب" });
      }

      if (!facultyId) {
        return res.status(400).json({ message: "يجب تحديد الكلية" });
      }

      // Check if faculty exists
      const faculty = await storage.getFaculty(facultyId);
      if (!faculty) {
        return res.status(400).json({ message: "الكلية المحددة غير موجودة" });
      }

      const major = await storage.updateMajor(id, { name: name.trim(), facultyId });
      if (!major) {
        return res.status(404).json({ message: "التخصص غير موجود" });
      }

      await logSecurityActivity(req.user!.username, "update", "majors", id, { message: `تم تعديل تخصص: ${name}` });

      res.json(major);
    } catch (error) {
      console.error("Error updating major:", error);
      res.status(500).json({ message: "فشل في تحديث التخصص" });
    }
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

      // Apply field access control based on user role
      const filteredResults = result.map(supervisor => 
        filterSensitiveData(supervisor, req.user!.role, 'supervisors')
      );

      res.json(filteredResults);
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

      console.log("Creating supervisor with data:", { name, username, email, phone, facultyId, department });

      // Validate required fields
      if (!name || !username || !password) {
        return res.status(400).json({ message: "اسم المشرف واسم المستخدم وكلمة المرور مطلوبة" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "اسم المستخدم موجود بالفعل" });
      }

      // Check for duplicate email
      if (email) {
        const existingEmailUser = await storage.getUserByEmail(email);
        if (existingEmailUser) {
          return res.status(400).json({ message: "مستخدم بهذا البريد الإلكتروني موجود بالفعل" });
        }
      }

      // Check for duplicate phone
      if (phone) {
        const existingPhoneUser = await storage.getUserByPhone(phone);
        if (existingPhoneUser) {
          return res.status(400).json({ message: "مستخدم بهذا رقم الهاتف موجود بالفعل" });
        }
      }

      // Create user
      console.log("Creating user...");
      const user = await storage.createUser({
        username,
        password,
        role: "supervisor",
        name,
        email: email || null,
        phone: phone || null,
        active: true
      });
      console.log("User created with ID:", user.id);

      // Create supervisor
      console.log("Creating supervisor...");

      // معالجة facultyId بشكل صحيح
      let processedFacultyId = null;
      if (facultyId && facultyId !== 'none' && facultyId !== '' && !isNaN(Number(facultyId))) {
        processedFacultyId = Number(facultyId);
      }

      const supervisor = await storage.createSupervisor({
        userId: user.id,
        facultyId: processedFacultyId,
        department: department || null
      });
      console.log("Supervisor created with ID:", supervisor.id);

      // Log activity
      if (req.user) {
        await logSecurityActivity(
          req.user.username,
          "create",
          "supervisors",
          supervisor.id,
          { 
            message: `تم إنشاء حساب مشرف: ${name}`,
            supervisorData: { name, username, facultyId, department }
          }
        );
      }

      res.status(201).json({ ...supervisor, user });
    } catch (error) {
      console.error("Error creating supervisor:", error);
      res.status(500).json({ 
        message: "خطأ في إنشاء حساب المشرف",
        error: error instanceof Error ? error.message : "خطأ غير معروف"
      });
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
      // معالجة facultyId بشكل صحيح
      let processedFacultyId = undefined;
      if (facultyId && facultyId !== 'none' && facultyId !== '' && !isNaN(Number(facultyId))) {
        processedFacultyId = Number(facultyId);
      } else if (facultyId === 'none' || facultyId === '') {
        processedFacultyId = null;
      }

      const updatedSupervisor = await storage.updateSupervisor(id, {
        facultyId: processedFacultyId,
        department
      });

      // Log activity
      if (req.user) {
        await logSecurityActivity(
          req.user.username,
          "update",
          "supervisors",
          supervisor.id,
          { 
            message: `تم تحديث بيانات المشرف: ${name}`,
            supervisorData: { name, username, facultyId, department, active }
          }
        );
      }

      res.json({ ...updatedSupervisor, user: updatedUser });
    } catch (error) {
      res.status(500).json({ message: "خطأ في تحديث بيانات المشرف" });
    }
  });

  // Toggle supervisor active status
  app.put("/api/supervisors/:id/toggle-active", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { active } = req.body;

      // Get existing supervisor
      const supervisor = await storage.getSupervisor(id);
      if (!supervisor) {
        return res.status(404).json({ message: "المشرف غير موجود" });
      }

      // Update user active status
      const updatedUser = await storage.updateUser(supervisor.userId, {
        active: Boolean(active)
      });

      // Log activity
      if (req.user) {
        await logSecurityActivity(
          req.user.username,
          "toggle_active",
          "supervisors",
          supervisor.id,
          { 
            message: `تم ${active ? 'تنشيط' : 'إلغاء تنشيط'} حساب المشرف`,
            action: active ? 'activate' : 'deactivate'
          }
        );
      }

      res.json({ message: `تم ${active ? 'تنشيط' : 'إلغاء تنشيط'} المشرف بنجاح`, user: updatedUser });
    } catch (error) {
      res.status(500).json({ message: "خطأ في تحديث حالة المشرف" });
    }
  });

  // Delete supervisor
  app.delete("/api/supervisors/:id", authMiddleware, requireRole(["admin", "supervisor"]), async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const currentUser = req.user!;

      // Get existing supervisor
      const supervisor = await storage.getSupervisor(id);
      if (!supervisor) {
        return res.status(404).json({ message: "المشرف غير موجود" });
      }

      // Check if supervisor is trying to delete themselves (only admins can delete supervisors)
      if (currentUser.role === "supervisor") {
        const currentSupervisor = await storage.getSupervisorByUserId(currentUser.id);
        if (!currentSupervisor || currentSupervisor.id !== id) {
          return res.status(403).json({ message: "غير مصرح لك بحذف هذا المشرف" });
        }
      }

      // Check if supervisor has any active assignments
      const activeAssignments = await storage.getActiveAssignmentsBySupervisor(id);
      if (activeAssignments.length > 0) {
        return res.status(400).json({ 
          message: "لا يمكن حذف المشرف لأنه مُعين لمجموعات نشطة. يرجى إلغاء تعيينه أولاً أو انتظار انتهاء الدورات" 
        });
      }

      // Get supervisor details for logging
      const supervisorDetails = await storage.getSupervisorWithUser(id);

      // Delete supervisor (this will also delete the user)
      await storage.deleteSupervisor(id);

      // Log activity
      await logSecurityActivity(
        currentUser.username,
        "delete",
        "supervisors",
        id,
        { 
          message: `تم حذف المشرف: ${supervisorDetails?.user.name}`,
          supervisorName: supervisorDetails?.user.name
        }
      );

      res.json({ message: "تم حذف المشرف بنجاح" });
    } catch (error) {
      console.error("Error deleting supervisor:", error);
      res.status(500).json({ message: "خطأ في حذف المشرف" });
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

      // Apply field access control based on user role
      const filteredResults = validResults.map(student => 
        filterSensitiveData(student, req.user!.role, 'students')
      );

      res.json(filteredResults);
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
        await logSecurityActivity(
          req.user.username,
          "update",
          "students",
          id,
          { 
            message: `تم تحديث بيانات الطالب: ${name || 'غير محدد'}`,
            studentData: { name, email, phone, facultyId, majorId, levelId }
          }
        );
      }

      const updatedStudentWithDetails = await storage.getStudentWithDetails(id);
      res.json(updatedStudentWithDetails);
    } catch (error) {
      console.error("Error updating student:", error);
      res.status(500).json({ message: "خطأ في تحديث بيانات الطالب" });
    }
  });

  // Toggle student active status
  app.put("/api/students/:id/toggle-active", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { active } = req.body;

      // Get existing student
      const student = await storage.getStudent(id);
      if (!student) {
        return res.status(404).json({ message: "الطالب غير موجود" });
      }

      // Update user active status
      const updatedUser = await storage.updateUser(student.userId, {
        active: Boolean(active)
      });

      // Log activity
      if (req.user) {
        await logSecurityActivity(
          req.user.username,
          "toggle_active",
          "students",
          student.id,
          { 
            message: `تم ${active ? 'تنشيط' : 'إلغاء تنشيط'} حساب الطالب`,
            action: active ? 'activate' : 'deactivate'
          }
        );
      }

      res.json({ message: `تم ${active ? 'تنشيط' : 'إلغاء تنشيط'} الطالب بنجاح`, user: updatedUser });
    } catch (error) {
      res.status(500).json({ message: "خطأ في تحديث حالة الطالب" });
    }
  });

  // Delete student
  app.delete("/api/students/:id", authMiddleware, requireRole(["admin", "supervisor"]), async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);

      // Get existing student
      const student = await storage.getStudent(id);
      if (!student) {
        return res.status(404).json({ message: "الطالب غير موجود" });
      }

      // Check if student has any active assignments
      const activeAssignments = await storage.getActiveAssignmentsByStudent(id);
      if (activeAssignments.length > 0) {
        return res.status(400).json({ 
          message: "لا يمكن حذف الطالب لأنه مُسجل في دورات نشطة. يرجى إلغاء تسجيله أولاً أو انتظار انتهاء الدورات" 
        });
      }

      // Get student details for logging
      const studentDetails = await storage.getStudentWithDetails(id);

      // Delete student (this will also delete the user)
      await storage.deleteStudent(id);

      // Log activity
      await logSecurityActivity(
        req.user!.username,
        "delete",
        "students",
        id,
        { 
          message: `تم حذف الطالب: ${studentDetails?.user.name}`,
          studentName: studentDetails?.user.name,
          universityId: studentDetails?.universityId
        }
      );

      res.json({ message: "تم حذف الطالب بنجاح" });
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(500).json({ message: "خطأ في حذف الطالب" });
    }
  });

  app.post("/api/students", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { name, universityId, email, phone, facultyId, majorId, levelId } = req.body;

      if (!name || !universityId) {
        return res.status(400).json({ message: "الاسم والرقم الجامعي مطلوبان" });
      }

      // Check for duplicate university ID
      const existingStudent = await storage.getStudentByUniversityId(universityId);
      if (existingStudent) {
        return res.status(400).json({ message: "طالب بهذا الرقم الجامعي موجود بالفعل" });
      }

      // Check for duplicate email
      if (email) {
        const existingEmailUser = await storage.getUserByEmail(email);
        if (existingEmailUser) {
          return res.status(400).json({ message: "مستخدم بهذا البريد الإلكتروني موجود بالفعل" });
        }
      }

      // Check for duplicate phone
      if (phone) {
        const existingPhoneUser = await storage.getUserByPhone(phone);
        if (existingPhoneUser) {
          return res.status(400).json({ message: "مستخدم بهذا رقم الهاتف موجود بالفعل" });
        }
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
        await logSecurityActivity(
          req.user.username,
          "create",
          "students",
          student.id,
          { 
            message: `تم إنشاء حساب طالب: ${name}`,
            studentData: { name, universityId, facultyId, majorId, levelId }
          }
        );
      }

      res.status(201).json({ ...student, user });
    } catch (error) {
      console.error("Error creating student:", error);
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
        await logSecurityActivity(
          req.user.username,
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
          }
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
        await logSecurityActivity(
          req.user.username,
          "create",
          "training_sites",
          site.id,
          { 
            message: `تم إنشاء جهة تدريب: ${name}`,
            siteData: { name, address, contactName, contactEmail, contactPhone }
          }
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
        await logSecurityActivity(
          req.user.username,
          "update",
          "training_courses",
          null,
          { message: "تم تحديث حالات الدورات بناءً على التواريخ" }
        );
      }

      res.json({ message: "تم تحديث حالات الدورات بنجاح" });
    } catch (error) {
      res.status(500).json({ message: "خطأ في تحديث حالات الدورات" });
    }
  });

  // Get courses with their groups for students
  app.get("/api/courses-with-groups", authMiddleware, async (req: Request, res: Response) => {
    try {
      const coursesWithGroups = await storage.getCoursesWithGroups();
      res.json(coursesWithGroups);
    } catch (error) {
      console.error("Error fetching courses with groups:", error);
      res.status(500).json({ message: "خطأ في جلب الدورات والمجموعات" });
    }
  });

  // Training Course Routes
  app.get("/api/training-courses", authMiddleware, async (req: Request, res: Response) => {
    try {
      // تحديث الحالة فقط إذا لم يتم التحديث اليوم (تحسين الأداء)
      const { courseStatusUpdater } = await import('./schedulers/course-status-updater');
      await courseStatusUpdater.updateIfNeeded();

      const facultyId = req.query.facultyId ? Number(req.query.facultyId) : undefined;
      const academicYearId = req.query.academicYearId ? Number(req.query.academicYearId) : undefined;
      const status = req.query.status as string | undefined;
      const userRole = req.user?.role;

      let courses: any[] = [];

      // Filter courses based on user role
      if (userRole === 'student') {
        // Students see only upcoming/active courses + their enrolled courses (including completed ones they're enrolled in)
        const studentRecord = req.user?.id ? await storage.getStudentByUserId(req.user.id) : null;
        if (studentRecord) {
          // Get available courses for registration (upcoming + active only)
          const availableCourses = await storage.getAvailableCoursesForStudents();

          // Get enrolled courses (all statuses including completed)
          const enrolledCourses = await storage.getEnrolledCoursesForStudent(studentRecord.id);

          // Combine courses, marking which ones the student is enrolled in
          const allCourseIds = new Set();
          const combinedCourses = [];

          // Add available courses first
          for (const course of availableCourses) {
            if (!allCourseIds.has(course.id)) {
              allCourseIds.add(course.id);
              combinedCourses.push({ ...course, isEnrolled: false });
            }
          }

          // Add enrolled courses (even if completed)
          for (const course of enrolledCourses) {
            if (!allCourseIds.has(course.id)) {
              allCourseIds.add(course.id);
              combinedCourses.push({ ...course, isEnrolled: true });
            } else {
              // Mark existing course as enrolled
              const existingCourse = combinedCourses.find(c => c.id === course.id);
              if (existingCourse) {
                existingCourse.isEnrolled = true;
              }
            }
          }

          courses = combinedCourses;
        } else {
          courses = await storage.getAvailableCoursesForStudents();
        }
      } else {
        // Admin and supervisors see all courses
        courses = await storage.getAllTrainingCourses();
      }

      if (facultyId) {
        courses = courses.filter(course => course.facultyId === facultyId);
      }

      if (academicYearId) {
        courses = courses.filter(course => course.academicYearId === academicYearId);
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

            // Calculate total students using direct course relationship
            const assignments = await storage.getTrainingAssignmentsByCourse(course.id);
            const totalStudents = assignments.length;

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

      console.log("Training course with groups created successfully:", result);

      // Log activity with academic year information
      if (req.user) {
        const logMessage = result.academicYearMessage 
          ? `تم إنشاء دورة تدريبية مع ${result.groups.length} مجموعة: ${name}. ${result.academicYearMessage}`
          : `تم إنشاء دورة تدريبية مع ${result.groups.length} مجموعة: ${name}`;

        await logSecurityActivity(
          req.user.username,
          "create",
          "training_courses",
          result.course.id,
          { 
            message: logMessage,
            courseData: { 
              name, 
              facultyId, 
              majorId, 
              levelId, 
              description, 
              groupsCount: result.groups.length,
              academicYearId: result.course.academicYearId,
              academicYearMessage: result.academicYearMessage
            }
          }
        );
      }

      // Return result with success message
      const responseData = {
        ...result,
        message: result.academicYearMessage 
          ? `تم إنشاء الدورة بنجاح. ${result.academicYearMessage}`
          : "تم إنشاء الدورة بنجاح"
      };

      res.status(201).json(responseData);
    } catch (error) {
      console.error("Error creating course with groups:", error);
      res.status(500).json({ message: "خطأ في إنشاء دورة تدريبية جديدة" });
    }
  });

  // Delete training course
  app.delete("/api/training-courses/:id", authMiddleware, requireRole(["admin", "supervisor"]), async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);

      // Get existing course
      const course = await storage.getTrainingCourse(id);
      if (!course) {
        return res.status(404).json({ message: "الدورة التدريبية غير موجودة" });
      }

      // Check if course has any active assignments
      const assignments = await storage.getTrainingAssignmentsByCourse(id);
      if (assignments.length > 0) {
        return res.status(400).json({ 
          message: "لا يمكن حذف الدورة التدريبية لأنها تحتوي على طلاب مسجلين. يرجى إلغاء تسجيل جميع الطلاب أولاً" 
        });
      }

      // Get course details for logging
      const courseDetails = await storage.getTrainingCourseWithDetails(id);

      // Delete course (this will also delete related groups)
      await storage.deleteTrainingCourse(id);

      // Log activity
      await logSecurityActivity(
        req.user!.username,
        "delete",
        "training_courses",
        id,
        { 
          message: `تم حذف الدورة التدريبية: ${courseDetails?.name}`,
          courseName: courseDetails?.name
        }
      );

      res.json({ message: "تم حذف الدورة التدريبية بنجاح" });
    } catch (error) {
      console.error("Error deleting training course:", error);
      res.status(500).json({ message: "خطأ في حذف الدورة التدريبية" });
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
                    grade: evaluation?.score || null,
                    assignment: {
                      id: assignment.id,
                      attendanceGrade: assignment.attendanceGrade,
                      behaviorGrade: assignment.behaviorGrade,
                      finalExamGrade: assignment.finalExamGrade,
                      calculatedFinalGrade: assignment.calculatedFinalGrade
                    }
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
      } else if (courseId && available) {
        // Get groups with available spots for a specific course
        const allGroups = await storage.getTrainingCourseGroupsByCourse(courseId);
        const groupsWithDetails = await Promise.all(
          allGroups.map(async (group) => {
            try {
              // Get current enrollment for each group
              const assignments = await storage.getAssignmentsByGroup(group.id);
              const availableSpots = group.capacity - assignments.length;

              if (availableSpots <= 0) return null; // Skip full groups

              // Get course, site, and supervisor details
              const [course, site, supervisor] = await Promise.all([
                storage.getTrainingCourse(group.courseId),
                storage.getTrainingSite(group.siteId),
                storage.getSupervisorWithUser(group.supervisorId)
              ]);

              return {
                ...group,
                currentEnrollment: assignments.length,
                availableSpots,
                course,
                site,
                supervisor
              };
            } catch (error) {
              console.error(`Error processing group ${group.id}:`, error);
              return null;
            }
          })
        );

        const validGroups = groupsWithDetails.filter(group => group !== null);
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
        await logSecurityActivity(
          req.user.username,
          "create",
          "training_course_groups",
          group.id,
          { 
            message: `تم إنشاء مجموعة تدريب: ${groupName}`,
            groupData: { courseId, groupName, siteId, supervisorId, capacity, startDate, endDate, status: groupStatus }
          }
        );
      }

      // Send notification to supervisor about new assignment
      if (group.supervisorId) {
        try {
          const course = await storage.getTrainingCourse(group.courseId);
          await notificationService.notifySupervisorNewAssignment(
            group.supervisorId,
            course?.name || 'دورة غير محددة',
            group.groupName
          );
        } catch (error) {
          console.error("Error sending supervisor notification:", error);
        }
      }

      res.status(201).json(group);
    } catch (error) {
      console.error("Error creating training course group:", error);
      res.status(500).json({ message: "خطأ في إنشاء مجموعة تدريب جديدة" });
    }
  });

  app.put("/api/training-course-groups/:id", authMiddleware, requireRole(["admin", "supervisor"]), async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { 
        courseId, groupName, siteId, supervisorId, startDate, endDate, 
        capacity, location, status 
      } = req.body;

      console.log("Updating training course group:", { id, ...req.body });

      // Validate required fields
      if (!courseId || !siteId || !supervisorId || !startDate || !endDate || !capacity) {
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

      // Check if group exists
      const existingGroup = await storage.getTrainingCourseGroup(id);
      if (!existingGroup) {
        return res.status(404).json({ message: "مجموعة التدريب غير موجودة" });
      }

      // Determine group status based on dates
      const currentDate = new Date().toISOString().split('T')[0];
      let groupStatus = 'upcoming';

      if (startDate && endDate) {
        if (currentDate >= startDate && currentDate <= endDate) {
          groupStatus = 'active';
        } else if (currentDate > endDate) {
          groupStatus = 'completed';
        }
      }

      const updateData = {
        courseId: Number(courseId),
        groupName: groupName || existingGroup.groupName,
        siteId: Number(siteId),
        supervisorId: Number(supervisorId),
        startDate: startDate,
        endDate: endDate,
        capacity: Number(capacity),
        location,
        status: groupStatus
      };

      const updatedGroup = await storage.updateTrainingCourseGroup(id, updateData);

      if (!updatedGroup) {
        return res.status(404).json({ message: "فشل في تحديث مجموعة التدريب" });
      }

      // Log activity
      if (req.user) {
        await logSecurityActivity(
          req.user.username,
          "update",
          "training_course_groups",
          id,
          { 
            message: `تم تحديث مجموعة تدريب: ${groupName}`,
            groupData: { courseId, groupName, siteId, supervisorId, capacity, startDate, endDate, status: groupStatus }
          }
        );
      }

      console.log("Training course group updated successfully:", updatedGroup);
      res.json(updatedGroup);
    } catch (error) {
      console.error("Error updating training course group:", error);
      res.status(500).json({ message: "خطأ في تحديث مجموعة التدريب" });
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
          } catch (error){
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
      const alreadyEnrolledInGroup = existingAssignments.some(assignment => assignment.groupId === Number(groupId));

      if (alreadyEnrolledInGroup) {
        return res.status(400).json({ message: "الطالب مسجل بالفعل في هذه المجموعة" });
      }

      // استخدام الربط المباشر للتحقق من التسجيل في نفس الكورس
      const isAlreadyEnrolledInCourse = await storage.isStudentEnrolledInCourse(Number(studentId), group.courseId);
      if (isAlreadyEnrolledInCourse) {
        return res.status(400).json({ 
          message: `الطالب مسجل بالفعل في كورس "${course?.name || 'غير محدد'}". يمكن التسجيل في كورسات أخرى.` 
        });
      }

      const assignment = await storage.createTrainingAssignment({
        studentId: Number(studentId),
        courseId: group.courseId, // ربط مباشر بالكورس
        groupId: Number(groupId),
        assignedBy: req.user?.id,
        status: "pending"
      });

      // Send notification to supervisor about new assignment
      if (group.supervisorId) {
        try {
          const course = await storage.getTrainingCourse(group.courseId);
          await notificationService.notifySupervisorNewAssignment(
            group.supervisorId,
            course?.name || 'دورة غير محددة',
            group.groupName
          );
        } catch (error) {
          console.error("Error sending supervisor notification:", error);
        }
      }

      // Log activity
      if (req.user) {
        const student = await storage.getStudent(Number(studentId));
        const studentUser = student ? await storage.getUser(student.userId) : null;

        await logSecurityActivity(
          req.user.username,
          "create",
          "training_assignments",
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
          }
        );
      }

      res.status(201).json(assignment);
    } catch (error) {
      res.status(500).json({ message: "خطأ في إنشاء تعيين تدريبي" });
    }
  });

  // Check email uniqueness endpoint for students
  app.get("/api/students/check-email", authMiddleware, async (req: Request, res: Response) => {
    try {
      const email = req.query.email as string;
      const excludeId = req.query.excludeId ? Number(req.query.excludeId) : undefined;
      
      if (!email) {
        return res.status(400).json({ message: "البريد الإلكتروني مطلوب" });
      }

      const existingUser = await storage.getUserByEmail(email);
      // If editing, exclude the current user
      if (excludeId && existingUser?.id === excludeId) {
        return res.json({ exists: false });
      }
      res.json({ exists: !!existingUser });
    } catch (error) {
      console.error("Error checking email:", error);
      res.status(500).json({ message: "خطأ في التحقق من البريد الإلكتروني" });
    }
  });

  // Check university ID uniqueness endpoint
  app.get("/api/students/check-university-id", authMiddleware, async (req: Request, res: Response) => {
    try {
      const universityId = req.query.universityId as string;
      const excludeId = req.query.excludeId ? Number(req.query.excludeId) : undefined;
      
      if (!universityId) {
        return res.status(400).json({ message: "الرقم الجامعي مطلوب" });
      }

      const existingStudent = await storage.getStudentByUniversityId(universityId);
      // If editing, exclude the current student
      if (excludeId && existingStudent?.id === excludeId) {
        return res.json({ exists: false });
      }
      res.json({ exists: !!existingStudent });
    } catch (error) {
      console.error("Error checking university ID:", error);
      res.status(500).json({ message: "خطأ في التحقق من الرقم الجامعي" });
    }
  });

  // Check phone uniqueness endpoint for students
  app.get("/api/students/check-phone", authMiddleware, async (req: Request, res: Response) => {
    try {
      const phone = req.query.phone as string;
      const excludeId = req.query.excludeId ? Number(req.query.excludeId) : undefined;
      
      if (!phone) {
        return res.status(400).json({ message: "رقم الهاتف مطلوب" });
      }

      const existingUser = await storage.getUserByPhone(phone);
      // If editing, exclude the current user
      if (excludeId && existingUser?.id === excludeId) {
        return res.json({ exists: false });
      }
      res.json({ exists: !!existingUser });
    } catch (error) {
      console.error("Error checking phone:", error);
      res.status(500).json({ message: "خطأ في التحقق من رقم الهاتف" });
    }
  });

  // Check email uniqueness endpoint for supervisors
  app.get("/api/supervisors/check-email", authMiddleware, async (req: Request, res: Response) => {
    try {
      const email = req.query.email as string;
      const excludeId = req.query.excludeId ? Number(req.query.excludeId) : undefined;
      
      if (!email) {
        return res.status(400).json({ message: "البريد الإلكتروني مطلوب" });
      }

      const existingUser = await storage.getUserByEmail(email);
      // If editing, exclude the current user
      if (excludeId && existingUser?.id === excludeId) {
        return res.json({ exists: false });
      }
      res.json({ exists: !!existingUser });
    } catch (error) {
      console.error("Error checking email:", error);
      res.status(500).json({ message: "خطأ في التحقق من البريد الإلكتروني" });
    }
  });

  // Check phone uniqueness endpoint for supervisors
  app.get("/api/supervisors/check-phone", authMiddleware, async (req: Request, res: Response) => {
    try {
      const phone = req.query.phone as string;
      const excludeId = req.query.excludeId ? Number(req.query.excludeId) : undefined;
      
      if (!phone) {
        return res.status(400).json({ message: "رقم الهاتف مطلوب" });
      }

      const existingUser = await storage.getUserByPhone(phone);
      // If editing, exclude the current user
      if (excludeId && existingUser?.id === excludeId) {
        return res.json({ exists: false });
      }
      res.json({ exists: !!existingUser });
    } catch (error) {
      console.error("Error checking phone:", error);
      res.status(500).json({ message: "خطأ في التحقق من رقم الهاتف" });
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

      // تحديث الحالة فقط إذا لم يتم التحديث اليوم
      const { courseStatusUpdater } = await import('./schedulers/course-status-updater');
      await courseStatusUpdater.updateIfNeeded();

      // Re-fetch course to get updated status
      const updatedCourse = await storage.getTrainingCourse(course.id);
      if (!updatedCourse) {
        return res.status(404).json({ message: "الكورس غير موجود" });
      }

      // Check course status - only allow registration for upcoming/active courses
      if (updatedCourse.status === 'completed') {
        return res.status(400).json({ 
          message: `كورس "${updatedCourse.name}" منتهي. يمكنك فقط مراجعة درجاتك إذا كنت مسجلاً مسبقاً.` 
        });
      }

      // Check if student is already enrolled in THIS SPECIFIC course (not all courses)
      const isAlreadyEnrolled = await storage.isStudentEnrolledInCourse(student.id, updatedCourse.id);
      if (isAlreadyEnrolled) {
        return res.status(400).json({ 
          message: `أنت مسجل بالفعل في كورس "${updatedCourse.name}". يمكنك التسجيل في كورسات أخرى.` 
        });
      }

      // Create assignment with direct course and group relationship
      const assignment = await storage.createTrainingAssignment({
        studentId: student.id,
        courseId: updatedCourse.id, // Direct course relationship
        groupId: Number(groupId),
        assignedBy: req.user?.id,
        status: "active",
        confirmed: true // Student is registering themselves
      });

      // Log activity
      await logSecurityActivity(
        req.user.username,
        "register",
        "training_assignments",
        assignment.id,
        { 
          message: `قام الطالب بالتسجيل في مجموعة التدريب`,
          assignmentData: { 
            studentId: student.id,
            studentName: req.user.name,
            groupName: group.groupName,
            courseName: updatedCourse.name
          }
        }
      );

      res.status(201).json({
        ...assignment,
        message: "تم التسجيل بنجاح في مجموعة التدريب"
      });
    } catch (error) {
      res.status(500).json({ message: "خطأ في التسجيل في مجموعة التدريب" });
    }
  });

  // Cancel student registration from a specific group
  app.delete("/api/training-assignments/group/:groupId", authMiddleware, requireRole("student"), async (req: Request, res: Response) => {
    try {
      const groupId = Number(req.params.groupId);

      // Get student info
      const student = await storage.getStudentByUserId(req.user!.id);
      if (!student) {
        return res.status(403).json({ message: "الطالب غير موجود" });
      }

      // Find the assignment for this student and group
      const assignments = await storage.getTrainingAssignmentsByStudent(student.id);
      const assignment = assignments.find(a => a.groupId === groupId);

      if (!assignment) {
        return res.status(404).json({ message: "لا يوجد تسجيل في هذه المجموعة" });
      }

      // Delete the assignment
      await storage.deleteTrainingAssignment(assignment.id);

      // Get group and course details for logging
      const group = await storage.getTrainingCourseGroup(groupId);
      const course = group ? await storage.getTrainingCourse(group.courseId) : null;

      // Log activity
      await logSecurityActivity(
        req.user.username,
        "delete",
        "training_assignments",
        assignment.id,
        { 
          message: `قام الطالب بإلغاء التسجيل من مجموعة التدريب`,
          assignmentData: { 
            studentId: student.id,
            studentName: req.user.name,
            groupName: group?.groupName || 'غير محدد',
            courseName: course?.name || 'غير محدد'
          }
        }
      );

      res.json({
        message: "تم إلغاء التسجيل بنجاح",
        assignmentId: assignment.id
      });
    } catch (error) {
      console.error("Error canceling registration:", error);
      res.status(500).json({ message: "خطأ في إلغاء التسجيل" });
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
          await logSecurityActivity(
            req.user.username,
            "update",
            "training_assignments",
            assignment.id,
            { 
              message: `تم تأكيد التسجيل في الدورة التدريبية`,
              confirmationData: { 
                assignmentId: assignment.id,
                studentId: student.id,
                studentName: studentUser.name
              }
            }
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

          await logSecurityActivity(
            req.user.username,
            "create",
            "grades",
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
            }
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

  // Reports API endpoints - Modified to show each student-course as separate record
  app.get("/api/reports/students", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const academicYearId = req.query.academicYearId ? Number(req.query.academicYearId) : undefined;

      // Get all students with their evaluations and course details
      const students = await storage.getAllStudents();
      const studentsReport = [];

      for (const student of students) {
        const studentDetails = await storage.getStudentWithDetails(student.id);
        if (!studentDetails) continue;

        const assignments = await storage.getTrainingAssignmentsByStudent(student.id);

        for (const assignment of assignments) {
          // Check if this assignment has detailed grades or evaluations
          const evaluations = await storage.getEvaluationsByAssignment(assignment.id);

          // Only include courses that have either detailed grades OR evaluations (actual graded courses)
          const hasDetailedGrades = !!(assignment.attendanceGrade || assignment.behaviorGrade || assignment.finalExamGrade || assignment.calculatedFinalGrade);
          const hasEvaluations = evaluations.length > 0;

          // Only show courses with actual grades or evaluations
          if (!hasDetailedGrades && !hasEvaluations) {
            continue;
          }

          const group = assignment.groupId ? await storage.getTrainingCourseGroupWithStudents(assignment.groupId) : null;
          if (group) {
            // Filter by academic year if specified
            if (academicYearId && group.course.academicYearId !== academicYearId) {
              continue;
            }

            const supervisorDetails = await storage.getSupervisorWithUser(group.supervisorId);

            // Get the latest evaluation for this assignment (if any)
            const latestEvaluation = evaluations.length > 0 ? evaluations[evaluations.length - 1] : null;

            // Use calculated final grade from assignment if available, otherwise use evaluation score
            let finalGrade = null;
            if (assignment.calculatedFinalGrade) {
              finalGrade = parseFloat(assignment.calculatedFinalGrade);
            } else if (latestEvaluation?.score) {
              finalGrade = latestEvaluation.score;
            }

            // Each course registration is a separate record
            studentsReport.push({
              id: student.id,
              name: studentDetails.user.name,
              universityId: student.universityId,
              faculty: studentDetails.faculty?.name || 'غير محدد',
              major: studentDetails.major?.name || 'غير محدد',
              level: studentDetails.level?.name || 'غير محدد',
              // Single course details for this record
              courseId: group.course.id,
              courseName: group.course.name,
              grade: latestEvaluation?.score || null,
              // Prioritize calculated final grade from detailed grades
              calculatedFinal: finalGrade,
              // Add detailed grades
              attendanceGrade: assignment.attendanceGrade ? Number(assignment.attendanceGrade) : null,
              behaviorGrade: assignment.behaviorGrade ? Number(assignment.behaviorGrade) : null,
              finalExamGrade: assignment.finalExamGrade ? Number(assignment.finalExamGrade) : null,
              groupName: group.groupName,
              site: group.site.name,
              supervisor: supervisorDetails?.user?.name || 'غير محدد',
              hasDetailedGrades: hasDetailedGrades,
              hasEvaluations: hasEvaluations,
              academicYear: group.course.academicYear?.name || 'غير محدد',
              assignmentId: assignment.id
            });
          }
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
      const academicYearId = req.query.academicYearId ? Number(req.query.academicYearId) : undefined;

      // Get all completed courses with evaluations
      const courses = await storage.getAllTrainingCourses();
      const coursesReport = [];

      for (const course of courses) {
        // Filter by academic year if specified
        if (academicYearId && course.academicYearId !== academicYearId) {
          continue;
        }

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
            // Also check for detailed grades
            const hasDetailedGrades = !!(assignment.attendanceGrade || assignment.behaviorGrade || assignment.finalExamGrade || assignment.calculatedFinalGrade);

            if (evaluations.length > 0 || hasDetailedGrades) {
              completedEvaluations++;
              hasEvaluations = true;

              // Use calculated final grade if available, otherwise use evaluation score
              let finalGrade = null;
              if (assignment.calculatedFinalGrade) {
                finalGrade = parseFloat(assignment.calculatedFinalGrade);
              } else if (evaluations.length > 0 && evaluations[0].score) {
                finalGrade = evaluations[0].score;
              }

              if (finalGrade) {
                totalGrades += finalGrade;
                gradeCount++;
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

  // الحصول على مهام الدورات الخاصة بالمشرف (عندما يقوم المدير بتعيين المشرف على الدورات/المجموعات)
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
              id: groupWithDetails.course.id,
              name: groupWithDetails.course.name,
              faculty: courseDetails?.faculty?.name || 'غير محدد',
              major: courseDetails?.major?.name || 'غير محدد',
              status: groupWithDetails.course.status
            },
            groupName: group.groupName,
            groupStatus: group.status, // حالة المجموعة
            startDate: group.startDate, // تاريخ بداية المجموعة
            endDate: group.endDate, // تاريخ نهاية المجموعة
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

  // الحصول على معلومات تفصيلية حول مجموعة تدريب معينة
  app.get("/api/training-course-groups/:groupId", authMiddleware, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);

      // Get group with basic details
      const group = await storage.getTrainingCourseGroupWithStudents(groupId);
      if (!group) {
        return res.status(404).json({ message: "المجموعة غير موجودة" });
      }

      // Get course details
      const courseDetails = await storage.getTrainingCourseWithDetails(group.courseId);

      // Get supervisor details
      const supervisorDetails = await storage.getSupervisorWithUser(group.supervisorId);

      // Get students with their assignments and evaluations
      const assignments = await storage.getTrainingAssignmentsByGroup(groupId);
      const studentsWithDetails = [];

      for (const assignment of assignments) {
        const studentDetails = await storage.getStudentWithDetails(assignment.studentId);
        if (studentDetails) {
          // Get evaluation for this assignment
          const evaluations = await storage.getAllEvaluations();
          const evaluation = evaluations.find(evalItem => evalItem.assignmentId === assignment.id);

          studentsWithDetails.push({
            id: assignment.id,
            student: studentDetails,
            assignment: {
              id: assignment.id,
              status: assignment.status,
              assignedAt: assignment.createdAt || new Date().toISOString()
            },
            evaluation: evaluation || null
          });
        }
      }

      const result = {
        id: group.id,
        groupName: group.groupName,
        capacity: group.capacity,
        currentEnrollment: group.currentEnrollment || assignments.length,
        startDate: group.startDate,
        endDate: group.endDate,
        location: group.location || "غير محدد",
        status: group.status,
        course: courseDetails ? {
          id: courseDetails.id,
          name: courseDetails.name,
          description: courseDetails.description || "لا يوجد وصف",
          faculty: courseDetails.faculty,
          major: courseDetails.major,
          level: courseDetails.level
        } : null,
        site: group.site,
        supervisor: supervisorDetails ? {
          id: supervisorDetails.id,
          user: supervisorDetails.user,
          specialization: supervisorDetails.specialization || "غير محدد"
        } : null,
        students: studentsWithDetails
      };

      res.json(result);
    } catch (error) {
      console.error("Error fetching group details:", error);
      res.status(500).json({ message: "خطأ في استرجاع تفاصيل المجموعة" });
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

      // تحقق مما إذا كان التقييم موجودًا بالفعل لهذه المهمة
      const existingEvaluations = await storage.getAllEvaluations();
      const existingEvaluation = existingEvaluations.find(evaluation => evaluation.assignmentId === assignment.id);

      let evaluation;
      if (existingEvaluation) {
        // Update existing evaluation instead of creating a new one
        evaluation = await storage.updateEvaluation(existingEvaluation.id, {
          score: Math.round(grade),
          comments: `درجة الطالب: ${grade}/100`,
          evaluatorName: supervisorWithUser?.user?.name || 'المشرف',
          evaluationDate: new Date(),
          createdBy: req.user!.id
        });
      } else {
        // Create new evaluation
        evaluation = await storage.createEvaluation({
          assignmentId: assignment.id,
          score: Math.round(grade),
          comments: `درجة الطالب: ${grade}/100`,
          evaluatorName: supervisorWithUser?.user?.name || 'المشرف',
          evaluationDate: new Date(),
          createdBy: req.user!.id
        });
      }

      // Get previous grade for comparison
      let previousGrade = null;
      if (existingEvaluation) {
        previousGrade = existingEvaluation.score;
      }

      // Log activity
      await logSecurityActivity(
        req.user!.username,
        existingEvaluation ? "update" : "create",
        "grades",
        evaluation.id,
        {
          message: `المشرف ${supervisorWithUser?.user?.name || 'غير محدد'} قد ${existingEvaluation ? 'حدث' : 'أدخل'} درجات الكورس "${group.course.name}" - ${group.groupName}`,
          details: {
            supervisorName: supervisorWithUser?.user?.name || 'غير محدد',
            courseName: group.course.name,
            groupName: group.groupName,
            studentName: student.user.name,
            studentId: student.universityId,
            grade: grade,
            previousGrade: previousGrade,
            gradeChange: previousGrade ? `${previousGrade} ← ${grade}` : `جديد: ${grade}`,
            faculty: student.faculty?.name || 'غير محدد',
            major: student.major?.name || 'غير محدد',
            level: student.level?.name || 'غير محدد',
            actionType: existingEvaluation ? 'update' : 'create'
          }
        }
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

  // نقطة نهاية API لحفظ درجات عدة طلاب دفعة واحدة
  app.post("/api/students/grades/bulk", authMiddleware, requireRole("supervisor"), async (req: Request, res: Response) => {
    try {
      const { grades, groupId } = req.body;

      if (!grades || !Array.isArray(grades) || !groupId) {
        return res.status(400).json({ message: "بيانات غير صحيحة" });
      }

      // Validate grades
      for (const gradeItem of grades) {
        if (!gradeItem.studentId || gradeItem.grade === undefined || gradeItem.grade < 0 || gradeItem.grade > 100) {
          return res.status(400).json({ message: "درجة غير صحيحة" });
        }
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

      // Get supervisor details
      const supervisorWithUser = await storage.getSupervisorWithUser(supervisor.id);

      const savedEvaluations = [];
      const studentDetails = [];

      // Process each grade
      for (const gradeItem of grades) {
        const { studentId, grade } = gradeItem;

        // Check if student is in this group
        const studentInGroup = group.students.find(s => s.id === studentId);
        if (!studentInGroup) {
          continue; // Skip invalid students
        }

        // Get student details
        const student = await storage.getStudentWithDetails(studentId);
        if (!student) {
          continue; // Skip invalid students
        }

        // Find assignment for this student and group
        const assignments = await storage.getTrainingAssignmentsByGroup(groupId);
        const assignment = assignments.find(a => a.studentId === studentId);

        if (!assignment) {
          continue; // Skip students without assignments
        }

        // Check if evaluation already exists for this assignment
        const existingEvaluations = await storage.getAllEvaluations();
        const existingEvaluation = existingEvaluations.find(evaluation => evaluation.assignmentId === assignment.id);

        let evaluation;
        if (existingEvaluation) {
          // Update existing evaluation instead of creating a new one
          evaluation = await storage.updateEvaluation(existingEvaluation.id, {
            score: Math.round(grade),
            comments: `درجة الطالب: ${grade}/100`,
            evaluatorName: supervisorWithUser?.user?.name || 'المشرف',
            evaluationDate: new Date(),
            createdBy: req.user!.id
          });
        } else {
          // Create new evaluation
          evaluation = await storage.createEvaluation({
            assignmentId: assignment.id,
            score: Math.round(grade),
            comments: `درجة الطالب: ${grade}/100`,
            evaluatorName: supervisorWithUser?.user?.name || 'المشرف',
            evaluationDate: new Date(),
            createdBy: req.user!.id
          });
        }

        savedEvaluations.push(evaluation);
        studentDetails.push({
          name: student.user.name,
          universityId: student.universityId,
          grade: grade
        });
      }

      // Send smart notifications
      if (savedEvaluations.length > 0) {
        // Log activity
        await logSecurityActivity(
          req.user!.username,
          "bulk_update",
          "grades",
          groupId,
          {
            message: `المشرف ${supervisorWithUser?.user?.name || 'غير محدد'} قد أدخل درجات ${savedEvaluations.length} طالب في الكورس "${group.course.name}" - ${group.groupName}`,
            details: {
              supervisorName: supervisorWithUser?.user?.name || 'غير محدد',
              courseName: group.course.name,
              groupName: group.groupName,
              studentsCount: savedEvaluations.length,
              students: studentDetails
            }
          }
        );

        // Send notification to admin using unified system
        try {
          await notificationService.notifyAdminGradeEntry(
            supervisorWithUser?.user?.name || 'غير محدد',
            group.course.name,
            group.groupName
          );
        } catch (error) {
          console.error("Error sending admin notification:", error);
        }

        // Send notifications to students using unified system
        for (const gradeItem of grades) {
          try {
            await notificationService.notifyStudentGradesAdded(
              gradeItem.studentId,
              group.course.name,
              group.groupName,
              gradeItem.grade
            );
          } catch (error) {
            console.error("Error sending student notification:", error);
          }
        }
      }

      res.json({
        message: `تم حفظ درجات ${savedEvaluations.length} طالب بنجاح وإرسال إشعار للمسؤول`,
        savedCount: savedEvaluations.length,
        evaluations: savedEvaluations
      });

    } catch (error) {
      console.error("Error saving bulk grades:", error);
      res.status(500).json({ message: "خطأ في حفظ الدرجات" });
    }
  });

  // API endpoint to save detailed grades (attendance, behavior, final exam)
  app.post("/api/students/detailed-grades/bulk", authMiddleware, requireRole("supervisor"), async (req: Request, res: Response) => {
    try {
      const { updates } = req.body;

      if (!updates || !Array.isArray(updates)) {
        return res.status(400).json({ message: "بيانات غير صحيحة" });
      }

      // Validate detailed grades - specific ranges for each grade
      for (const update of updates) {
        if (!update.assignmentId) {
          return res.status(400).json({ message: "معرف التعيين مطلوب" });
        }

        // التحقق من الدرجات المرسلة فقط (يمكن أن تكون undefined)
        if (update.attendanceGrade !== undefined && (update.attendanceGrade < 0 || update.attendanceGrade > 20)) {
          return res.status(400).json({ message: "درجة الحضور يجب أن تكون بين 0 و 20" });
        }

        if (update.behaviorGrade !== undefined && (update.behaviorGrade < 0 || update.behaviorGrade > 30)) {
          return res.status(400).json({ message: "درجة السلوك يجب أن تكون بين 0 و 30" });
        }

        if (update.finalExamGrade !== undefined && (update.finalExamGrade < 0 || update.finalExamGrade > 50)) {
          return res.status(400).json({ message: "درجة الاختبار النهائي يجب أن تكون بين 0 و 50" });
        }
      }

      // Get supervisor info
      const supervisor = await storage.getSupervisorByUserId(req.user!.id);
      if (!supervisor) {
        return res.status(403).json({ message: "غير مصرح بالوصول" });
      }

      const savedUpdates = [];
      const validGrades = [];

      for (const update of updates) {
        const { assignmentId, attendanceGrade, behaviorGrade, finalExamGrade } = update;

        // إعداد البيانات للتحديث
        const updateData: any = {};
        if (attendanceGrade !== undefined) updateData.attendanceGrade = Number(attendanceGrade);
        if (behaviorGrade !== undefined) updateData.behaviorGrade = Number(behaviorGrade);
        if (finalExamGrade !== undefined) updateData.finalExamGrade = Number(finalExamGrade);

        // حساب الدرجة النهائية فقط إذا كانت جميع الدرجات متوفرة
        const assignment = await storage.getTrainingAssignmentById(assignmentId);
        if (assignment) {
          const currentAttendance = updateData.attendanceGrade ?? assignment.attendanceGrade;
          const currentBehavior = updateData.behaviorGrade ?? assignment.behaviorGrade;
          const currentFinalExam = updateData.finalExamGrade ?? assignment.finalExamGrade;

          if (currentAttendance !== null && currentBehavior !== null && currentFinalExam !== null) {
            updateData.calculatedFinalGrade = Number(currentAttendance) + Number(currentBehavior) + Number(currentFinalExam);
          }
        }

        // تحديث التقييم التفصيلي للطالب
        const result = await storage.updateStudentDetailedGrades(assignmentId, updateData);

        if (result) {
          savedUpdates.push({
            assignmentId,
            ...updateData,
            finalGrade: updateData.calculatedFinalGrade
          });
          validGrades.push({
            assignmentId,
            attendanceGrade,
            behaviorGrade,
            finalExamGrade,
            calculatedFinalGrade: updateData.calculatedFinalGrade
          });

          // تسجيل تفاصيل التغييرات للنشاط
          if (assignment) {
            const changes = [];
            if (attendanceGrade !== undefined && assignment.attendanceGrade !== attendanceGrade) {
              changes.push(`الحضور: ${assignment.attendanceGrade || 'لم يتم إدخالها'} → ${attendanceGrade}/20`);
            }
            if (behaviorGrade !== undefined && assignment.behaviorGrade !== behaviorGrade) {
              changes.push(`السلوك: ${assignment.behaviorGrade || 'لم يتم إدخالها'} → ${behaviorGrade}/30`);
            }
            if (finalExamGrade !== undefined && assignment.finalExamGrade !== finalExamGrade) {
              changes.push(`الاختبار النهائي: ${assignment.finalExamGrade || 'لم يتم إدخالها'} → ${finalExamGrade}/50`);
            }

            if (changes.length > 0) {
              const student = await storage.getStudentById(assignment.studentId);
              validGrades[validGrades.length - 1].changes = changes;
              validGrades[validGrades.length - 1].studentName = student?.user?.name || 'غير معروف';
            }
          }
        }
      }

      // الحصول على تفاصيل الطلاب المحدثين
      const studentDetails = [];
      for (const grade of validGrades) {
        try {
          const assignment = await storage.getTrainingAssignmentById(grade.assignmentId);
          if (assignment) {
            const student = await storage.getStudentById(assignment.studentId);
            if (student) {
              studentDetails.push({
                name: student.user?.name || 'غير معروف',
                grade: grade.calculatedFinalGrade || 'لم يتم حسابها',
                attendanceGrade: grade.attendanceGrade,
                behaviorGrade: grade.behaviorGrade,
                finalExamGrade: grade.finalExamGrade
              });
            }
          }
        } catch (error) {
          console.error('Error getting student details:', error);
        }
      }

      // تسجيل النشاط
      if (req.user) {
        await logSecurityActivity(
          req.user.username,
          "bulk_update",
          "grades",
          null,
          { 
            message: `المشرف قد أدخل الدرجات المفصلة لـ ${validGrades.length} طالب`,
            details: {
              count: validGrades.length,
              students: studentDetails
            }
          }
        );
      }

      // Send notifications for detailed grading
      if (savedUpdates.length > 0) {
        // Get group and course details for notifications
        const firstAssignment = await storage.getTrainingAssignment(updates[0].assignmentId);
        if (firstAssignment && firstAssignment.groupId) {
          const group = await storage.getTrainingCourseGroupWithStudents(firstAssignment.groupId);
          if (group) {
            const supervisorWithUser = await storage.getSupervisorWithUser(supervisor.id);

            // Notify admin about grade entry
            try {
              await notificationService.notifyAdminGradeEntry(
                supervisorWithUser?.user?.name || 'غير محدد',
                group.course?.name || 'دورة غير محددة',
                group.groupName
              );
            } catch (error) {
              console.error("Error sending admin notification:", error);
            }

            // Notify students about their new grades
            for (const update of savedUpdates) {
              try {
                const assignment = await storage.getTrainingAssignment(update.assignmentId);
                if (assignment) {
                  await notificationService.notifyStudentGradesAdded(
                    assignment.studentId,
                    group.course?.name || 'دورة غير محددة',
                    group.groupName,
                    update.finalGrade
                  );
                }
              } catch (error) {
                console.error("Error sending student notification:", error);
              }
            }
          }
        }

        // Log activity for detailed grading
        await logSecurityActivity(
          req.user!.username,
          "bulk_update",
          "grades",
          null,
          {
            message: `المشرف قد أدخل الدرجات المفصلة لـ ${savedUpdates.length} طالب`,
            details: {
              supervisorId: supervisor.id,
              savedCount: savedUpdates.length,
              gradingType: "detailed",
              components: ["attendance (20%)", "behavior (30%)", "final exam (50%)"]
            }
          }
        );
      }

      res.json({
        message: `تم حفظ الدرجات المفصلة لـ ${savedUpdates.length} طالب بنجاح وإرسال الإشعارات`,
        savedCount: savedUpdates.length,
        updates: savedUpdates
      });

    } catch (error) {
      console.error("Error saving detailed grades:", error);
      res.status(500).json({ message: "خطأ في حفظ الدرجات المفصلة" });
    }
  });

  // Get student by ID
  app.get("/api/students/:id", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const studentId = Number(req.params.id);
      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ message: "الطالب غير موجود" });
      }
      res.json(student);
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع بيانات الطالب" });
    }
  });

  // Get student courses by student ID
  app.get("/api/students/:id/courses", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const studentId = Number(req.params.id);

      // Get all training assignments for this student
      const assignments = await storage.getAllTrainingAssignments();
      const studentAssignments = assignments.filter(assignment => assignment.studentId === studentId);

      // Get course groups for each assignment
      const courseGroups = await storage.getAllTrainingCourseGroups();

      // Build courses data with full details
      const studentCourses = await Promise.all(
        studentAssignments.map(async (assignment) => {
          const group = courseGroups.find(g => g.id === assignment.groupId);
          if (!group) return null;

          // Get course details
          const course = await storage.getTrainingCourse(group.courseId);
          if (!course) return null;

          // Get supervisor details
          let supervisor = null;
          if (group.supervisorId) {
            supervisor = await storage.getSupervisor(group.supervisorId);
          }

          // Get training site details
          let trainingSite = null;
          if (group.siteId) {
            trainingSite = await storage.getTrainingSite(group.siteId);
          }

          return {
            id: assignment.id,
            assignmentId: assignment.id,
            status: assignment.status,
            course: {
              ...course,
              startDate: group.startDate,
              endDate: group.endDate,
              supervisor: supervisor,
              trainingSite: trainingSite
            }
          };
        })
      );

      // Filter out null results
      const validCourses = studentCourses.filter(course => course !== null);

      res.json(validCourses);
    } catch (error) {
      console.error("Error fetching student courses:", error);
      res.status(500).json({ message: "خطأ في استرجاع دورات الطالب" });
    }
  });

  // Get student evaluations by student ID  
  app.get("/api/students/:id/evaluations", authMiddleware, async (req: Request, res: Response) => {
    try {
      const studentId = Number(req.params.id);

      // Check permissions - admin can access all, students can access their own
      if (req.user!.role === "student") {
        const student = await storage.getStudentByUserId(req.user!.id);
        if (!student || student.id !== studentId) {
          return res.status(403).json({ message: "غير مصرح لك بالوصول إلى هذه الصفحة" });
        }
      } else if (req.user!.role !== "admin" && req.user!.role !== "supervisor") {
        return res.status(403).json({ message: "غير مصرح لك بالوصول لهذه البيانات" });
      }

      // Get all training assignments for this student
      const assignments = await storage.getAllTrainingAssignments();
      const studentAssignments = assignments.filter(assignment => assignment.studentId === studentId);

      // Get all evaluations
      const allEvaluations = await storage.getAllEvaluations();

      // Get course groups for context
      const courseGroups = await storage.getAllTrainingCourseGroups();

      // Build evaluations/assignments data with full details
      const studentEvaluations = await Promise.all(
        studentAssignments.map(async (assignment) => {
          // Find evaluation for this assignment (may not exist yet)
          const evaluation = allEvaluations.find(evalItem => evalItem.assignmentId === assignment.id);

          // Get group and course details
          const group = courseGroups.find(g => g.id === assignment.groupId);
          if (!group) return null;

          const course = await storage.getTrainingCourse(group.courseId);
          if (!course) return null;

          // Get supervisor details
          let supervisor = null;
          if (group.supervisorId) {
            supervisor = await storage.getSupervisor(group.supervisorId);
          }

          // Return data whether evaluation exists or not
          return {
            id: evaluation?.id || `assignment_${assignment.id}`,
            assignmentId: assignment.id,
            score: evaluation?.score || null,
            comments: evaluation?.comments || null,
            evaluationDate: evaluation?.createdAt || null,
            evaluatorName: evaluation?.evaluatorName || null,
            // Calculate individual scores from assignment data (if needed for display)
            attendanceScore: assignment.attendanceGrade ? Number(assignment.attendanceGrade) : 0,
            skillsScore: assignment.behaviorGrade ? Number(assignment.behaviorGrade) : 0,
            reportScore: assignment.finalExamGrade ? Number(assignment.finalExamGrade) : 0,
            totalScore: assignment.calculatedFinalGrade ? parseFloat(assignment.calculatedFinalGrade) : 0,
            notes: evaluation?.comments || null,
            // Add assignment data with detailed grades
            assignment: {
              id: assignment.id,
              attendanceGrade: assignment.attendanceGrade,
              behaviorGrade: assignment.behaviorGrade,
              finalExamGrade: assignment.finalExamGrade,
              calculatedFinalGrade: assignment.calculatedFinalGrade,
              status: assignment.status,
              confirmed: assignment.confirmed
            },
            course: {
              ...course,
              startDate: group.startDate,
              endDate: group.endDate
            },
            supervisor: supervisor,
            hasGrades: !!(assignment.attendanceGrade || assignment.behaviorGrade || assignment.finalExamGrade)
          };
        })
      );

      // Filter out null results
      const validEvaluations = studentEvaluations.filter(evaluation => evaluation !== null);

      res.json(validEvaluations);
    } catch (error) {
      console.error("Error fetching student evaluations:", error);
      res.status(500).json({ message: "خطأ في استرجاع تقييمات الطالب" });
    }
  });

  // Academic Years API Routes
  app.get("/api/academic-years", authMiddleware, async (req: Request, res: Response) => {
    try {
      const academicYears = await storage.getAllAcademicYears();
      res.json(academicYears);
    } catch (error) {
      console.error("Error fetching academic years:", error);
      res.status(500).json({ message: "خطأ في استرجاع السنوات الدراسية" });
    }
  });

  app.post("/api/academic-years", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const academicYearData = schema.insertAcademicYearSchema.parse(req.body);

      // If this is set as current, make all others non-current
      if (academicYearData.isCurrent) {
        await storage.setAllAcademicYearsNonCurrent();
      }

      const academicYear = await storage.createAcademicYear(academicYearData);

      await logSecurityActivity(
        req.user!.username,
        "create",
        "academic_years",
        academicYear.id,
        { message: `إنشاء سنة دراسية جديدة: ${academicYear.name}` }
      );

      res.json(academicYear);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error creating academic year:", error);
      res.status(500).json({ message: "خطأ في إنشاء السنة الدراسية" });
    }
  });

  app.put("/api/academic-years/:id", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const academicYearData = schema.insertAcademicYearSchema.parse(req.body);

      // If this is set as current, make all others non-current
      if (academicYearData.isCurrent) {
        await storage.setAllAcademicYearsNonCurrent();
      }

      const academicYear = await storage.updateAcademicYear(id, academicYearData);
      if (!academicYear) {
        return res.status(404).json({ message: "السنة الدراسية غير موجودة" });
      }

      await logSecurityActivity(
        req.user!.username,
        "update",
        "academic_years",
        academicYear.id,
        { message: `تحديث السنة الدراسية: ${academicYear.name}` }
      );

      res.json(academicYear);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error updating academic year:", error);
      res.status(500).json({ message: "خطأ في تحديث السنة الدراسية" });
    }
  });



  // Notifications API Routes
  app.get("/api/notifications", authMiddleware, async (req: Request, res: Response) => {
    try {
      const notifications = await storage.getNotificationsByUserId(req.user!.id);

      // تحويل البيانات لتتطابق مع الواجهة المطلوبة
      const formattedNotifications = notifications.map(notification => ({
        id: notification.id,
        title: notification.notificationTitle || 'إشعار',
        message: notification.notificationMessage || 'رسالة إشعار',
        type: notification.notificationType || 'info',
        isRead: notification.isRead || false,
        createdAt: notification.timestamp,
        performer: notification.username || 'النظام'
      }));

      res.json(formattedNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "خطأ في استرجاع الإشعارات" });
    }
  });

  app.post("/api/notifications", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const notificationData = schema.insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(notificationData);
      res.json(notification);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error creating notification:", error);
      res.status(500).json({ message: "خطأ في إنشاء الإشعار" });
    }
  });

  app.put("/api/notifications/:id/read", authMiddleware, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const notification = await storage.markNotificationAsRead(id, req.user!.id);
      if (!notification) {
        return res.status(404).json({ message: "الإشعار غير موجود" });
      }
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "خطأ في تحديث الإشعار" });
    }
  });

  // Smart Notification System

  // Helper functions for smart notifications - using notification service
  async function notifyAdminGradeEntry(supervisorName: string, courseName: string, groupName: string) {
    try {
      await notificationService.notifyAdminGradeEntry(supervisorName, courseName, groupName);
    } catch (error) {
      console.error("Error notifying admin about grade entry:", error);
    }
  }

  async function notifyAdminGradeUpdate(supervisorName: string, courseName: string, groupName: string) {
    try {
      await notificationService.notifyAdminGradeUpdate(supervisorName, courseName, groupName);
    } catch (error) {
      console.error("Error notifying admin about grade update:", error);
    }
  }

  async function notifyStudentGradesAdded(studentId: number, courseName: string, groupName: string, grade?: number) {
    try {
      await notificationService.notifyStudentGradesAdded(studentId, courseName, groupName, grade);
    } catch (error) {
      console.error("Error notifying student about grades:", error);
    }
  }

  async function notifySupervisorNewAssignment(supervisorId: number, courseName: string, groupName: string) {
    try {
      await notificationService.notifySupervisorNewAssignment(supervisorId, courseName, groupName);
    } catch (error) {
      console.error("Error notifying supervisor about new assignment:", error);
    }
  }

  async function notifyStudentAssignmentConfirmed(studentId: number, courseName: string, groupName: string) {
    try {
      const student = await storage.getStudentWithDetails(studentId);
      if (!student) return;

      await storage.createNotification(
        student.user.id,
        'تم تأكيد تسجيلك',
        `تم تأكيد تسجيلك في المجموعة "${groupName}" للدورة "${courseName}"`,
        'success'
      );
    } catch (error) {
      console.error("Error notifying student about assignment confirmation:", error);
    }
  }

  // Enhanced notification API endpoints
  app.post("/api/smart-notifications/grade-entry", authMiddleware, requireRole("supervisor"), async (req: Request, res: Response) => {
    try {
      const { groupId, studentIds } = req.body;

      // Get group and course info
      const group = await storage.getTrainingCourseGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "المجموعة غير موجودة" });
      }

      const course = await storage.getTrainingCourse(group.courseId);
      if (!course) {
        return res.status(404).json({ message: "الدورة غير موجودة" });
      }

      const supervisor = await storage.getSupervisorWithUser(group.supervisorId!);

      // Notify admin about grade entry
      await notifyAdminGradeEntry(
        supervisor?.user.name || 'مشرف غير محدد',
        course.name || 'دورة غير محددة',
        group.groupName
      );

      // Notify students about their grades
      for (const studentId of studentIds) {
        await notifyStudentGradesAdded(studentId, course.name || 'دورة غير محددة', group.groupName);
      }

      res.json({ message: "تم إرسال الإشعارات بنجاح" });
    } catch (error) {
      console.error("Error sending grade entry notifications:", error);
      res.status(500).json({ message: "خطأ في إرسال الإشعارات" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}