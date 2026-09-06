import { Resend } from "resend";
import { emailSender } from "./config";
import { digestSubject, renderDigestHtml, renderDigestText } from "./digest";
import { discordPayload, genericPayload, postWebhook, slackPayload } from "./webhooks";
import type { AlertChannel, Digest } from "./types";

/** What a webhook channel would receive, so a test can read it without sending. */
export function payloadFor(channel: AlertChannel, digest: Digest) {
  if (channel === "slack") {
    return slackPayload(digest);
  }
  return channel === "discord" ? discordPayload(digest) : genericPayload(digest);
}

async function sendEmail(to: string, digest: Digest): Promise<void> {
  const sender = emailSender();
  if (!sender) {
    throw new Error("Email alerts need RESEND_API_KEY and ALERTS_FROM_EMAIL");
  }
  const sent = await new Resend(sender.apiKey).emails.send({
    from: sender.from,
    to,
    subject: digestSubject(digest),
    html: renderDigestHtml(digest),
    text: renderDigestText(digest),
  });
  if (sent.error) {
    throw new Error(sent.error.message);
  }
}

/** Delivers one digest down one channel. Throws so the caller can record why. */
export async function sendToChannel(
  channel: AlertChannel,
  target: string,
  digest: Digest,
): Promise<void> {
  if (channel === "email") {
    await sendEmail(target, digest);
    return;
  }
  await postWebhook(target, payloadFor(channel, digest));
}
