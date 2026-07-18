#!/usr/bin/env node
/**
 * neo-builder MCP server (stdio).
 *
 * Spawned by an MCP host (Claude Code, Cursor...). Owns a WebSocket server on
 * port 4819; the running playground tab connects out to it and executes every
 * tool call against the live EditorStore. See the bridge counterpart in
 * apps/playground/src/mcpBridge.ts and the protocol in ./protocol.ts.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { WebSocketServer, type WebSocket } from "ws";
import { BRIDGE_TOOLS, createRpcPeer, type RpcPeer } from "./protocol.js";

const PORT = 4819;
const NO_BROWSER =
  "No playground connected. Open http://localhost:5173 (pnpm --filter playground dev) — the playground bridges automatically.";

let socket: WebSocket | null = null;
let peer: RpcPeer | null = null;

const wss = new WebSocketServer({ port: PORT });

wss.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `neo-builder-mcp: port ${PORT} is already in use — another MCP session is running. Close it first (single-session by design).`,
    );
    process.exit(1);
  }
  console.error(`neo-builder-mcp: websocket server error: ${err.message}`);
});

wss.on("connection", (ws) => {
  // Last-connected tab wins.
  if (socket && socket !== ws) {
    peer?.rejectAll("playground reconnected from another tab");
    socket.close();
  }
  socket = ws;
  peer = createRpcPeer((json) => ws.send(json));
  ws.on("message", (data) => peer?.handleMessage(data.toString()));
  ws.on("close", () => {
    if (socket === ws) {
      peer?.rejectAll("playground disconnected");
      socket = null;
      peer = null;
    }
  });
});

const server = new Server(
  { name: "neo-builder", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: BRIDGE_TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  if (!BRIDGE_TOOLS.some((t) => t.name === name)) {
    return { content: [{ type: "text", text: `Unknown tool "${name}".` }], isError: true };
  }
  if (!peer) {
    return { content: [{ type: "text", text: NO_BROWSER }], isError: true };
  }
  try {
    const result = await peer.call(name, args ?? {});
    if (name === "screenshot") {
      const img = result as { data: string; mediaType: string };
      return { content: [{ type: "image", data: img.data, mimeType: img.mediaType }] };
    }
    const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
    return { content: [{ type: "text", text }] };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { content: [{ type: "text", text: message }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`neo-builder-mcp: ready (ws bridge on :${PORT})`);
