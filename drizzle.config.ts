import {config} from "dotenv";
import { defineConfig } from "drizzle-kit";

config({path:".env.local"})

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in .env.local");
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // `documents` depends on Supabase's auth schema — exclude it from introspection/diffs
  schemaFilter: ["public"],
  verbose: true,
  strict: true,
});
