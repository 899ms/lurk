import { existsSync } from "node:fs";

/**
 * The database-backed tests read DATABASE_URL, which lives in .env like every
 * other local secret. Without this they silently skip on a machine that has a
 * database, which is the same as not having written them.
 */
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}
