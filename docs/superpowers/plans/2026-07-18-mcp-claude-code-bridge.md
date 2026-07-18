# MCP Claude Code Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Claude Code drive the live playground: stdio MCP server (`packages/mcp`) ↔ WebSocket (port 4819) ↔ playground bridge executing against EditorStore.

**Architecture:** Server owns WS server; playground connects out as client and executes RPCs in the browser where Registry/EditorStore/compilers/dialect live. Tools: get_document, list_element_types, apply_plan, set_theme, set_page, export, screenshot.

**Tech Stack:** @modelcontextprotocol/sdk (stdio), ws, existing @neo-builder/* packages, vitest.

## Global Constraints

- Port **4819** fixed; bind failure → exit with clear message.
- Per-call timeout **30s**; no browser → error "open http://localhost:5173 — the playground bridges automatically".
- Multiple tabs: last-connected wins (close previous socket).
- ESM everywhere (`"type": "module"`), tsup build, spec at `docs/superpowers/specs/2026-07-18-mcp-claude-code-bridge-design.md`.

---

### Task 1: RPC protocol + tool catalog (`packages/mcp`)

**Files:**
- Create: `packages/mcp/src/protocol.ts`
- Create: `packages/mcp/src/protocol.test.ts`

**Interfaces (Produces):**
- `interface RpcRequest { id: number; method: string; params?: unknown }`
- `interface RpcResponse { id: number; result?: unknown; error?: string }`
- `createRpcPeer(send: (json: string) => void, opts?: { timeoutMs?: number })` → `{ call(method, params): Promise<unknown>; handleMessage(json: string): void; rejectAll(reason: string): void }`
- `export const BRIDGE_TOOLS: { name; description; inputSchema }[]` — the seven tools with JSON Schemas (get_document {}, list_element_types {}, apply_plan {steps:[{command,args}]}, set_theme {tokens:object}, set_page {dialect:string}, export {target:"html"|"mjml"|"form"}, screenshot {width?:number}).

- [ ] Failing tests: call resolves on matching response id; rejects on error field; times out; rejectAll rejects pending; malformed JSON ignored.
- [ ] Implement `createRpcPeer` (incrementing ids, pending map, setTimeout per call).
- [ ] `pnpm vitest run packages/mcp` green. Commit `feat(mcp): rpc protocol + bridge tool catalog`.

### Task 2: stdio MCP server (`packages/mcp/src/server.ts`)

**Files:**
- Create: `packages/mcp/src/server.ts` (bin)
- Modify: `packages/mcp/package.json` (deps `@modelcontextprotocol/sdk`, `ws`; `bin: {"neo-builder-mcp": "./dist/server.js"}`; tsup builds `src/index.ts src/server.ts`)

**Interfaces (Consumes):** `createRpcPeer`, `BRIDGE_TOOLS` from Task 1.

- [ ] `McpServer` over `StdioServerTransport`; register each BRIDGE_TOOLS entry; handler forwards to current WS socket via peer.call(name, args); no socket → McpError with the instructive message.
- [ ] `WebSocketServer({ port: 4819 })`; on new connection close previous; on close → peer.rejectAll. `EADDRINUSE` → stderr message + exit(1).
- [ ] `screenshot` result `{data, mediaType}` returned as MCP image content block; others as JSON/text content.
- [ ] Build passes (`pnpm --filter @neo-builder/mcp build`). Commit `feat(mcp): stdio server with ws bridge`.

### Task 3: Playground bridge (`apps/playground/src/mcpBridge.ts`)

**Files:**
- Create: `apps/playground/src/mcpBridge.ts`
- Modify: `apps/playground/src/App.tsx` (start bridge with builder store; status badge in chrome)

**Interfaces (Consumes):** EditorStore (`getState().doc`, `theme`, `registry`, `applyPlan`, `setTheme`, `setDocument`), `walk` (core), `buildElementHints`/`extractDialect`/`parseElementHtml`/`parseDialectTheme` (@neo-builder/ai), `compileHtml`/`compileMjml`(+mjml-browser)/`compileForm`, `captureHtml` (snapshot.ts).

- [ ] `createBridgeHandlers(store, { mjmlToHtml })` → `Record<string, (params) => Promise<unknown>>` implementing the seven tools:
  - get_document → `{ outline: "id: type" lines, theme, builderType }`
  - list_element_types → element hints text + aiMeta list
  - apply_plan → `store.applyPlan(steps)` result
  - set_theme → merge into `store.theme`, `store.setTheme`
  - set_page → `parseDialectTheme(dialect, store.theme)` → `parseElementHtml(dialect, registry, theme)` → setTheme + setDocument → outline back
  - export → compile per target (mjml via mjml-browser like AgentPanel)
  - screenshot → compileHtml → `captureHtml(html, width)` → `{data, mediaType}`
- [ ] `startMcpBridge(store, deps)` — WS client to `ws://localhost:4819`, respond `{id, result|error}`, reconnect every 2s, returns stop().
- [ ] Wire in App.tsx (`useEffect` on builder), small connected/disconnected badge.
- [ ] Commit `feat(playground): mcp websocket bridge`.

### Task 4: Registration + live verification

**Files:**
- Create: `.mcp.json` → `{"mcpServers": {"neo-builder": {"command": "node", "args": ["packages/mcp/dist/server.js"]}}}`

- [ ] Build mcp package; start playground; connect from Claude Code session; drive set_page → screenshot → apply_plan → export live.
- [ ] Commit `chore: register neo-builder mcp server`.
