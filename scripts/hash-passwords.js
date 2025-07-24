
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

// Database connection
let db;
if (process.env.NODE_ENV === 'production') {
  // Production: Use NeonDB serverless
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);
  db = drizzle(sql, { schema });
} else {
  // Development: Use node-postgres
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/training_db"
  });
  db = drizzle(pool, { schema });
}

async function hashExistingPasswords() {
  try {
    console.log('🔒 بدء تشفير كلمات المرور الموجودة...');
    
    // Get all users
    const users = await db.select().from(schema.users);
    
    for (const user of users) {
      // Check if password is already hashed
      if (!user.password.startsWith('$2b$')) {
        console.log(`تشفير كلمة المرور للمستخدم: ${user.username}`);
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(user.password, 10);
        
        // Update user with hashed password
        await db.update(schema.users)
          .set({ password: hashedPassword })
          .where(eq(schema.users.id, user.id));
        
        console.log(`✅ تم تشفير كلمة المرور للمستخدم: ${user.username}`);
      } else {
        console.log(`كلمة المرور مشفرة مسبقاً للمستخدم: ${user.username}`);
      }
    }
    
    console.log('🎉 تم تشفير جميع كلمات المرور بنجاح!');
    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ في تشفير كلمات المرور:', error);
    process.exit(1);
  }
}

hashExistingPasswords();
