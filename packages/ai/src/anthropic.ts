import type { GenerateRequest, Provider } from "./provider.js";

export interface AnthropicProviderOptions {
  apiKey: string;
  /** Defaults to the latest Claude model. */
  model?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  /** Send the `temperature` param. Off by default — newer models reject it. */
  sendTemperature?: boolean;
  /** Enable Anthropic's native web search tool (grounds output in real facts). */
  webSearch?: boolean;
  /** Max web searches per request. Default 3. */
  maxWebSearches?: number;
}

/**
 * BYO-key Anthropic Provider over the Messages API. No SDK dependency — uses
 * fetch so it runs in Node and the browser.
 */
export class AnthropicProvider implements Provider {
  readonly name = "anthropic";
  private opts: Required<Omit<AnthropicProviderOptions, "fetchImpl">> & {
    fetchImpl: typeof fetch;
  };

  constructor(options: AnthropicProviderOptions) {
    this.opts = {
      apiKey: options.apiKey,
      model: options.model ?? "claude-opus-4-8",
      baseUrl: options.baseUrl ?? "https://api.anthropic.com",
      fetchImpl: options.fetchImpl ?? fetch,
      sendTemperature: options.sendTemperature ?? false,
      webSearch: options.webSearch ?? false,
      maxWebSearches: options.maxWebSearches ?? 3,
    };
  }

  async generate(req: GenerateRequest): Promise<string> {
    const res = await this.opts.fetchImpl(`${this.opts.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.opts.apiKey,
        "anthropic-version": "2023-06-01",
        // Allow direct calls from a browser (playground/local testing). The key
        // is then exposed client-side — only do this for local/dev, never ship a
        // real key to end users.
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(this.body(req, false)),
    });
    if (!res.ok) {
      throw new Error(`Anthropic request failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
    return data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
  }

  private body(req: GenerateRequest, stream: boolean) {
    return {
      model: this.opts.model,
      max_tokens: req.maxTokens ?? 1024,
      stream,
      // `temperature` is omitted: newer models reject it.
      ...(req.temperature !== undefined && this.opts.sendTemperature ? { temperature: req.temperature } : {}),
      ...(this.opts.webSearch
        ? { tools: [{ type: "web_search_20250305", name: "web_search", max_uses: this.opts.maxWebSearches }] }
        : {}),
      system: req.system,
      messages: [{ role: "user", content: this.userContent(req) }],
    };
  }

  /** Plain string prompt, or content blocks when images ride along (vision). */
  private userContent(req: GenerateRequest): unknown {
    if (!req.images?.length) return req.prompt;
    return [
      ...req.images.map((img) => ({
        type: "image",
        source: { type: "base64", media_type: img.mediaType, data: img.data },
      })),
      { type: "text", text: req.prompt },
    ];
  }

  /** Streaming variant: parses SSE, reports activity, returns the full text. */
  async generateStream(
    req: GenerateRequest,
    onActivity: (e: import("./provider.js").ActivityEvent) => void,
  ): Promise<string> {
    const res = await this.opts.fetchImpl(`${this.opts.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.opts.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(this.body(req, true)),
    });
    if (!res.ok || !res.body) {
      throw new Error(`Anthropic request failed: ${res.status} ${await res.text()}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    let toolJson = ""; // accumulates a tool block's input json
    let inSearch = false;

    const handle = (evt: { type?: string; content_block?: any; delta?: any }) => {
      if (evt.type === "content_block_start") {
        const b = evt.content_block;
        if (b?.type === "server_tool_use" && b?.name === "web_search") {
          inSearch = true;
          toolJson = "";
          onActivity({ type: "status", message: "Searching the web…" });
        } else if (b?.type === "web_search_tool_result") {
          onActivity({ type: "status", message: "Reading results…" });
        } else if (b?.type === "thinking") {
          onActivity({ type: "status", message: "Thinking…" });
        } else if (b?.type === "text") {
          onActivity({ type: "status", message: "Writing…" });
        }
      } else if (evt.type === "content_block_delta") {
        const d = evt.delta;
        if (d?.type === "text_delta" && d.text) {
          text += d.text;
          onActivity({ type: "text", delta: d.text });
        } else if (d?.type === "input_json_delta" && inSearch) {
          toolJson += d.partial_json ?? "";
        }
      } else if (evt.type === "content_block_stop" && inSearch) {
        inSearch = false;
        try {
          const q = JSON.parse(toolJson || "{}").query;
          if (q) onActivity({ type: "search", query: String(q) });
        } catch {
          /* partial; ignore */
        }
      }
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const m = line.match(/^data:\s*(.*)$/);
        if (!m || m[1] === "[DONE]") continue;
        try {
          handle(JSON.parse(m[1]!));
        } catch {
          /* keepalive/non-json */
        }
      }
    }
    return text;
  }
}
