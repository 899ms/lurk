import { requireCaller, type ApiCaller } from "./auth";
import { apiJson, toApiErrorResponse } from "./responses";

/**
 * The one place a public API request becomes a response: authenticate, count it
 * against the key's day, run the handler, and serialize whatever it throws.
 */
export async function respond(
  request: Request,
  run: (caller: ApiCaller) => Promise<unknown>,
): Promise<Response> {
  try {
    const caller = await requireCaller(request);
    return apiJson(await run(caller));
  } catch (thrown) {
    return toApiErrorResponse(thrown);
  }
}
