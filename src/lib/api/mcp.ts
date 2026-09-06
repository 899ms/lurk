import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { PRODUCT_NAME, PRODUCT_NAME_WITH_PROVIDER } from "@/lib/brand";
import type { ApiCaller } from "./auth";
import { callTool, TOOLS } from "./mcpTools";
import { ApiError } from "./responses";

/**
 * An MCP server bound to one caller. Stateless: a fresh server and transport
 * serve each HTTP request, so a key can never see another key's session.
 */
export function mcpServerFor(caller: ApiCaller): Server {
  const server = new Server(
    {
      name: PRODUCT_NAME,
      version: "1.0.0",
      description: `${PRODUCT_NAME_WITH_PROVIDER}: read-only access to scored Reddit buyer-intent leads.`,
    },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;
    try {
      return { content: [{ type: "text" as const, text: await callTool(caller, request.params.name, args) }] };
    } catch (thrown) {
      const message = thrown instanceof ApiError ? thrown.message : String(thrown);
      return { content: [{ type: "text" as const, text: message }], isError: true };
    }
  });

  return server;
}
