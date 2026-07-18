import type { Breakpoint, Document, ElementNode } from "@neo-builder/core";
import type { BuilderType } from "./builderType.js";
import type { CommandLogEntry } from "./commands.js";

/**
 * Builder + Element events. Subscribe via `store.on(type, handler)`.
 * Distinct from `store.subscribe` (React rendering): the event bus is for
 * side-effects — autosave, analytics, plugins, the AI loop.
 */
export interface EditorEvents {
  /** The Document changed (any mutation). */
  "doc:change": { doc: Document };
  /** Selection moved. `node` is undefined when cleared. */
  "selection:change": { id: string | null; node?: ElementNode };
  /** An Element was added. */
  "element:add": { node: ElementNode; parentId: string };
  /** An Element's props changed. */
  "element:update": { id: string; props: Record<string, unknown> };
  /** An Element was removed. */
  "element:remove": { id: string };
  /** An Element was moved to a new parent/index. */
  "element:move": { id: string; toParentId: string; index: number };
  /** The active editing breakpoint changed. */
  "breakpoint:change": { breakpoint: Breakpoint };
  /** The Theme changed (edited or swapped). */
  "theme:change": { themeId: string };
  /** Preview mode toggled (hides editing chrome). */
  "preview:toggle": { preview: boolean };
  /** The Builder Type (page/email/form) changed. */
  "buildertype:change": { builderType: BuilderType };
  /** One or more commands were applied (event-sourced log). */
  "command:applied": { entries: CommandLogEntry[] };
  /** The user asked an agent to act, anchored to an Element (null = whole doc). */
  "agent:intent": { id: string | null; intent: string };
  /** An Element's context was grabbed (copied) for an external agent. */
  "grab:copy": { id: string; context: string };
}

export type EditorEventType = keyof EditorEvents;
export type EditorEventHandler<T extends EditorEventType> = (
  payload: EditorEvents[T],
) => void;
