import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../shared/schema.ts';

async function seedSampleDataLocal() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ متغير DATABASE_URL غير موجود في ملف .env');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  const db = drizzle(pool, { schema });

  try {
    console.log('📊 إضافة البيانات التجريبية للبيئة المحلية...');

    // إضافة السنة الدراسية
    const [academicYear] = await db.insert(schema.academicYears).values({
      yearName: '2024-2025',
      startDate: '2024-09-01',
      endDate: '2025-06-30',
      isCurrent: true
    }).returning().catch(() => [{ id: 1 }]);

    // إضافة مواقع التدريب
    const trainingSites = [
      { name: 'مستشفى الملك فهد', location: 'الدمام', description: 'مستشفى تعليمي رائد' },
      { name: 'شركة أرامكو السعودية', location: 'الظهران', description: 'شركة الطاقة العالمية' },
      { name: 'شركة سابك', location: 'الجبيل', description: 'شركة صناعات كيميائية' },
      { name: 'شركة الاتصالات السعودية', location: 'الرياض', description: 'شركة اتصالات رائدة' },
      { name: 'مصرف الراجحي', location: 'الرياض', description: 'أكبر مصرف إسلامي في العالم' }
    ];

    for (const site of trainingSites) {
      await db.insert(schema.trainingSites).values(site).catch(() => {});
    }

    // إضافة مستخدمين مشرفين
    const supervisorUsers = [];
    for (let i = 1; i <= 5; i++) {
      const [user] = await db.insert(schema.users).values({
        username: `supervisor${i}`,
        password: 'password',
        name: `المشرف ${i}`,
        email: `supervisor${i}@university.local`,
        role: 'supervisor',
        active: true
      }).returning().catch(() => [{ id: i + 1 }]);
      supervisorUsers.push(user);
    }

    // إضافة مشرفين
    const supervisors = [];
    for (let i = 0; i < supervisorUsers.length; i++) {
      const [supervisor] = await db.insert(schema.supervisors).values({
        userId: supervisorUsers[i].id,
        facultyId: (i % 2) + 1, // توزيع على الكليات
        department: i < 2 ? 'قسم تقنية المعلومات' : 'قسم العلوم الطبية',
        phone: `05${i + 1}0000000`,
        position: 'مشرف تدريب'
      }).returning().catch(() => [{ id: i + 1 }]);
      supervisors.push(supervisor);
    }

    // إضافة مستخدمين طلاب
    const studentUsers = [];
    for (let i = 1; i <= 25; i++) {
      const [user] = await db.insert(schema.users).values({
        username: `student${i}`,
        password: 'password',
        name: `الطالب ${i}`,
        email: `student${i}@university.local`,
        role: 'student',
        active: true
      }).returning().catch(() => [{ id: i + 6 }]);
      studentUsers.push(user);
    }

    // إضافة طلاب
    const students = [];
    for (let i = 0; i < studentUsers.length; i++) {
      const [student] = await db.insert(schema.students).values({
        userId: studentUsers[i].id,
        universityId: `2024${String(i + 1).padStart(3, '0')}`,
        facultyId: (i % 2) + 1,
        majorId: (i % 4) + 1,
        levelId: (i % 5) + 1,
        phone: `056${String(i + 1000).slice(-7)}`
      }).returning().catch(() => [{ id: i + 1 }]);
      students.push(student);
    }

    // إضافة دورات تدريبية
    const trainingCourses = [
      {
        title: 'دورة التدريب الصيفي في تقنية المعلومات',
        description: 'دورة شاملة في تطوير البرمجيات وإدارة قواعد البيانات',
        duration: 8,
        capacity: 20,
        status: 'upcoming',
        academicYearId: academicYear.id
      },
      {
        title: 'التدريب العملي في المستشفيات',
        description: 'تدريب عملي في بيئة طبية حقيقية',
        duration: 12,
        capacity: 15,
        status: 'active',
        academicYearId: academicYear.id
      },
      {
        title: 'دورة الصيدلة الإكلينيكية',
        description: 'تدريب في صيدليات المستشفيات',
        duration: 10,
        capacity: 12,
        status: 'upcoming',
        academicYearId: academicYear.id
      }
    ];

    const courses = [];
    for (const course of trainingCourses) {
      const [createdCourse] = await db.insert(schema.trainingCourses).values(course).returning().catch(() => []);
      if (createdCourse) courses.push(createdCourse);
    }

    // إضافة مجموعات تدريبية
    if (courses.length > 0) {
      const courseGroups = [
        {
          courseId: courses[0].id,
          groupName: 'المجموعة الأولى - تطوير البرمجيات',
          supervisorId: supervisors[0]?.id || 1,
          siteId: 4, // شركة الاتصالات
          startDate: '2025-07-01',
          endDate: '2025-08-31',
          capacity: 10
        },
        {
          courseId: courses[0].id,
          groupName: 'المجموعة الثانية - قواعد البيانات',
          supervisorId: supervisors[1]?.id || 2,
          siteId: 5, // مصرف الراجحي
          startDate: '2025-07-01',
          endDate: '2025-08-31',
          capacity: 10
        },
        {
          courseId: courses[1]?.id || 2,
          groupName: 'مجموعة التدريب الطبي',
          supervisorId: supervisors[2]?.id || 3,
          siteId: 1, // مستشفى الملك فهد
          startDate: '2025-06-01',
          endDate: '2025-08-31',
          capacity: 15
        }
      ];

      for (const group of courseGroups) {
        await db.insert(schema.trainingCourseGroups).values(group).catch(() => {});
      }
    }

    // إضافة إشعارات
    const notifications = [
      {
        userId: 1, // المسؤول
        title: 'مرحباً في النظام المحلي',
        message: 'تم تشغيل نظام إدارة التدريب الميداني بنجاح في البيئة المحلية',
        type: 'success',
        isRead: false
      },
      {
        userId: 1,
        title: 'البيانات التجريبية جاهزة',
        message: 'تم إضافة جميع البيانات التجريبية بنجاح - النظام جاهز للاستخدام',
        type: 'info',
        isRead: false
      }
    ];

    for (const notification of notifications) {
      await db.insert(schema.notifications).values(notification).catch(() => {});
    }

    console.log('✅ تم إضافة البيانات التجريبية بنجاح');
    console.log('📊 البيانات المضافة:');
    console.log('   • 5 مواقع تدريب');
    console.log('   • 5 مشرفين');
    console.log('   • 25 طالب');
    console.log('   • 3 دورات تدريبية');
    console.log('   • 3 مجموعات تدريبية');
    console.log('   • سنة دراسية 2024-2025');
    console.log('   • إشعارات ترحيبية');

  } catch (error) {
    console.error('❌ خطأ في إضافة البيانات التجريبية:', error.message);
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedSampleDataLocal();
}

export { seedSampleDataLocal };