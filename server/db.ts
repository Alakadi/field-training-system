
import * as schema from "@shared/schema";
import dotenv from 'dotenv';
import { Pool as PgPool } from 'pg';
import { drizzle as drizzleNodePg } from 'drizzle-orm/node-postgres';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

dotenv.config();

// Check if DATABASE_URL is set or can be constructed from PG environment variables
let databaseUrl = process.env.DATABASE_URL;

// Database connection setup

// If DATABASE_URL is empty but PG vars are available, construct it
if ((!databaseUrl || databaseUrl.trim() === '') && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGHOST && process.env.PGPORT && process.env.PGDATABASE) {
  databaseUrl = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;
  console.log("Constructed DATABASE_URL from PG environment variables");
}

if (!databaseUrl || databaseUrl.trim() === '') {
  console.error("DATABASE_URL is not set in environment variables");
  console.error("Available environment variables:", Object.keys(process.env).filter(key => key.includes('DATABASE') || key.includes('PG')));
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

let pool: any;
let db: any;

// تحديد البيئة: استخدام node-postgres دائماً في Replit للاستقرار
const isLocalEnv = true; // استخدام node-postgres دائماً

// VS Code local environment
if (isLocalEnv) {
  console.log("Running in local VS Code environment - using node-postgres");

  // استخدام PostgreSQL العادية
  pool = new PgPool({ connectionString: databaseUrl });
  db = drizzleNodePg(pool, { schema });

  console.log('Using local PostgreSQL connection with URL:', 
    databaseUrl ? databaseUrl.substring(0, 15) + '...' : 'undefined');
}
// Replit or production environment
else {
  console.log("Running in Replit or production environment - using NeonDB");

  // استخدام NeonDB
  neonConfig.webSocketConstructor = ws;

  pool = new NeonPool({ connectionString: databaseUrl });
  db = drizzleNeon(pool, { schema });

  console.log('Using NeonDB connection with URL:', 
    databaseUrl ? databaseUrl.substring(0, 25) + '...' : 'undefined');
}

export { pool, db };