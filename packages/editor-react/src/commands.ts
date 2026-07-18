import {
  createElement,
  insertElement,
  updateProps,
  replaceProps,
  removeElement,
  moveElement,
  setResponsive,
  setElementState,
  findById,
  type Breakpoint,
  type Document,
  type ElementNode,
  type ElementState,
  type Registry,
} from "@neo-builder/core";

/** Working state a chain of commands mutates before it's committed. */
export interface CommandDraft {
  doc: Document;
  selectedId: string | null;
}

export interface CommandCtx {
  draft: CommandDraft;
  registry: Registry;
}

/** A command returns false to abort the whole chain. */
export type Command = (ctx: CommandCtx) => boolean;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CommandFactory = (...args: any[]) => Command;

/** A command's parameter, for introspection + AI planning. */
export interface CommandParam {
  name: string;
  hint: string;
  optional?: boolean;
}

/**
 * Metadata that makes a command introspectable — surfaced to the command
 * palette, to agents, and to the natural-language planner. This is what
 * separates the substrate from an opaque imperative API: commands describe
 * themselves.
 */
export interface CommandSpec {
  name: string;
  title: string;
  description: string;
  params: CommandParam[];
  category?: string;
}

/** One recorded, applied command — the unit of the event-sourced log. */
export interface CommandLogEntry {
  name: string;
  args: unknown[];
  at: number;
}

export const builtinCommandSpecs: Record<string, CommandSpec> = {
  select: {
    name: "select",
    title: "Select element",
    description: "Select an Element by id, or clear selection with null.",
    params: [{ name: "id", hint: "element id or null" }],
    category: "selection",
  },
  insert: {
    name: "insert",
    title: "Insert element",
    description: "Create and insert a new Element of a registered type into a parent.",
    params: [
      { name: "parentId", hint: "parent element id" },
      { name: "type", hint: "registered element type" },
      { name: "props", hint: "initial props object", optional: true },
      { name: "index", hint: "insertion index", optional: true },
    ],
    category: "structure",
  },
  insertNode: {
    name: "insertNode",
    title: "Insert node",
    description: "Insert an existing Element node into a parent.",
    params: [
      { name: "node", hint: "an ElementNode" },
      { name: "parentId", hint: "parent element id" },
      { name: "index", hint: "insertion index", optional: true },
    ],
    category: "structure",
  },
  update: {
    name: "update",
    title: "Update props",
    description: "Merge props into an Element (keeps its id).",
    params: [
      { name: "id", hint: "element id" },
      { name: "props", hint: "props to merge" },
    ],
    category: "edit",
  },
  replace: {
    name: "replace",
    title: "Replace props",
    description: "Replace an Element's props wholesale (used by regeneration).",
    params: [
      { name: "id", hint: "element id" },
      { name: "props", hint: "new props" },
    ],
    category: "edit",
  },
  responsive: {
    name: "responsive",
    title: "Set responsive override",
    description: "Set per-breakpoint prop overrides.",
    params: [
      { name: "id", hint: "element id" },
      { name: "breakpoint", hint: "base | sm | md | lg" },
      { name: "props", hint: "props for that breakpoint" },
    ],
    category: "edit",
  },
  setState: {
    name: "setState",
    title: "Set interactive-state style",
    description: "Set raw CSS for an Element's hover/focus/active state.",
    params: [
      { name: "id", hint: "element id" },
      { name: "state", hint: "hover | focus | active" },
      { name: "style", hint: "CSS-in-JS object" },
    ],
    category: "style",
  },
  move: {
    name: "move",
    title: "Move element",
    description: "Move an Element to a new parent at an index.",
    params: [
      { name: "id", hint: "element id" },
      { name: "parentId", hint: "new parent id" },
      { name: "index", hint: "position" },
    ],
    category: "structure",
  },
  remove: {
    name: "remove",
    title: "Remove element",
    description: "Remove an Element and its subtree.",
    params: [{ name: "id", hint: "element id" }],
    category: "structure",
  },
};

/**
 * The chainable command API, modelled on TipTap. Every command returns the
 * chain so calls compose; `run()` applies them as a single transaction (one
 * undo step). Custom commands appear here too via the index signature.
 */
export interface EditorChain {
  select(id: string | null): EditorChain;
  insert(parentId: string, type: string, props?: Record<string, unknown>, index?: number): EditorChain;
  insertNode(node: ElementNode, parentId: string, index?: number): EditorChain;
  update(id: string, props: Record<string, unknown>): EditorChain;
  replace(id: string, props: Record<string, unknown>): EditorChain;
  responsive(id: string, breakpoint: Breakpoint, props: Record<string, unknown>): EditorChain;
  setState(id: string, state: ElementState, style: Record<string, unknown>): EditorChain;
  move(id: string, parentId: string, index: number): EditorChain;
  remove(id: string): EditorChain;
  /** Apply the queued commands. Returns false (and applies nothing) if any aborted. */
  run(): boolean;
  /** Custom commands (registered via `store.registerCommand`) are accessed here. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cmd(name: string, ...args: any[]): EditorChain;
}

const exists = (d: CommandDraft, id: string) => !!findById(d.doc, id);

/** Built-in commands. Extensions add more via `store.registerCommand`. */
export const builtinCommands: Record<string, CommandFactory> = {
  select: (id: string | null) => (ctx) => {
    ctx.draft.selectedId = id;
    return true;
  },
  insert:
    (parentId: string, type: string, props: Record<string, unknown> = {}, index?: number) =>
    (ctx) => {
      if (!exists(ctx.draft, parentId) || !ctx.registry.has(type)) return false;
      const node = createElement(ctx.registry, type, props);
      ctx.draft.doc = insertElement(ctx.draft.doc, parentId, node, index);
      ctx.draft.selectedId = node.id;
      return true;
    },
  insertNode:
    (node: ElementNode, parentId: string, index?: number) =>
    (ctx) => {
      if (!exists(ctx.draft, parentId)) return false;
      ctx.draft.doc = insertElement(ctx.draft.doc, parentId, node, index);
      return true;
    },
  update:
    (id: string, props: Record<string, unknown>) =>
    (ctx) => {
      if (!exists(ctx.draft, id)) return false;
      ctx.draft.doc = updateProps(ctx.draft.doc, id, props);
      return true;
    },
  replace:
    (id: string, props: Record<string, unknown>) =>
    (ctx) => {
      if (!exists(ctx.draft, id)) return false;
      ctx.draft.doc = replaceProps(ctx.draft.doc, id, props);
      return true;
    },
  responsive:
    (id: string, breakpoint: Breakpoint, props: Record<string, unknown>) =>
    (ctx) => {
      if (!exists(ctx.draft, id)) return false;
      ctx.draft.doc = setResponsive(ctx.draft.doc, id, breakpoint, props);
      return true;
    },
  setState:
    (id: string, state: ElementState, style: Record<string, unknown>) =>
    (ctx) => {
      if (!exists(ctx.draft, id)) return false;
      ctx.draft.doc = setElementState(ctx.draft.doc, id, state, style);
      return true;
    },
  move:
    (id: string, parentId: string, index: number) =>
    (ctx) => {
      if (!exists(ctx.draft, id) || !exists(ctx.draft, parentId)) return false;
      ctx.draft.doc = moveElement(ctx.draft.doc, id, parentId, index);
      return true;
    },
  remove:
    (id: string) =>
    (ctx) => {
      if (!exists(ctx.draft, id)) return false;
      ctx.draft.doc = removeElement(ctx.draft.doc, id);
      if (ctx.draft.selectedId === id) ctx.draft.selectedId = null;
      return true;
    },
};
