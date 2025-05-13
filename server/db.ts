
import * as schema from "@shared/schema";
import dotenv from 'dotenv';
import { Pool as PgPool } from 'pg';
import { drizzle as drizzleNodePg } from 'drizzle-orm/node-postgres';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

let pool: any;
let db: any;

// طريقة بسيطة للتحقق ما إذا كنا في بيئة VS Code المحلية أم لا
// إذا كان المنفذ 8080 (المستخدم في VS Code) بدلاً من 5000 (المستخدم في Replit)
const isLocalEnv = process.env.NODE_ENV !== "production" && 
                  (!process.env.PORT || process.env.PORT === "8080");

// VS Code local environment
if (isLocalEnv) {
  console.log("Running in local VS Code environment - using node-postgres");
  
  // استخدام PostgreSQL العادية
  pool = new PgPool({ connectionString: process.env.DATABASE_URL });
  db = drizzleNodePg(pool, { schema });
  
  console.log('Using local PostgreSQL connection with URL:', 
    process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 15) + '...' : 'undefined');
}
// Replit or production environment
else {
  console.log("Running in Replit or production environment - using NeonDB");
  
  // استخدام NeonDB
  neonConfig.webSocketConstructor = ws;
  
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  db = drizzleNeon(pool, { schema });
  
  console.log('Using NeonDB connection with URL:', 
    process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 25) + '...' : 'undefined');
}

export { pool, db };

// هذه التعليمات هي للمساعدة في VS Code عند استخدام قاعدة بيانات محلية:
/*
في VS Code عند الاتصال بقاعدة بيانات محلية:

1. تأكد من تثبيت الحزم التالية:
   npm install pg drizzle-orm drizzle-zod
   
2. إنشاء ملف .env في مجلد المشروع الرئيسي:
   DATABASE_URL=postgresql://postgres:password@localhost:5432/yourdbname
   SESSION_SECRET=your_local_session_secret
   PORT=8080

3. إنشاء قاعدة بيانات في PostgreSQL المحلي
   CREATE DATABASE yourdbname;

4. تشغيل سكربت دفع هيكل قاعدة البيانات:
   npm run db:push

5. تشغيل النظام:
   npm run dev

6. تسجيل الدخول باستخدام:
   username: admin
   password: admin123
*/

