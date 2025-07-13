import { db } from '../server/db.js';
import { users, faculties, majors, levels, trainingSites, academicYears, activityLogs } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function setupLocalEnvironment() {
  console.log('🔧 بدء إعداد البيئة المحلية...');

  try {
    // إنشاء مسؤول النظام إذا لم يكن موجوداً
    console.log('👤 التحقق من وجود مسؤول النظام...');
    const existingAdmin = await db.select().from(users).where(eq(users.username, 'admin'));
    
    if (existingAdmin.length === 0) {
      await db.insert(users).values({
        username: 'admin',
        password: 'admin123', // في البيئة المحلية، كلمة مرور بسيطة
        name: 'مسؤول النظام',
        email: 'admin@university.edu',
        role: 'admin',
        active: true
      });
      console.log('✅ تم إنشاء حساب مسؤول النظام');
    } else {
      console.log('✅ حساب مسؤول النظام موجود');
    }

    // إضافة الكليات
    console.log('🏛️ إضافة الكليات...');
    const facultiesData = [
      { name: 'الهندسة و تقنية المعلومات' },
      { name: 'العلوم الطبية' }
    ];

    for (const faculty of facultiesData) {
      const existing = await db.select().from(faculties).where(eq(faculties.name, faculty.name));
      if (existing.length === 0) {
        await db.insert(faculties).values(faculty);
        console.log(`✅ تم إنشاء كلية: ${faculty.name}`);
      }
    }

    // إضافة التخصصات
    console.log('📚 إضافة التخصصات...');
    const majorsData = [
      { name: 'تقنية المعلومات', facultyId: 1 },
      { name: 'هندسة مدني', facultyId: 1 },
      { name: 'صيدلة', facultyId: 2 },
      { name: 'تغذية', facultyId: 2 }
    ];

    for (const major of majorsData) {
      const existing = await db.select().from(majors).where(eq(majors.name, major.name));
      if (existing.length === 0) {
        await db.insert(majors).values(major);
        console.log(`✅ تم إنشاء تخصص: ${major.name}`);
      }
    }

    // إضافة المستويات
    console.log('📊 إضافة المستويات...');
    const levelsData = [
      { name: 'التحضيري' },
      { name: 'المستوى الأول' },
      { name: 'المستوى الثاني' },
      { name: 'المستوى الثالث' },
      { name: 'المستوى الرابع' },
      { name: 'المستوى الخامس' }
    ];

    for (const level of levelsData) {
      const existing = await db.select().from(levels).where(eq(levels.name, level.name));
      if (existing.length === 0) {
        await db.insert(levels).values(level);
        console.log(`✅ تم إنشاء مستوى: ${level.name}`);
      }
    }

    // إضافة مواقع التدريب
    console.log('🏢 إضافة مواقع التدريب...');
    const sitesData = [
      {
        name: 'مستشفى الملك فهد',
        address: 'الرياض',
        contactName: 'د. محمد الأحمد',
        contactEmail: 'info@kfh.sa',
        contactPhone: '0112345678'
      },
      {
        name: 'شركة أرامكو السعودية',
        address: 'الظهران',
        contactName: 'م. أحمد العلي',
        contactEmail: 'training@aramco.com',
        contactPhone: '0138765432'
      },
      {
        name: 'شركة سابك',
        address: 'الجبيل',
        contactName: 'د. فاطمة الزهراني',
        contactEmail: 'hr@sabic.com',
        contactPhone: '0133456789'
      }
    ];

    for (const site of sitesData) {
      const existing = await db.select().from(trainingSites).where(eq(trainingSites.name, site.name));
      if (existing.length === 0) {
        await db.insert(trainingSites).values(site);
        console.log(`✅ تم إنشاء موقع تدريب: ${site.name}`);
      }
    }

    // إضافة سنة دراسية
    console.log('📅 إضافة السنة الدراسية...');
    const existingYear = await db.select().from(academicYears).where(eq(academicYears.name, '2024-2025'));
    if (existingYear.length === 0) {
      await db.insert(academicYears).values({
        name: '2024-2025',
        startDate: '2024-09-01',
        endDate: '2025-06-30',
        isCurrent: true
      });
      console.log('✅ تم إنشاء السنة الدراسية 2024-2025');
    }

    console.log('🎉 تم إعداد البيئة المحلية بنجاح!');
    console.log('');
    console.log('معلومات تسجيل الدخول:');
    console.log('المسؤول: admin / admin123');
    console.log('');
    console.log('يمكنك الآن تشغيل التطبيق باستخدام: npm run dev');
    
  } catch (error) {
    console.error('❌ خطأ في إعداد البيئة المحلية:', error);
    process.exit(1);
  }
}

setupLocalEnvironment();