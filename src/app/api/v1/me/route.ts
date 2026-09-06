import { me } from "@/lib/api/handlers";
import { respond } from "@/lib/api/route";

export async function GET(request: Request) {
  return respond(request, (caller) => me(caller));
}
