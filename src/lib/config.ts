import { z } from "zod";

const bool = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_URL: z.url().default("http://localhost:3000"),
  APP_ENCRYPTION_KEY: z.string().min(1),
  SELF_HOSTED: bool,
  RUN_SCHEDULER: bool,

  ANYAPI_BASE_URL: z.url().default("https://api.getanyapi.com"),
  ANYAPI_OAUTH_CLIENT_ID: z.string().optional(),
  ANYAPI_HOUSE_API_KEY: z.string().optional(),

  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default("meta/muse-spark-1.3-contributor"),

  RESEND_API_KEY: z.string().optional(),

  HOUSE_DATA_CAP_USD_PER_DAY: z.coerce.number().nonnegative().default(25),
  HOUSE_LLM_CAP_USD_PER_DAY: z.coerce.number().nonnegative().default(10),
});

export type Config = z.infer<typeof schema>;

let cached: Config | null = null;

/** Parsed process env. Throws on the first read when a required value is absent. */
export function config(): Config {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const fields = Object.keys(z.flattenError(parsed.error).fieldErrors).join(", ");
      throw new Error(`Invalid environment configuration: ${fields}`);
    }
    cached = parsed.data;
  }
  return cached;
}
