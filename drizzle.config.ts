
// import { defineConfig } from "drizzle-kit";

// if (!process.env.DATABASE_URL) {
//   throw new Error("DATABASE_URL must be set");
// }

// export default defineConfig({
//   out: "./migrations",
//   schema: "./shared/schema.ts",
//   driver: 'pg',
//   dbCredentials: {
//       _connectionString: process.env.DATABASE_URL,
//       get connectionString() {
//           return this._connectionString;
//       },
//       set connectionString(value) {
//           this._connectionString = value;
//       },
//   },
// });
import { defineConfig } from "drizzle-kit";
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
