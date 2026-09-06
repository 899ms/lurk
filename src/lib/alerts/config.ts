import { z } from "zod";

/**
 * Alert delivery reads its own environment. `RESEND_API_KEY` is already in the
 * app-wide schema; `ALERTS_FROM_EMAIL` is new and belongs beside it once the
 * owner of `src/lib/config.ts` folds these two in.
 */
/** An unset variable and one set to nothing mean the same thing in a .env file. */
const blankIsAbsent = (value: unknown) => (value === "" ? undefined : value);

const schema = z.object({
  RESEND_API_KEY: z.preprocess(blankIsAbsent, z.string().optional()),
  ALERTS_FROM_EMAIL: z.preprocess(blankIsAbsent, z.email().optional()),
  APP_URL: z.preprocess(blankIsAbsent, z.url().default("http://localhost:3000")),
});

export type AlertsConfig = z.infer<typeof schema>;

export function alertsConfig(env: NodeJS.ProcessEnv = process.env): AlertsConfig {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const fields = Object.keys(z.flattenError(parsed.error).fieldErrors).join(", ");
    throw new Error(`Invalid alert configuration: ${fields}`);
  }
  return parsed.data;
}

export type EmailSender = { apiKey: string; from: string };

/** The two values a real send needs, or null when email is not configured. */
export function emailSender(env: NodeJS.ProcessEnv = process.env): EmailSender | null {
  const { RESEND_API_KEY, ALERTS_FROM_EMAIL } = alertsConfig(env);
  if (!RESEND_API_KEY || !ALERTS_FROM_EMAIL) {
    return null;
  }
  return { apiKey: RESEND_API_KEY, from: ALERTS_FROM_EMAIL };
}
