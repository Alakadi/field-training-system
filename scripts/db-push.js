#!/usr/bin/env node

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Set websocket for Neon serverless
neonConfig.webSocketConstructor = ws;

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set in the environment. Please ensure this is configured.",
    );
  }

  console.log('⏳ Creating database connection...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  console.log('🔄 Pushing schema to database...');
  
  try {
    // Add an admin user after migration is complete
    const insertAdmin = async () => {
      console.log('✅ Creating admin user if it doesn\'t exist...');
      
      // Check if admin user exists
      const adminResult = await pool.query(`
        SELECT * FROM users WHERE username = 'admin' LIMIT 1
      `);
      
      if (adminResult.rows.length === 0) {
        // Insert admin user
        await pool.query(`
          INSERT INTO users (username, password, role, name, active) 
          VALUES ('admin', 'admin123', 'admin', 'مسؤول النظام', true)
        `);
        console.log('👤 Admin user created!');
      } else {
        console.log('👤 Admin user already exists');
      }
    };

    // Push schema changes to database
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "username" VARCHAR(100) NOT NULL UNIQUE,
        "password" VARCHAR(100) NOT NULL,
        "role" VARCHAR(20) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "email" VARCHAR(255),
        "phone" VARCHAR(20),
        "active" BOOLEAN DEFAULT true,
        "created_at" TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS "faculties" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS "majors" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "faculty_id" INTEGER REFERENCES "faculties"("id")
      );
      
      CREATE TABLE IF NOT EXISTS "levels" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS "supervisors" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
        "faculty_id" INTEGER REFERENCES "faculties"("id"),
        "department" VARCHAR(255)
      );
      
      CREATE TABLE IF NOT EXISTS "students" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
        "university_id" VARCHAR(20) NOT NULL UNIQUE,
        "faculty_id" INTEGER REFERENCES "faculties"("id"),
        "major_id" INTEGER REFERENCES "majors"("id"),
        "level_id" INTEGER REFERENCES "levels"("id"),
        "supervisor_id" INTEGER REFERENCES "supervisors"("id")
      );
      
      CREATE TABLE IF NOT EXISTS "training_sites" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "address" TEXT,
        "contact_name" VARCHAR(255),
        "contact_email" VARCHAR(255),
        "contact_phone" VARCHAR(20)
      );
      
      CREATE TABLE IF NOT EXISTS "training_courses" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "site_id" INTEGER NOT NULL REFERENCES "training_sites"("id"),
        "faculty_id" INTEGER REFERENCES "faculties"("id"),
        "supervisor_id" INTEGER REFERENCES "supervisors"("id"),
        "start_date" DATE NOT NULL,
        "end_date" DATE NOT NULL,
        "capacity" INTEGER DEFAULT 20,
        "location" VARCHAR(255),
        "description" TEXT,
        "status" VARCHAR(20) DEFAULT 'active',
        "created_by" INTEGER REFERENCES "users"("id"),
        "created_at" TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS "training_assignments" (
        "id" SERIAL PRIMARY KEY,
        "student_id" INTEGER NOT NULL REFERENCES "students"("id"),
        "course_id" INTEGER NOT NULL REFERENCES "training_courses"("id"),
        "status" VARCHAR(20) DEFAULT 'pending',
        "confirmed" BOOLEAN DEFAULT false,
        "assigned_at" TIMESTAMP DEFAULT NOW(),
        "created_by" INTEGER REFERENCES "users"("id"),
        UNIQUE("student_id", "course_id")
      );
      
      CREATE TABLE IF NOT EXISTS "evaluations" (
        "id" SERIAL PRIMARY KEY,
        "assignment_id" INTEGER NOT NULL REFERENCES "training_assignments"("id"),
        "score" INTEGER,
        "comments" TEXT,
        "evaluator_name" VARCHAR(255),
        "evaluation_date" TIMESTAMP DEFAULT NOW(),
        "created_by" INTEGER REFERENCES "users"("id")
      );
      
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" VARCHAR NOT NULL PRIMARY KEY,
        "sess" JSON NOT NULL,
        "expire" TIMESTAMP(6) NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);
    
    console.log('✅ Schema push completed successfully!');
    
    // Create admin user
    await insertAdmin();
    
    console.log('✨ Database setup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error pushing schema:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});