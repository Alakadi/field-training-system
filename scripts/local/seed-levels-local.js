import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../shared/schema.ts';

async function seedLevelsLocal() {
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
    console.log('📚 إضافة المستويات الدراسية للبيئة المحلية...');

    const levels = [
      { name: 'المستوى الأول', description: 'السنة الأولى' },
      { name: 'المستوى الثاني', description: 'السنة الثانية' },
      { name: 'المستوى الثالث', description: 'السنة الثالثة' },
      { name: 'المستوى الرابع', description: 'السنة الرابعة' },
      { name: 'المستوى الخامس', description: 'السنة الخامسة' }
    ];

    for (const level of levels) {
      await db.insert(schema.levels).values(level).catch(() => {});
    }

    console.log('✅ تم إضافة المستويات الدراسية بنجاح');

  } catch (error) {
    console.error('❌ خطأ في إضافة المستويات:', error.message);
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedLevelsLocal();
}

export { seedLevelsLocal };