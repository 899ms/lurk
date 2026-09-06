import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // The app config is parsed from the environment, so the two required
    // variables need values even in tests that never open a database.
    env: {
      DATABASE_URL: "postgres://reddit_leads:reddit_leads@localhost:5433/reddit_leads_test",
      APP_ENCRYPTION_KEY: Buffer.alloc(32).toString("base64"),
    },
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
