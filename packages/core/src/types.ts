/** Compilation targets. Each maps to a Compiler package. */
export type Target = "html" | "mjml" | "form";

/** Responsive breakpoints, mobile-first. `base` applies to all widths. */
export type Breakpoint = "base" | "sm" | "md" | "lg";

/** Interactive states an Element can be styled for. */
export type ElementState = "hover" | "focus" | "active";

/** A node in the Document Model. The atomic editable unit. */
export interface ElementNode {
  /** Persistent identifier. Survives regeneration (see ADR-0004). */
  id: string;
  /** Registered Element type, e.g. "section", "text", "button". */
  type: string;
  /** Element-specific properties (the `base` breakpoint). */
  props: Record<string, unknown>;
  /**
   * Per-breakpoint prop overrides, merged over `props` mobile-first when a
   * breakpoint is active. Omit for non-responsive Elements.
   */
  responsive?: Partial<Record<Breakpoint, Record<string, unknown>>>;
  /** Per-interactive-state raw style overrides (e.g. hover background). */
  states?: Partial<Record<ElementState, Record<string, unknown>>>;
  /** Child Elements. Leaf Elements have an empty array. */
  children: ElementNode[];
}

/** A complete document edited by any Builder Type. */
export interface Document {
  /** Bumped when the document-level shape changes; drives migrations. */
  schemaVersion: number;
  /** Id of the active Theme. */
  themeId: string;
  /** Root container; its children are Sections. */
  root: ElementNode;
}

/** Minimal Theme shape Core needs. Full token set lives in @neo-builder/theme. */
export interface ThemeLike {
  id: string;
  /** Opaque to Core; the concrete token shape lives in @neo-builder/theme. */
  tokens: object;
}

/** Context handed to an Element's render function by a Compiler. */
export interface RenderContext {
  target: Target;
  theme: ThemeLike;
  /** Render a node's children and concatenate the output. */
  renderChildren: (node: ElementNode) => string;
  /** Render a single node (dispatches back through the Compiler). */
  renderNode: (node: ElementNode) => string;
}

/** Renders one Element to a target's output string. */
export type RenderFn = (node: ElementNode, ctx: RenderContext) => string;

/** Agent-facing description; required on every Element Definition. */
export interface AiMeta {
  /** What the Element is and when to use it. */
  description: string;
  /** Per-prop guidance for agents. */
  props?: Record<string, string>;
  /** Optional usage hint / example. */
  usage?: string;
}

/** Declares an Element type's props and allowed structure. */
export interface ElementSchema {
  /** Prop name -> human/agent-readable type hint. */
  props: Record<string, string>;
  /** Allowed child Element types. Omit for leaf Elements. `"*"` allows any. */
  allowedChildren?: string[] | "*";
}

/** Whether `childType` may be placed inside an Element of `def`. */
export function accepts(def: ElementDefinition, childType: string): boolean {
  const allowed = def.schema.allowedChildren;
  if (allowed === undefined) return false; // leaf — accepts nothing
  if (allowed === "*") return true;
  return allowed.includes(childType);
}

/** Context passed to a Tool's `run`. */
export interface ToolContext {
  /** The current document, when a Tool needs to read it. */
  doc?: Document;
  [key: string]: unknown;
}

/** A callable capability an agent can invoke. "A Tool does." */
export interface ToolDefinition<I = Record<string, unknown>, O = unknown> {
  name: string;
  description: string;
  /** Param name -> hint, surfaced to agents (MCP) and the in-app AI. */
  inputSchema: Record<string, string>;
  run: (input: I, ctx: ToolContext) => Promise<O> | O;
}

/** Packaged know-how injected into agent context. "A Skill knows." */
export interface SkillDefinition {
  name: string;
  description: string;
  /** The guidance text injected into the model's context. */
  instructions: string;
}

/** The contract that registers an Element type (built-in or extension). */
export interface ElementDefinition {
  type: string;
  /** Human display name for palettes/inspector. Defaults to `type`. */
  label?: string;
  /** Icon shown in the palette: an emoji, a URL, or an inline SVG/data-URI. */
  icon?: string;
  /** Palette grouping, e.g. "Layout", "Content", "Media", "Interactive". */
  category?: string;
  /** Interactive states this Element can be styled for (hover/focus/active). */
  states?: ElementState[];
  /** Bumped when this Element's props change; drives per-Element migration. */
  version: number;
  schema: ElementSchema;
  aiMeta: AiMeta;
  /** Migrate an older serialized node's props to the current version. */
  migrate?: (oldProps: Record<string, unknown>, oldVersion: number) => Record<string, unknown>;
  /** Per-target render functions. A missing target means unsupported there. */
  render: Partial<Record<Target, RenderFn>>;
  /** Default props applied when an Element of this type is created. */
  defaults?: () => Record<string, unknown>;
}
