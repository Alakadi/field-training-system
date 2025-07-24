import bcrypt from 'bcrypt';
import pkg from 'pg';
const { Client } = pkg;

async function createAdminUser() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('🔗 متصل بقاعدة البيانات...');

    // Hash the admin password
    const adminPassword = 'admin123';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    console.log('🔐 تم تشفير كلمة المرور...');

    // Check if admin user already exists
    const existingUser = await client.query(
      'SELECT * FROM users WHERE username = $1',
      ['admin']
    );

    if (existingUser.rows.length > 0) {
      console.log('⚠️  المستخدم admin موجود مسبقاً');
      
      // Update password to hashed version if it's not already hashed
      const currentPassword = existingUser.rows[0].password;
      if (!currentPassword.startsWith('$2b$')) {
        await client.query(
          'UPDATE users SET password = $1 WHERE username = $2',
          [hashedPassword, 'admin']
        );
        console.log('✅ تم تحديث كلمة مرور المسؤول وتشفيرها');
      } else {
        console.log('✅ كلمة مرور المسؤول مشفرة مسبقاً');
      }
    } else {
      // Create new admin user
      await client.query(`
        INSERT INTO users (username, password, role, name, email, active)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['admin', hashedPassword, 'admin', 'مدير النظام', 'admin@system.local', true]);

      console.log('✅ تم إنشاء حساب المسؤول بنجاح');
      console.log('   اسم المستخدم: admin');
      console.log('   كلمة المرور: admin123');
      console.log('   تم تشفير كلمة المرور باستخدام bcrypt');
    }

  } catch (error) {
    console.error('❌ خطأ في إنشاء حساب المسؤول:', error.message);
  } finally {
    await client.end();
    console.log('🔚 تم إغلاق الاتصال بقاعدة البيانات');
  }
}

createAdminUser();