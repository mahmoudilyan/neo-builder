# MCP Claude Code Bridge — Design

Date: 2026-07-18
Status: Approved (user), pre-implementation

## Goal

Let Claude Code (and any MCP host: Cursor, Codex) drive the live neo-builder
playground directly — the "wedge C" launch artifact. No Anthropic API key in the
app; the agent session is the intelligence, the builder is the substrate.

## Architecture

Standalone stdio MCP server + WebSocket bridge to the running playground tab.

```
Claude Code ── stdio (MCP) ──> packages/mcp server.ts ── ws://localhost:4819 ──> playground mcpBridge.ts ──> EditorStore
```

- The MCP host spawns `packages/mcp/dist/server.js` (registered in repo-root
  `.mcp.json`). The server owns a WebSocket server on fixed port **4819**.
- The playground connects out as a WS client (auto-reconnect, 2s backoff).
- Every MCP tool call is forwarded as a JSON-RPC request over the WS and
  executed in the browser, where the Registry, EditorStore, compilers and
  dialect parser already live. Result (or error) returns to the MCP host.
- Timeout per call: 30s. No browser connected → instructive error
  ("open http://localhost:5173 — the playground bridges automatically").
- Multiple tabs: last-connected socket wins (previous socket is closed).
- Second server instance (two MCP hosts): port 4819 bind fails → server exits
  with a clear message; single-session by design for now.

Rejected alternative: Vite-plugin-hosted HTTP MCP endpoint. Fewer processes but
ties MCP to Vite, weaker story for non-Claude hosts; the standalone server is
the same artifact users get at launch.

## Components

### 1. `packages/mcp/src/server.ts` (new, bin entry)

- `@modelcontextprotocol/sdk` stdio server + `ws` WebSocketServer(4819).
- JSON-RPC framing over WS: `{id, method, params}` → `{id, result | error}`.
- Tools (full substrate):
  - `get_document` — document outline (ids, types, key props) + current theme.
  - `list_element_types` — aiMeta catalog + per-type prop contracts (reuse the
    element-hints approach from the planner).
  - `apply_plan` — `CommandStep[]`, supports `$K` symbolic refs; forwards to
    `store.applyPlan` (lenient: `{applied, skipped}`), one undo step.
  - `set_theme` — partial `ThemeTokens` merge.
  - `set_page` — element-HTML dialect text incl. `<theme>` tag; parsed in the
    browser against the live registry (`generatePageHtml` parse path);
    replaces doc + theme.
  - `export` — `{target: "html" | "mjml" | "form"}` → compiled output.
  - `screenshot` — browser `captureHtml` → base64 PNG returned as MCP image
    content, so the agent can see what it built.
- Registered Skills surfaced as MCP prompts (existing `buildSkillPrompts`).
- Existing descriptor exports in `index.ts` stay (transport-agnostic layer).

### 2. `apps/playground/src/mcpBridge.ts` (new)

- WS client to `ws://localhost:4819`; auto-reconnect.
- RPC handler map calling the same store APIs AgentPanel already uses:
  outline/theme reads, `applyPlan`, `setTheme`, dialect parse + `setDocument`,
  `compileHtml`/`compileMjml`/`compileForm`, `captureHtml`.
- Toolbar status badge: connected / disconnected.

### 3. Registration

- Repo-root `.mcp.json` pointing at the built server so this project's Claude
  Code sessions get the `neo-builder` MCP server.

## Error handling

- Unknown tool / bad params → MCP tool error with message.
- Browser RPC throws → error text propagated to host verbatim.
- WS drop mid-call → pending calls rejected with "playground disconnected".

## Testing

- Unit: RPC framing (request/response/timeout), tool input schemas, server
  routing with a fake WS peer.
- Bridge handlers exercised headlessly against a real EditorStore (jsdom-free
  paths where possible; captureHtml stays browser-only, guarded).
- Live verification: drive the loop end-to-end from a Claude Code session
  (set_page → screenshot → apply_plan → export).

## Out of scope

- Multi-session routing, auth, remote transport (HTTP/SSE) — later.
- Arbitrary-HTML import (previously rejected).
