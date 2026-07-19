import { walk } from "@neo-builder/core";
import type { EditorStore } from "@neo-builder/editor-react";
import { buildElementHints, parseElementHtml, parseDialectTheme, extractDialect } from "@neo-builder/ai";
import { compileHtml } from "@neo-builder/compiler-html";
import { compileMjml } from "@neo-builder/compiler-mjml";
import { compileForm } from "@neo-builder/compiler-form";
import { captureHtml } from "./snapshot.js";

/**
 * Browser side of the neo-builder MCP bridge. The MCP server (packages/mcp
 * server.ts, spawned by Claude Code) owns ws://localhost:4819; this module
 * connects out and executes each tool call against the live EditorStore.
 */

const BRIDGE_URL = "ws://localhost:4819";
const RECONNECT_MS = 2000;

type Handler = (params: Record<string, unknown>) => Promise<unknown> | unknown;

export interface BridgeDeps {
  /** MJML → HTML (mjml-browser) for email export; omit outside email builder. */
  mjmlToHtml?: (mjml: string) => string;
}

function outlineOf(store: EditorStore): string {
  return [...walk(store.getState().doc)].map((n) => `${n.id}: ${n.type}`).join("\n");
}

function compilePage(store: EditorStore): string {
  return compileHtml(store.getState().doc, {
    registry: store.registry,
    theme: store.theme,
    profile: store.profile,
    title: "Preview",
  });
}

/** Merge partial theme tokens one level deep (colors, fonts, radii...). */
function mergeTheme(base: Record<string, unknown>, tokens: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(tokens)) {
    const prev = next[key];
    next[key] =
      value && typeof value === "object" && !Array.isArray(value) && prev && typeof prev === "object" && !Array.isArray(prev)
        ? { ...(prev as object), ...(value as object) }
        : value;
  }
  return next;
}

export function createBridgeHandlers(store: EditorStore, deps: BridgeDeps = {}): Record<string, Handler> {
  return {
    get_document: () => ({
      builderType: store.getState().builderType,
      outline: outlineOf(store),
      theme: store.theme,
    }),

    list_element_types: () => {
      const defs = store.registry.list();
      const catalog = defs.map((d) => `- ${d.type}: ${d.aiMeta.description}`).join("\n");
      return {
        elements: catalog,
        props: buildElementHints(defs),
        commands: store.listCommands().map((c) => `${c.name}: ${c.title}`),
      };
    },

    set_page: (params) => {
      const dialect = String(params.dialect ?? "");
      if (!dialect.trim()) throw new Error("set_page requires non-empty dialect markup");
      const body = extractDialect(dialect);
      const theme = parseDialectTheme(dialect, store.theme);
      const doc = parseElementHtml(body, store.registry, theme);
      store.setTheme(theme);
      store.setDocument(doc);
      return { outline: outlineOf(store) };
    },

    apply_plan: (params) => {
      const steps = params.steps as { command: string; args: unknown[] }[] | undefined;
      if (!Array.isArray(steps) || steps.length === 0) throw new Error("apply_plan requires steps[]");
      const result = store.applyPlan(steps);
      return { ...result, outline: outlineOf(store) };
    },

    set_theme: (params) => {
      const tokens = params.tokens;
      if (!tokens || typeof tokens !== "object") throw new Error("set_theme requires a tokens object");
      store.setTheme(mergeTheme(store.theme as unknown as Record<string, unknown>, tokens as Record<string, unknown>) as never);
      return { theme: store.theme };
    },

    export: (params) => {
      const target = params.target;
      const doc = store.getState().doc;
      const opts = { registry: store.registry, theme: store.theme };
      if (target === "html") return compilePage(store);
      if (target === "mjml") {
        const mjml = compileMjml(doc, opts);
        return deps.mjmlToHtml ? deps.mjmlToHtml(mjml) : mjml;
      }
      if (target === "form") return compileForm(doc, opts);
      throw new Error(`unknown export target "${String(target)}" — use html, mjml or form`);
    },

    screenshot: async (params) => {
      const width = typeof params.width === "number" ? params.width : 1024;
      return captureHtml(compilePage(store), width);
    },
  };
}

export type BridgeStatus = "connected" | "disconnected";

/** Connect to the MCP server bridge; auto-reconnects until stopped. */
export function startMcpBridge(
  store: EditorStore,
  deps: BridgeDeps = {},
  onStatus?: (status: BridgeStatus) => void,
): () => void {
  const handlers = createBridgeHandlers(store, deps);
  let ws: WebSocket | null = null;
  let stopped = false;
  let retry: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    if (stopped) return;
    ws = new WebSocket(BRIDGE_URL);
    ws.onopen = () => onStatus?.("connected");
    ws.onmessage = async (event) => {
      let req: { id: number; method: string; params?: Record<string, unknown> };
      try {
        req = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (typeof req?.id !== "number" || typeof req?.method !== "string") return;
      const respond = (payload: object) => ws?.send(JSON.stringify({ id: req.id, ...payload }));
      const handler = handlers[req.method];
      if (!handler) return respond({ error: `unknown method "${req.method}"` });
      try {
        respond({ result: (await handler(req.params ?? {})) ?? null });
      } catch (e) {
        respond({ error: e instanceof Error ? e.message : String(e) });
      }
    };
    ws.onclose = () => {
      onStatus?.("disconnected");
      if (!stopped) retry = setTimeout(connect, RECONNECT_MS);
    };
    ws.onerror = () => ws?.close();
  };

  connect();
  return () => {
    stopped = true;
    if (retry) clearTimeout(retry);
    ws?.close();
  };
}
