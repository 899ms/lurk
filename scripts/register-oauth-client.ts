/**
 * One-off operator command. Registers this instance as an AnyAPI OAuth client
 * and prints the client id to put in ANYAPI_OAUTH_CLIENT_ID. Never run at boot.
 */
import { PRODUCT_NAME } from "../src/lib/brand";
import { OAUTH_SCOPE } from "../src/lib/oauth";

const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const baseUrl = (process.env.ANYAPI_BASE_URL ?? "https://api.getanyapi.com").replace(/\/$/, "");

const body: Record<string, unknown> = {
  client_name: PRODUCT_NAME,
  redirect_uris: [`${appUrl}/connect/callback`],
  token_endpoint_auth_method: "none",
  scope: OAUTH_SCOPE,
};
if (appUrl.startsWith("https://")) {
  body.client_uri = appUrl;
  body.logo_uri = `${appUrl}/anyapi-mark.svg`;
}

const response = await fetch(`${baseUrl}/oauth/register`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});
if (!response.ok) {
  throw new Error(`Registration failed with status ${response.status}: ${await response.text()}`);
}
const registered = (await response.json()) as { client_id: string };
console.log(`ANYAPI_OAUTH_CLIENT_ID=${registered.client_id}`);
