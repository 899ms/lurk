import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { requireCaller } from "@/lib/api/auth";
import { mcpServerFor } from "@/lib/api/mcp";
import { COST_HEADER, toApiErrorResponse } from "@/lib/api/responses";

/**
 * The MCP endpoint. Same Bearer key as the REST API, same handlers behind it,
 * and the same "reading costs nothing" header on every response.
 */
async function handle(request: Request): Promise<Response> {
  let transport: WebStandardStreamableHTTPServerTransport | null = null;
  try {
    const caller = await requireCaller(request);
    transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await mcpServerFor(caller).connect(transport);
    const response = await transport.handleRequest(request);
    response.headers.set(COST_HEADER, "0");
    return response;
  } catch (thrown) {
    await transport?.close();
    return toApiErrorResponse(thrown);
  }
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function DELETE(request: Request) {
  return handle(request);
}
