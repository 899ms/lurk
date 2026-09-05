import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "@/lib/config";
import * as schema from "./schema";

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

/** One pooled Drizzle client for the process. */
export function db() {
  if (!cached) {
    const sql = postgres(config().DATABASE_URL, { max: 10 });
    cached = drizzle(sql, { schema });
  }
  return cached;
}
