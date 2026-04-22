import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Supabase pooler: disable prepared statements (transaction mode doesn't support them)
const client = postgres(process.env.DATABASE_URL, {
  prepare: false,
});

export const db = drizzle(client, { schema });
export { schema };
