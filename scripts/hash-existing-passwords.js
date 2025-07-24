
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import bcrypt from 'bcrypt';
import * as schema from '../shared/schema.ts';

async function hashExistingPasswords() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ متغير DATABASE_URL غير موجود في ملف .env');
    process.exit(1);
  }

  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    console.log('🔐 بدء تشفير كلمات المرور الموجودة...');

    // جلب جميع المستخدمين
    const users = await db.select().from(schema.users);
    
    for (const user of users) {
      // التحقق من أن كلمة المرور غير مشفرة (طول كلمة المرور المشفرة مع bcrypt عادة 60 حرف)
      if (user.password.length < 60) {
        console.log(`تشفير كلمة المرور للمستخدم: ${user.username}`);
        
        // تشفير كلمة المرور
        const hashedPassword = await bcrypt.hash(user.password, 10);
        
        // تحديث كلمة المرور في قاعدة البيانات
        await db.update(schema.users)
          .set({ password: hashedPassword })
          .where(schema.users.id.eq(user.id));
          
        console.log(`✅ تم تشفير كلمة المرور للمستخدم: ${user.username}`);
      } else {
        console.log(`⏭️  كلمة المرور للمستخدم ${user.username} مشفرة بالفعل`);
      }
    }

    console.log('✅ تم تشفير جميع كلمات المرور بنجاح');
    
  } catch (error) {
    console.error('❌ خطأ في تشفير كلمات المرور:', error);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

hashExistingPasswords();
