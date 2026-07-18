/**
 * Model-agnostic Provider for in-app AI (BYO-key). Powers generate/rewrite
 * buttons in the Editor. Distinct from the MCP Server, which lets external
 * agents drive the builder (see CONTEXT.md).
 */
/** An image attached to a request (e.g. a canvas screenshot for critique). */
export interface ImageInput {
  /** Base64 data, no data-URI prefix. */
  data: string;
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
}

export interface GenerateRequest {
  prompt: string;
  system?: string;
  maxTokens?: number;
  temperature?: number;
  /** Images sent alongside the prompt (vision). Providers without vision ignore them. */
  images?: ImageInput[];
}

/** A live event while the model works — for showing thinking/search/writing. */
export type ActivityEvent =
  | { type: "status"; message: string }
  | { type: "search"; query: string }
  | { type: "tool"; name: string }
  | { type: "text"; delta: string };

export type OnActivity = (event: ActivityEvent) => void;

export interface Provider {
  readonly name: string;
  generate(req: GenerateRequest): Promise<string>;
  /** Optional streaming variant that reports activity and returns the full text. */
  generateStream?(req: GenerateRequest, onActivity: OnActivity): Promise<string>;
}
