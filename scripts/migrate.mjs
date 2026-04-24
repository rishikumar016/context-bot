import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in .env.local");
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const db = drizzle(client);

try {
  await migrate(db, { migrationsFolder: "./supabase/migrations" });
  console.log("✓ migrations applied");
} catch (err) {
  console.error("✗ migration failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
