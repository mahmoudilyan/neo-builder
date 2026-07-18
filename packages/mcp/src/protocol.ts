/**
 * Wire protocol between the MCP server (Node) and the playground bridge
 * (browser) over a WebSocket. Transport-agnostic: both ends exchange JSON
 * strings; `createRpcPeer` handles framing, correlation and timeouts.
 */

export interface RpcRequest {
  id: number;
  method: string;
  params?: unknown;
}

export interface RpcResponse {
  id: number;
  result?: unknown;
  error?: string;
}

export interface RpcPeer {
  /** Send a request and await the correlated response. */
  call(method: string, params?: unknown): Promise<unknown>;
  /** Feed an incoming JSON message (responses) into the peer. */
  handleMessage(json: string): void;
  /** Reject every pending call (e.g. the socket dropped). */
  rejectAll(reason: string): void;
}

export function createRpcPeer(
  send: (json: string) => void,
  opts: { timeoutMs?: number } = {},
): RpcPeer {
  const timeoutMs = opts.timeoutMs ?? 30_000;
  let nextId = 1;
  const pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }
  >();

  const settle = (id: number) => {
    const entry = pending.get(id);
    if (entry) {
      clearTimeout(entry.timer);
      pending.delete(id);
    }
    return entry;
  };

  return {
    call(method, params) {
      const id = nextId++;
      return new Promise<unknown>((resolve, reject) => {
        const timer = setTimeout(() => {
          settle(id);
          reject(new Error(`"${method}" timed out after ${timeoutMs}ms — is the playground tab still open?`));
        }, timeoutMs);
        pending.set(id, { resolve, reject, timer });
        const req: RpcRequest = { id, method, params };
        try {
          send(JSON.stringify(req));
        } catch (e) {
          settle(id);
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      });
    },
    handleMessage(json) {
      let msg: RpcResponse;
      try {
        msg = JSON.parse(json) as RpcResponse;
      } catch {
        return; // not ours; ignore
      }
      if (typeof msg?.id !== "number") return;
      const entry = settle(msg.id);
      if (!entry) return;
      if (msg.error !== undefined) entry.reject(new Error(msg.error));
      else entry.resolve(msg.result);
    },
    rejectAll(reason) {
      for (const [id, entry] of [...pending]) {
        settle(id);
        entry.reject(new Error(reason));
      }
    },
  };
}

/** JSON Schema shape used by the MCP tool declarations. */
export interface BridgeTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * The seven bridge tools. The server declares these to the MCP host and
 * forwards calls verbatim (method = tool name) to the browser bridge.
 */
export const BRIDGE_TOOLS: BridgeTool[] = [
  {
    name: "get_document",
    description:
      "Read the current builder document: an outline of every element (id: type), the active theme tokens, and the builder type (page/email/form). Call this before editing.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "list_element_types",
    description:
      "List the element types available in the active builder, with their prop contracts and usage hints. Use these exact types/props in set_page and apply_plan.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "set_page",
    description:
      "Replace the whole page from element-HTML dialect: tags are registered element types, attributes are props (kebab-case), and an optional leading <theme primary=... bg=... heading-font=... gradient-hero=... radius=\"sharp|soft|rounded|pill\" /> tag restyles the theme. Best tool for building a page from scratch. Returns the new outline.",
    inputSchema: {
      type: "object",
      properties: {
        dialect: {
          type: "string",
          description: "Element-HTML dialect markup (optionally starting with a <theme .../> tag).",
        },
      },
      required: ["dialect"],
    },
  },
  {
    name: "apply_plan",
    description:
      "Apply a batch of editor command steps as one undo step. Use element ids from get_document. \"$K\" (e.g. \"$0\") anywhere in args resolves to the id created by step K. Lenient: invalid steps are skipped, the rest apply.",
    inputSchema: {
      type: "object",
      properties: {
        steps: {
          type: "array",
          description: "Command steps, e.g. {command:'insertNode', args:[parentId, {type:'text', props:{...}}]}.",
          items: {
            type: "object",
            properties: {
              command: { type: "string", description: "Registered command name." },
              args: { type: "array", description: "Positional arguments." },
            },
            required: ["command", "args"],
          },
        },
      },
      required: ["steps"],
    },
  },
  {
    name: "set_theme",
    description:
      "Merge partial theme tokens into the current theme (colors, fonts, radii, gradients...). Only pass the tokens you want to change.",
    inputSchema: {
      type: "object",
      properties: {
        tokens: { type: "object", description: "Partial ThemeTokens object to merge." },
      },
      required: ["tokens"],
    },
  },
  {
    name: "export",
    description: "Compile the current document to its output format.",
    inputSchema: {
      type: "object",
      properties: {
        target: {
          type: "string",
          enum: ["html", "mjml", "form"],
          description: "html = standalone page, mjml = email HTML, form = field schema JSON.",
        },
      },
      required: ["target"],
    },
  },
  {
    name: "screenshot",
    description:
      "Compile the current document and screenshot it in the browser. Returns a PNG image — use it to check your work visually after editing.",
    inputSchema: {
      type: "object",
      properties: {
        width: { type: "number", description: "Viewport width in px (default 1024)." },
      },
      required: [],
    },
  },
];
