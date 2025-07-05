import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../shared/schema.ts';

async function seedFacultiesLocal() {
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
    console.log('🏛️  إضافة الكليات والتخصصات للبيئة المحلية...');

    // إضافة الكليات
    const [engineeringFaculty] = await db.insert(schema.faculties).values({
      name: 'كلية الهندسة وتقنية المعلومات',
      description: 'كلية متخصصة في الهندسة وتقنية المعلومات'
    }).returning().catch(() => []);

    const [medicalFaculty] = await db.insert(schema.faculties).values({
      name: 'كلية العلوم الطبية التطبيقية',
      description: 'كلية متخصصة في العلوم الطبية والصحية'
    }).returning().catch(() => []);

    // إضافة التخصصات
    const majors = [
      {
        name: 'تقنية المعلومات',
        facultyId: engineeringFaculty?.id || 1,
        description: 'تخصص في تطوير وإدارة أنظمة المعلومات'
      },
      {
        name: 'الهندسة المدنية',
        facultyId: engineeringFaculty?.id || 1,
        description: 'تخصص في تصميم وبناء المنشآت المدنية'
      },
      {
        name: 'الصيدلة',
        facultyId: medicalFaculty?.id || 2,
        description: 'تخصص في علوم الأدوية والعقاقير'
      },
      {
        name: 'التغذية العلاجية',
        facultyId: medicalFaculty?.id || 2,
        description: 'تخصص في التغذية والعلاج الغذائي'
      }
    ];

    for (const major of majors) {
      await db.insert(schema.majors).values(major).catch(() => {});
    }

    console.log('✅ تم إضافة الكليات والتخصصات بنجاح');

  } catch (error) {
    console.error('❌ خطأ في إضافة الكليات:', error.message);
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedFacultiesLocal();
}

export { seedFacultiesLocal };