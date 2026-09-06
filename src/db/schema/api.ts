import { date, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { apiKeys } from "./tenant";

/**
 * What the public API stores about itself. The daily counter is one row per key
 * per UTC day, so the request limit is a single upsert; the name is a row beside
 * the key because a key's identity and its label change for different reasons.
 */

export const apiRequestCounts = pgTable(
  "api_request_counts",
  {
    keyId: text("key_id")
      .notNull()
      .references(() => apiKeys.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.keyId, t.day] })],
);

export const apiKeyNames = pgTable("api_key_names", {
  keyId: text("key_id")
    .primaryKey()
    .references(() => apiKeys.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});
