import { NextResponse } from "next/server";
import { requireLocalUser } from "@/lib/auth";
import { authorizeUrl, createPkcePair, randomState } from "@/lib/oauth";

export const CONNECT_COOKIE = "anyapi_oauth";

/** Starts the wallet connect flow: mint PKCE, stash it, send the human to AnyAPI. */
export async function GET() {
  await requireLocalUser();
  const { verifier, challenge } = createPkcePair();
  const state = randomState();
  const response = NextResponse.redirect(authorizeUrl(state, challenge));
  response.cookies.set(CONNECT_COOKIE, JSON.stringify({ verifier, state }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/connect",
    maxAge: 600,
  });
  return response;
}
