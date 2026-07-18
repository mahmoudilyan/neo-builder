import {
  type Breakpoint,
  type Document,
  type ElementNode,
  type Registry,
  type ThemeLike,
  createElement,
  createId,
  insertElement,
  updateProps,
  replaceProps,
  removeElement,
  moveElement,
  setResponsive,
  findById,
  walk,
} from "@neo-builder/core";
import type {
  EditorEventType,
  EditorEventHandler,
  EditorEvents,
} from "./events.js";
import { BUILDER_TYPES, type BuilderType, type BuilderTypeMeta } from "./builderType.js";
import type { CapabilityProfile, Target } from "@neo-builder/core";
import {
  builtinCommands,
  builtinCommandSpecs,
  type CommandFactory,
  type CommandDraft,
  type CommandSpec,
  type CommandLogEntry,
  type EditorChain,
} from "./commands.js";
import { buildNodeContext } from "./grab.js";

export interface EditorState {
  doc: Document;
  selectedId: string | null;
  hoveredId: string | null;
  breakpoint: Breakpoint;
  preview: boolean;
  canUndo: boolean;
  canRedo: boolean;
  builderType: BuilderType;
}

/** Max snapshots kept for undo. */
const HISTORY_LIMIT = 100;

/** A history snapshot covers both the Document and the active Theme. */
interface HistoryEntry {
  doc: Document;
  theme: ThemeLike;
}

export interface EditorStoreOptions {
  registry: Registry;
  doc: Document;
  theme: ThemeLike;
  /** Which medium this editor builds for. Default: "page". */
  builderType?: BuilderType;
}

/**
 * The headless editor state container. Two subscription surfaces:
 *  - `subscribe` / `getState`: drive React via useSyncExternalStore.
 *  - `on` / `emit`: a typed event bus for side-effects (autosave, plugins, AI).
 *
 * Every mutation goes through a command method here, so the MCP Server, the UI,
 * and Routines all share one path. State is immutable; `Core` commands return
 * new Documents.
 */
