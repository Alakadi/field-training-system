import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../shared/schema.ts';

async function createAdminLocal() {
  // قراءة متغيرات البيئة من .env
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ متغير DATABASE_URL غير موجود في ملف .env');
    console.error('تأكد من إنشاء ملف .env مع متغيرات قاعدة البيانات الصحيحة');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  const db = drizzle(pool, { schema });

  try {
    console.log('🔨 إنشاء حساب المسؤول للبيئة المحلية...');

    // إنشاء مستخدم المسؤول
    const [adminUser] = await db.insert(schema.users).values({
      username: 'admin',
      password: 'admin123', // في الإنتاج، استخدم bcrypt
      name: 'مسؤول النظام',
      email: 'admin@university.local',
      role: 'admin',
      active: true,
    }).returning();

    console.log('✅ تم إنشاء حساب المسؤول بنجاح');
    console.log('📋 معلومات تسجيل الدخول:');
    console.log('   اسم المستخدم: admin');
    console.log('   كلمة المرور: admin123');

  } catch (error) {
    if (error.code === '23505') { // Unique violation
      console.log('ℹ️  حساب المسؤول موجود مسبقاً');
    } else {
      console.error('❌ خطأ في إنشاء حساب المسؤول:', error.message);
    }
  } finally {
    await pool.end();
  }
}

// تشغيل الدالة إذا تم استدعاء الملف مباشرة
if (import.meta.url === `file://${process.argv[1]}`) {
  createAdminLocal();
}

export { createAdminLocal };