import { config } from "@/lib/config";

export type EmailSender = { apiKey: string; from: string };

/** The two values a real send needs, or null when email is not configured. */
export function emailSender(): EmailSender | null {
  const { RESEND_API_KEY, ALERTS_FROM_EMAIL } = config();
  if (!RESEND_API_KEY || !ALERTS_FROM_EMAIL) {
    return null;
  }
  return { apiKey: RESEND_API_KEY, from: ALERTS_FROM_EMAIL };
}
