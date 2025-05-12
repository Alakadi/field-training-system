
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  driver: 'pg',
  dbCredentials: {
      _connectionString: process.env.DATABASE_URL,
      get connectionString() {
          return this._connectionString;
      },
      set connectionString(value) {
          this._connectionString = value;
      },
  },
});