export class EditorStore {
  readonly registry: Registry;
  private _theme: ThemeLike;
  private state: EditorState;
  private listeners = new Set<() => void>();
  private handlers = new Map<EditorEventType, Set<(p: unknown) => void>>();
  private cachedSnapshot: EditorState;
  private past: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];
  /** True when the previous mutation was a theme edit, for coalescing. */
  private lastWasTheme = false;
  private commandFactories = new Map<string, CommandFactory>(Object.entries(builtinCommands));
  private commandSpecs = new Map<string, CommandSpec>(Object.entries(builtinCommandSpecs));
  private log: CommandLogEntry[] = [];

  constructor(opts: EditorStoreOptions) {
    this.registry = opts.registry;
    this._theme = opts.theme;
    this.state = {
      doc: opts.doc,
      selectedId: null,
      hoveredId: null,
      breakpoint: "base",
      preview: false,
      canUndo: false,
      canRedo: false,
      builderType: opts.builderType ?? "page",
    };
    this.cachedSnapshot = this.state;
  }

  /** Active Builder Type metadata (target, Capability Profile, labels). */
  get builder(): BuilderTypeMeta {
    return BUILDER_TYPES[this.state.builderType];
  }
  get profile(): CapabilityProfile {
    return this.builder.profile;
  }
  get target(): Target {
    return this.builder.target;
  }
  setBuilderType(builderType: BuilderType) {
    this.commit({ builderType });
    this.emit("buildertype:change", { builderType });
  }

  // --- React store surface -------------------------------------------------
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getState = (): EditorState => this.cachedSnapshot;
  get theme(): ThemeLike {
    return this._theme;
  }

  private commit(next: Partial<EditorState>) {
    this.state = { ...this.state, ...next };
    this.cachedSnapshot = this.state;
    for (const fn of this.listeners) fn();
  }

  // --- Event bus -----------------------------------------------------------
  on<T extends EditorEventType>(type: T, handler: EditorEventHandler<T>): () => void {
    let set = this.handlers.get(type);
    if (!set) this.handlers.set(type, (set = new Set()));
    set.add(handler as (p: unknown) => void);
    return () => set!.delete(handler as (p: unknown) => void);
  }
  private emit<T extends EditorEventType>(type: T, payload: EditorEvents[T]) {
    this.handlers.get(type)?.forEach((h) => h(payload));
  }

  // --- Selection / view ----------------------------------------------------
  select(id: string | null) {
    this.commit({ selectedId: id });
    this.emit("selection:change", { id, node: id ? findById(this.state.doc, id) : undefined });
  }
  hover(id: string | null) {
    this.commit({ hoveredId: id });
  }
  setBreakpoint(breakpoint: Breakpoint) {
    this.commit({ breakpoint });
    this.emit("breakpoint:change", { breakpoint });
  }
  togglePreview(preview = !this.state.preview) {
    this.commit({ preview });
    this.emit("preview:toggle", { preview });
  }

  // --- History -------------------------------------------------------------
  /** Snapshot the current {doc, theme} onto the undo stack and clear redo. */
  private pushHistory() {
    this.past.push({ doc: this.state.doc, theme: this._theme });
    if (this.past.length > HISTORY_LIMIT) this.past.shift();
    this.future = [];
  }
  /** Restore a snapshot (doc + theme), keeping selection valid. */
  private restore(entry: HistoryEntry) {
    this._theme = entry.theme;
    const selectedId =
      this.state.selectedId && findById(entry.doc, this.state.selectedId) ? this.state.selectedId : null;
    this.commit({
      doc: entry.doc,
      selectedId,
      canUndo: this.past.length > 0,
      canRedo: this.future.length > 0,
    });
    this.emit("doc:change", { doc: entry.doc });
    this.emit("theme:change", { themeId: entry.theme.id });
  }
  undo() {
    const prev = this.past.pop();
    if (!prev) return;
    this.future.push({ doc: this.state.doc, theme: this._theme });
    this.lastWasTheme = false;
    this.restore(prev);
  }
  redo() {
    const next = this.future.pop();
    if (!next) return;
    this.past.push({ doc: this.state.doc, theme: this._theme });
    this.lastWasTheme = false;
    this.restore(next);
  }

  // --- Document mutations --------------------------------------------------
  private setDoc(doc: Document) {
    this.lastWasTheme = false;
    this.pushHistory();
    this.commit({ doc, canUndo: true, canRedo: false });
    this.emit("doc:change", { doc });
  }
  get(id: string): ElementNode | undefined {
    return findById(this.state.doc, id);
  }

  /** Replace the whole Document (e.g. AI page generation). Undoable. */
  setDocument(doc: Document) {
    this.setDoc(doc);
    this.select(null);
  }
  addElement(type: string, parentId: string, index?: number): ElementNode {
    const node = createElement(this.registry, type);
    this.setDoc(insertElement(this.state.doc, parentId, node, index));
    this.emit("element:add", { node, parentId });
    this.select(node.id);
    return node;
  }
  updateProps(id: string, props: Record<string, unknown>) {
    this.setDoc(updateProps(this.state.doc, id, props));
    this.emit("element:update", { id, props });
  }
  replaceProps(id: string, props: Record<string, unknown>) {
    this.setDoc(replaceProps(this.state.doc, id, props));
    this.emit("element:update", { id, props });
  }
  setResponsive(id: string, breakpoint: Breakpoint, props: Record<string, unknown>) {
    this.setDoc(setResponsive(this.state.doc, id, breakpoint, props));
    this.emit("element:update", { id, props });
  }
  move(id: string, toParentId: string, index: number) {
    this.setDoc(moveElement(this.state.doc, id, toParentId, index));
    this.emit("element:move", { id, toParentId, index });
  }
  remove(id: string) {
    this.setDoc(removeElement(this.state.doc, id));
    if (this.state.selectedId === id) this.select(null);
    this.emit("element:remove", { id });
  }

  /** Parent of an Element (undefined for root children’s parent lookup misses). */
  parentOf(id: string): ElementNode | undefined {
    const search = (n: ElementNode): ElementNode | undefined => {
      for (const c of n.children) {
        if (c.id === id) return n;
        const hit = search(c);
        if (hit) return hit;
      }
      return undefined;
    };
    return search(this.state.doc.root);
  }

  /** Deep-clone an Element (new ids throughout) and insert it right after the original. */
  duplicate(id: string): ElementNode | undefined {
    const node = findById(this.state.doc, id);
    const parent = this.parentOf(id);
    if (!node || !parent) return undefined;
    const clone = (n: ElementNode): ElementNode => ({
      ...n,
      id: createId(),
      props: { ...n.props },
      responsive: n.responsive ? JSON.parse(JSON.stringify(n.responsive)) : undefined,
      states: n.states ? JSON.parse(JSON.stringify(n.states)) : undefined,
      children: n.children.map(clone),
    });
    const copy = clone(node);
    const index = parent.children.findIndex((c) => c.id === id) + 1;
    this.setDoc(insertElement(this.state.doc, parent.id, copy, index));
    this.emit("element:add", { node: copy, parentId: parent.id });
    this.select(copy.id);
    return copy;
  }

  /** Set raw style overrides for an Element's interactive state. */
  setState(id: string, state: import("@neo-builder/core").ElementState, style: Record<string, unknown>) {
    this.chain().setState(id, state, style).run();
  }

  // --- Commands (AI-operable substrate) ------------------------------------
  /** Register a custom command (+ optional spec for introspection/AI). */
  registerCommand(name: string, factory: CommandFactory, spec?: Partial<CommandSpec>): this {
    this.commandFactories.set(name, factory);
    this.commandSpecs.set(name, {
      name,
      title: spec?.title ?? name,
      description: spec?.description ?? "",
      params: spec?.params ?? [],
      category: spec?.category ?? "custom",
    });
    return this;
  }
  /** All command specs — drives the command palette and the AI planner. */
  listCommands(): CommandSpec[] {
    return [...this.commandSpecs.values()];
  }
  /** The event-sourced command log (applied commands, in order). */
  getLog(): readonly CommandLogEntry[] {
    return this.log;
  }
  /**
   * Execute a plan `[{ command, args }]` (e.g. from the AI planner) as one
   * undo step. Unlike `chain()` (strict: any failure aborts all), plans run
   * leniently — invalid steps are skipped so one hallucinated id can't void
   * the whole edit. Steps may reference elements created earlier in the same
   * plan as "$K" (K = 0-based index of the creating step): the ref resolves
   * to that element's real id anywhere it appears in the args.
   */
  applyPlan(steps: { command: string; args: unknown[] }[]): { applied: number; skipped: number } {
    const draft: CommandDraft = { doc: this.state.doc, selectedId: this.state.selectedId };
    const createdByStep: string[] = [];
    const entries: CommandLogEntry[] = [];
    let skipped = 0;

    const resolveRefs = (value: unknown): unknown => {
      if (typeof value === "string") {
        const m = value.match(/^\$(\d+)$/);
        return m ? (createdByStep[Number(m[1])] || value) : value;
      }
      if (Array.isArray(value)) return value.map(resolveRefs);
      if (value && typeof value === "object")
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveRefs(v)]));
      return value;
    };

    for (const step of steps) {
      const factory = this.commandFactories.get(step.command);
      if (!factory) {
        skipped++;
        createdByStep.push("");
        continue;
      }
      const args = (step.args ?? []).map(resolveRefs);
      const idsBefore = new Set([...walk(draft.doc)].map((n) => n.id));
      const ok = factory(...args)({ draft, registry: this.registry });
      if (!ok) {
        skipped++;
        createdByStep.push("");
        continue;
      }
      const created = [...walk(draft.doc)].find((n) => !idsBefore.has(n.id));
      createdByStep.push(created?.id ?? "");
      entries.push({ name: step.command, args, at: Date.now() });
    }
    if (entries.length) this.applyTransaction(draft.doc, draft.selectedId, entries);
    return { applied: entries.length, skipped };
  }
  /** Start a chain. Commands compose; `.run()` commits them as one undo step. */
  chain(): EditorChain {
    return this.makeChain(false);
  }
  /** Dry-run a chain to test whether it would apply, without committing. */
  can(): EditorChain {
    return this.makeChain(true);
  }
  private makeChain(dry: boolean): EditorChain {
    interface QueueItem {
      name: string;
      args: unknown[];
      run: (d: CommandDraft, r: Registry) => boolean;
    }
    const queue: QueueItem[] = [];
    const store = this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enqueue = (name: string, args: any[]) => {
      const f = store.commandFactories.get(name);
      if (f) {
        const cmd = f(...args);
        queue.push({ name, args, run: (draft, registry) => cmd({ draft, registry }) });
      }
    };
    const proxy = new Proxy(
      {},
      {
        get(_t, prop: string) {
          if (prop === "run") return () => store.runChain(queue, dry);
          if (prop === "cmd") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (name: string, ...args: any[]) => {
              enqueue(name, args);
              return proxy;
            };
          }
          if (!store.commandFactories.has(prop)) return undefined;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (...args: any[]) => {
            enqueue(prop, args);
            return proxy;
          };
        },
      },
    ) as EditorChain;
    return proxy;
  }
  private runChain(
    queue: { name: string; args: unknown[]; run: (d: CommandDraft, r: Registry) => boolean }[],
    dry: boolean,
  ): boolean {
    const draft: CommandDraft = { doc: this.state.doc, selectedId: this.state.selectedId };
    for (const item of queue) if (!item.run(draft, this.registry)) return false;
    if (!dry) {
      const at = Date.now();
      const entries: CommandLogEntry[] = queue.map((q) => ({ name: q.name, args: q.args, at }));
      this.applyTransaction(draft.doc, draft.selectedId, entries);
    }
    return true;
  }
  /** Commit a finished draft as a single history step, recording the log. */
  private applyTransaction(doc: Document, selectedId: string | null, entries: CommandLogEntry[] = []) {
    this.lastWasTheme = false;
    this.pushHistory();
    this.commit({ doc, selectedId, canUndo: true, canRedo: false });
    if (entries.length) {
      this.log.push(...entries);
      this.emit("command:applied", { entries });
    }
    this.emit("doc:change", { doc });
    this.emit("selection:change", { id: selectedId, node: selectedId ? findById(doc, selectedId) : undefined });
  }

  // --- Agent grab layer ----------------------------------------------------
  /**
   * Ask the connected agent (AgentPanel, MCP client, …) to act on an Element.
   * Emits `agent:intent`; whoever runs the planner subscribes and executes.
   */
  askAgent(intent: string, id: string | null = this.state.selectedId) {
    this.emit("agent:intent", { id, intent });
  }
  /** Paste-ready context for one Element (react-grab-style, Document-native). */
  grabContext(id: string): string | null {
    return buildNodeContext({ doc: this.state.doc, registry: this.registry, id });
  }
  /** Grab + copy to clipboard + emit `grab:copy`. Returns the context. */
  async copyContext(id: string): Promise<string | null> {
    const context = this.grabContext(id);
    if (!context) return null;
    try {
      await navigator.clipboard.writeText(context);
    } catch {
      // Clipboard can be unavailable (permissions, non-secure context) —
      // the event still fires so UIs can offer a manual fallback.
    }
    this.emit("grab:copy", { id, context });
    return context;
  }

  // --- Theme ---------------------------------------------------------------
  setTheme(theme: ThemeLike) {
    // Coalesce runs of theme edits (e.g. a color-picker drag) into one undo step.
    if (!this.lastWasTheme) this.pushHistory();
    this.lastWasTheme = true;
    this._theme = theme;
    this.commit({ doc: { ...this.state.doc, themeId: theme.id }, canUndo: true, canRedo: false });
    this.emit("theme:change", { themeId: theme.id });
  }
}
