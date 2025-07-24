import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

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

    // Create admin user if doesn't exist
    const existingAdmin = await db.select().from(schema.users).where(eq(schema.users.username, 'admin'));

    if (existingAdmin.length === 0) {
      // Hash the admin password
      const hashedPassword = await bcrypt.hash('admin123', 10);

      const adminUser = await db.insert(schema.users).values({
        username: 'admin',
        password: hashedPassword,
        name: 'مدير النظام',
        email: 'admin@system.local',
        active: true
      }).returning();

      console.log('✅ تم إنشاء حساب المسؤول مع كلمة مرور مشفرة');
      console.log('   اسم المستخدم: admin');
      console.log('   كلمة المرور: admin123');
    } else {
      // Update existing admin password to be hashed if it's not already
      const admin = existingAdmin[0];
      if (!admin.password.startsWith('$2b$')) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await db.update(schema.users)
          .set({ password: hashedPassword })
          .where(eq(schema.users.id, admin.id));
        console.log('✅ تم تحديث كلمة مرور المسؤول وتشفيرها');
      } else {
        console.log('✅ حساب المسؤول موجود مسبقاً مع كلمة مرور مشفرة');
      }
    }

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