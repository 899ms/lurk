import { projectLeads } from "@/lib/api/handlers";
import { respond } from "@/lib/api/route";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  const query = new URL(request.url).searchParams;
  return respond(request, (caller) => projectLeads(caller, id, query));
}
