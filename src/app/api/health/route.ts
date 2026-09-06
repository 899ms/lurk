/** Liveness for the deploy check. No auth, no database, no cost. */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok" });
}
