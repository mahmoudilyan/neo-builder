import { useEffect, useMemo, useRef, useState } from "react";
import { findById, walk } from "@neo-builder/core";
import { useEditor, useEditorState } from "@neo-builder/editor-react";
import {
  AnthropicProvider,
  generateConcepts,
  generatePageHtml,
  planCommands,
  buildElementHints,
  critiquePage,
  noSlopSkill,
  createWebSearchTool,
  type Provider,
  type ActivityEvent,
} from "@neo-builder/ai";
import { compileHtml } from "@neo-builder/compiler-html";
import { applyConcept, RECIPE_CATALOG, MOOD_CATALOG, type Concept } from "@neo-builder/recipes";
import { mockConceptsProvider, mockPlannerProvider, makeMockCriticProvider, mockHtmlProvider } from "./mockAi.js";
import { captureHtml } from "./snapshot.js";
import { Badge, Button, Field, IconButton, Input, Label, Switch, Textarea } from "@marmoui/ui";
import { GearSix, MagnifyingGlass, PaperPlaneRight, Sparkle, Stop, Trash } from "@phosphor-icons/react";

const ENV_KEY = ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_ANTHROPIC_API_KEY) ?? "";

const SUGGESTIONS = [
  {
    icon: "✦",
    title: "SaaS landing page",
    text: "Design a landing page for an AI analytics tool called Lumen: bold hero with a gradient background, one sharp stat, three concrete feature cards, and a single strong CTA",
    mode: "generate" as const,
  },
  {
    icon: "▤",
    title: "Pricing section",
    text: "Add a pricing section with three tiers side by side — Starter ($0), Pro ($29/mo, the highlighted one on a surface background), Enterprise (custom). Each tier: name as h3, price as big primary text, two benefit lines in muted text, and a CTA button (solid for Pro, outline for the others)",
    mode: "edit" as const,
  },
  {
    icon: "❝",
    title: "Social proof",
    text: "Add a testimonial band on a surface background: one strong customer quote as large centered text with tight max width, the customer's name and role below in muted text",
    mode: "edit" as const,
  },
  {
    icon: "◧",
    title: "Split hero",
    text: "Rebuild the first section as a 2:1 split hero on gradient:hero with minHeight 460 — headline at size 3xl and a lg CTA on the left, a 4xl primary-colored stat on the right",
    mode: "edit" as const,
  },
  {
    icon: "⌁",
    title: "Tighten copy",
    text: "Make the headline shorter and more direct, and cap paragraph widths so no line runs wall-to-wall",
    mode: "edit" as const,
  },
];

interface ToolCall {
  id: number;
  icon: string;
  name: string;
  detail?: string;
  status: "running" | "done";
}

interface ChatMsg {
  id: number;
  role: "user" | "assistant";
  text: string;
  /** Element this message targets (grab-style anchored edit), e.g. "button#b2". */
  target?: string;
  toolCalls: ToolCall[];
  concepts?: Concept[];
  conceptsUsed?: boolean;
  streaming?: boolean;
  error?: boolean;
  chars?: number;
}

let nextId = 1;

function isGenerate(text: string, empty: boolean): boolean {
  if (empty) return true;
  return /\b(design|generate|create|build|make)\b.*\b(page|landing|email|form|screen|site|hero|from scratch)\b/i.test(text);
}

/**
 * The in-app AI agent: a full chat surface over the Concept generator and the
 * command planner. Streams activity as tool-call cards, renders Concepts as
 * pickable cards, and falls back to mock providers with no API key.
 */
export function AgentPanel() {
  const builder = useEditor();
  const { doc, builderType } = useEditorState();
  const [key, setKey] = useState(ENV_KEY);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [webSearch, setWebSearch] = useState(true);
  const [freeform, setFreeform] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const runSeq = useRef(0); // bumped to soft-cancel an in-flight run
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const live = key.trim().length > 0;

  // Auto-scroll on new content.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  function patchLast(fn: (m: ChatMsg) => ChatMsg) {
    setMessages((prev) => {
      if (prev.length === 0 || prev[prev.length - 1].role !== "assistant") return prev;
      return [...prev.slice(0, -1), fn(prev[prev.length - 1])];
    });
  }

  function onActivity(seq: number) {
    return (e: ActivityEvent) => {
      if (seq !== runSeq.current) return; // stale run
      patchLast((m) => {
        const calls = [...m.toolCalls];
        const finishRunning = () => {
          for (const c of calls) if (c.status === "running") c.status = "done";
        };
        if (e.type === "search") {
          finishRunning();
          calls.push({ id: nextId++, icon: "🔎", name: "web_search", detail: e.query, status: "running" });
          return { ...m, toolCalls: calls };
        }
        if (e.type === "tool") {
          finishRunning();
          calls.push({ id: nextId++, icon: "🛠", name: e.name, status: "running" });
          return { ...m, toolCalls: calls };
        }
        if (e.type === "status") {
          finishRunning();
          const last = calls[calls.length - 1];
          if (last?.name === "thinking") last.detail = e.message;
          else calls.push({ id: nextId++, icon: "◈", name: "thinking", detail: e.message, status: "running" });
          return { ...m, toolCalls: calls };
        }
        // text delta — count streamed characters
        return { ...m, chars: (m.chars ?? 0) + e.delta.length };
      });
    };
  }

  function liveProvider(): Provider | null {
    return live ? new AnthropicProvider({ apiKey: key.trim(), webSearch }) : null;
  }

  // A search-backed provider whose key is always current (read via ref).
  const keyRef = useRef(key);
  keyRef.current = key;
  const searchProvider = useMemo<Provider>(
    () => ({
      name: "live-search",
      generate: (req) => new AnthropicProvider({ apiKey: keyRef.current.trim(), webSearch: true }).generate(req),
    }),
    [],
  );

  // Register the no-slop Skill + web_search Tool once per builder/registry.
  useEffect(() => {
    if (!builder.registry.getSkill("no-slop")) builder.registry.registerSkill(noSlopSkill);
    if (!builder.registry.getTool("web_search")) builder.registry.registerTool(createWebSearchTool(searchProvider));
  }, [builder, searchProvider]);

  async function run(intent: string, forceMode?: "generate" | "edit", focusId?: string) {
    const prompt = intent.trim();
    if (!prompt || busy) return;
    const seq = ++runSeq.current;
    setText("");
    setBusy(true);
    const focusNode = focusId ? findById(builder.getState().doc, focusId) : undefined;
    const target = focusNode ? `${focusNode.type}#${focusNode.id}` : undefined;
    setMessages((prev) => [
      ...prev,
      { id: nextId++, role: "user", text: prompt, target, toolCalls: [] },
      { id: nextId++, role: "assistant", text: "", toolCalls: [], streaming: true },
    ]);

    const empty = doc.root.children.length === 0;
    // An element-anchored ask is always an edit of that element.
    const generate = focusNode ? false : forceMode ? forceMode === "generate" : isGenerate(prompt, empty);
    try {
      if (generate && freeform) {
        // Freeform: the model designs directly in the Element HTML dialect —
        // its native syntax — parsed deterministically into the Document.
        const provider = liveProvider() ?? mockHtmlProvider;
        const generated = await generatePageHtml(
          provider,
          { registry: builder.registry, theme: builder.theme, prompt, skills: [noSlopSkill.instructions] },
          onActivity(seq),
        );
        if (seq !== runSeq.current) return;
        // Theme first: the model art-directed its own palette/fonts/gradients.
        builder.setTheme(generated.theme);
        builder.setDocument(generated.doc);
        patchLast((m) => ({
          ...m,
          streaming: false,
          toolCalls: m.toolCalls.map((c) => ({ ...c, status: "done" as const })),
          text:
            generated.doc.root.children.length === 0
              ? "The model's markup didn't survive validation — try rephrasing."
              : `Designed the page directly in Element HTML — ${generated.doc.root.children.length} sections, own palette + type (theme "${generated.theme.id}"). Run ✨ Polish to let me critique my own render.`,
        }));
      } else if (generate) {
        // Concept generation: AI authors briefs; the system art-directs.
        const provider = liveProvider() ?? mockConceptsProvider;
        const briefs = await generateConcepts(
          provider,
          { recipes: RECIPE_CATALOG, moods: MOOD_CATALOG, prompt, skills: [noSlopSkill.instructions] },
          onActivity(seq),
        );
        if (seq !== runSeq.current) return;
        const realized = briefs.map((b) => applyConcept(b, builder.registry, builder.theme));
        patchLast((m) => ({
          ...m,
          streaming: false,
          toolCalls: m.toolCalls.map((c) => ({ ...c, status: "done" as const })),
          text: `I explored ${realized.length} divergent directions${live && webSearch ? ", grounded in live web research" : ""}. Pick the one that fits — I'll apply its layout, copy and theme.`,
          concepts: realized,
        }));
      } else {
        const provider = liveProvider() ?? mockPlannerProvider;
        const liveDoc = builder.getState().doc;
        const outline = [...walk(liveDoc)].map((n) => `${n.id}: ${n.type}`).join("\n");
        const focus = focusNode ? builder.grabContext(focusNode.id) ?? undefined : undefined;
        const plan = await planCommands(
          provider,
          {
            commands: builder.listCommands(),
            docOutline: outline,
            intent: prompt,
            focus,
            elements: buildElementHints(builder.registry.list()),
          },
          onActivity(seq),
        );
        if (seq !== runSeq.current) return;
        const { applied, skipped } = builder.applyPlan(plan);
        patchLast((m) => ({
          ...m,
          streaming: false,
          toolCalls: m.toolCalls.map((c) => ({ ...c, status: "done" as const })),
          text:
            plan.length === 0
              ? "I couldn't map that to any editor commands — try rephrasing."
              : `Done — applied ${applied} command${applied === 1 ? "" : "s"}` +
                (skipped > 0 ? ` (${skipped} invalid step${skipped === 1 ? "" : "s"} skipped)` : "") +
                `:\n` +
                plan.map((s) => `• ${s.command}`).join("\n"),
        }));
      }
    } catch (e) {
      if (seq !== runSeq.current) return;
      patchLast((m) => ({
        ...m,
        streaming: false,
        error: true,
        toolCalls: m.toolCalls.map((c) => ({ ...c, status: "done" as const })),
        text: e instanceof Error ? e.message : String(e),
      }));
    }
    if (seq === runSeq.current) setBusy(false);
  }

  /**
   * The "eyes" loop: compile → screenshot → vision critique → command fixes,
   * up to 3 rounds. Each round's fixes land as one undoable, logged step.
   */
  async function polish() {
    if (busy) return;
    const seq = ++runSeq.current;
    setBusy(true);
    setMessages((prev) => [
      ...prev,
      { id: nextId++, role: "user", text: "Polish this page (render → critique → fix)", toolCalls: [] },
      { id: nextId++, role: "assistant", text: "", toolCalls: [], streaming: true },
    ]);
    const critic: Provider = live
      ? new AnthropicProvider({ apiKey: key.trim() })
      : makeMockCriticProvider();
    const activity = onActivity(seq);
    const fixed: string[] = [];
    try {
      for (let round = 1; round <= 3; round++) {
        const st = builder.getState();
        activity({ type: "tool", name: `screenshot · round ${round}` });
        const html = compileHtml(st.doc, {
          registry: builder.registry,
          theme: builder.theme,
          profile: builder.profile,
          title: "Preview",
        });
        const image = await captureHtml(html);
        if (seq !== runSeq.current) return;
        activity({ type: "status", message: "Critiquing the render…" });
        const outline = [...walk(st.doc)].map((n) => `${n.id}: ${n.type}`).join("\n");
        const result = await critiquePage(
          critic,
          {
            image,
            commands: builder.listCommands(),
            docOutline: outline,
            elements: buildElementHints(builder.registry.list()),
          },
          activity,
        );
        if (seq !== runSeq.current) return;
        for (const i of result.issues) activity({ type: "tool", name: `${i.area}: ${i.note}` });
        if (result.verdict === "ship" || result.steps.length === 0) break;
        builder.applyPlan(result.steps);
        fixed.push(...result.steps.map((s) => s.command));
      }
      patchLast((m) => ({
        ...m,
        streaming: false,
        toolCalls: m.toolCalls.map((c) => ({ ...c, status: "done" as const })),
        text:
          fixed.length === 0
            ? "Looked at the render — nothing worth fixing. Ship it."
            : `Polished: applied ${fixed.length} fix${fixed.length === 1 ? "" : "es"} across the critique rounds (each round is one undo step).`,
      }));
    } catch (e) {
      if (seq !== runSeq.current) return;
      patchLast((m) => ({
        ...m,
        streaming: false,
        error: true,
        toolCalls: m.toolCalls.map((c) => ({ ...c, status: "done" as const })),
        text: e instanceof Error ? e.message : String(e),
      }));
    }
    if (seq === runSeq.current) setBusy(false);
  }

  // Grab layer: canvas-anchored asks (⌘K bubble) land here as edits targeting
  // the grabbed element; ⌘C copies get a confirmation in the chat.
  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => {
    const offIntent = builder.on("agent:intent", ({ id, intent }) => {
      runRef.current(intent, "edit", id ?? undefined);
    });
    const offCopy = builder.on("grab:copy", ({ id }) => {
      const node = findById(builder.getState().doc, id);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId++,
          role: "assistant",
          text: `📋 Copied context for ${node ? `${node.type}#${node.id}` : id} — paste it into Claude Code, Cursor, or any agent.`,
          toolCalls: [],
        },
      ]);
    });
    return () => {
      offIntent();
      offCopy();
    };
  }, [builder]);

  function stop() {
    runSeq.current++;
    setBusy(false);
    patchLast((m) => ({
      ...m,
      streaming: false,
      toolCalls: m.toolCalls.map((c) => ({ ...c, status: "done" as const })),
      text: m.text || "Stopped.",
    }));
  }

  function pickConcept(msgId: number, c: Concept) {
    builder.setTheme(c.theme);
    builder.setDocument(c.doc);
    setMessages((prev) =>
      prev
        .map((m) => (m.id === msgId ? { ...m, conceptsUsed: true } : m))
        .concat({
          id: nextId++,
          role: "assistant",
          text: `Applied “${c.brief.headline}” (${c.brief.mood} · ${c.brief.recipe}). Keep chatting to refine it.`,
          toolCalls: [],
        }),
    );
  }

  function onComposerKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      run(text);
    }
  }

  return (
    <div className="chat">
      <header className="chat-head">
        <div className="chat-avatar" aria-hidden="true">
          ◇
        </div>
        <div className="chat-id">
          <div className="chat-name">Builder Agent</div>
          <div className="chat-status">
            <span className={"chat-dot" + (busy ? " busy" : "")} />
            {busy ? "Working…" : live ? "Claude · connected" : "Mock mode"}
          </div>
        </div>
        <IconButton
          variant="ghost"
          size="sm"
          icon={<Sparkle />}
          aria-label="Polish: render, critique, fix (up to 3 rounds)"
          disabled={busy || doc.root.children.length === 0}
          onClick={() => void polish()}
        />
        <IconButton
          variant="ghost"
          size="sm"
          icon={<Trash />}
          aria-label="Clear conversation"
          onClick={() => {
            runSeq.current++;
            setBusy(false);
            setMessages([]);
          }}
        />
        <IconButton
          variant="ghost"
          size="sm"
          icon={<GearSix />}
          aria-label="Settings"
          onClick={() => setShowSettings((s) => !s)}
        />
      </header>

      {showSettings && (
        <div className="chat-settings">
          <Field label="Anthropic API key">
            <Input
              type="password"
              placeholder="empty = mock providers"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </Field>
          <div className="chat-check">
            <Switch id="web-search" checked={webSearch} onCheckedChange={(v: boolean) => setWebSearch(v)} />
            <Label htmlFor="web-search" className="font-normal">
              Ground answers with web search
            </Label>
          </div>
          <div className="chat-check">
            <Switch id="freeform" checked={freeform} onCheckedChange={(v: boolean) => setFreeform(v)} />
            <Label htmlFor="freeform" className="font-normal">
              Freeform generation (model designs in Element HTML; off = curated Concepts)
            </Label>
          </div>
        </div>
      )}

      <div className="chat-scroll" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="chat-hero">
            <div className="chat-hero-orb">◇</div>
            <div className="chat-hero-title">What are we building?</div>
            <div className="chat-hero-sub">
              I design, edit and rewrite this {builderType} — describe it, I'll do the rest.
            </div>
            <div className="chat-suggests">
              {SUGGESTIONS.map((s) => (
                <button key={s.text} className="chat-suggest" onClick={() => run(s.text, s.mode)}>
                  <span className="chat-suggest-ic">{s.icon}</span>
                  <span>
                    <span className="chat-suggest-title">{s.title}</span>
                    <span className="chat-suggest-text">{s.text}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="msg user">
              <div className="msg-bubble">
                {m.target && <span className="msg-target">✦ {m.target}</span>}
                {m.text}
              </div>
            </div>
          ) : (
            <div key={m.id} className="msg assistant">
              <div className="msg-avatar">◇</div>
              <div className="msg-body">
                {m.toolCalls.length > 0 && (
                  <div className="msg-tools">
                    {m.toolCalls.map((c) => (
                      <ToolCallCard key={c.id} call={c} />
                    ))}
                  </div>
                )}
                {m.streaming && !m.text ? (
                  <div className="msg-thinking">
                    {typeof m.chars === "number" && m.chars > 0 ? (
                      <span className="msg-writing">✍ drafting… {m.chars} chars</span>
                    ) : (
                      <span className="msg-dots">
                        <i />
                        <i />
                        <i />
                      </span>
                    )}
                  </div>
                ) : (
                  m.text && <div className={"msg-bubble" + (m.error ? " error" : "")}>{m.text}</div>
                )}
                {m.concepts && (
                  <div className="msg-concepts">
                    {m.concepts.map((c, i) => (
                      <div key={i} className="concept-card">
                        <div className="concept-meta">
                          {c.brief.mood} · {c.brief.recipe}
                        </div>
                        <div className="concept-headline">{c.brief.headline}</div>
                        {c.brief.subhead && <div className="concept-sub">{c.brief.subhead}</div>}
                        <Button
                          variant="secondary"
                          size="sm"
                          className="concept-apply"
                          disabled={m.conceptsUsed}
                          onClick={() => pickConcept(m.id, c)}
                        >
                          {m.conceptsUsed ? "Applied" : "Use this concept"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ),
        )}
      </div>

      <div className="chat-composer">
        <div className="chat-chips">
          <Badge size="sm" variant="normal">
            {builderType}
          </Badge>
          <Badge size="sm" variant={live ? "success" : "warning"}>
            {live ? "live" : "mock"}
          </Badge>
          {webSearch && live && (
            <Badge size="sm" variant="info" leftIcon={<MagnifyingGlass className="h-3 w-3" />}>
              web
            </Badge>
          )}
        </div>
        <div className="chat-inputrow">
          <Textarea
            ref={inputRef}
            rows={1}
            placeholder={`Message Builder Agent about this ${builderType}…`}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              const el = e.target;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }}
            onKeyDown={onComposerKey}
          />
          {busy ? (
            <IconButton
              variant="destructive"
              size="sm"
              icon={<Stop weight="fill" />}
              aria-label="Stop"
              onClick={stop}
            />
          ) : (
            <IconButton
              variant="primary"
              size="sm"
              icon={<PaperPlaneRight />}
              aria-label="Send message"
              disabled={!text.trim()}
              onClick={() => run(text)}
            />
          )}
        </div>
        <div className="chat-hint">Enter to send · Shift+Enter for a new line · “/” inserts on canvas</div>
      </div>
    </div>
  );
}

function ToolCallCard({ call }: { call: ToolCall }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      className={"toolcall" + (call.status === "running" ? " running" : "")}
      onClick={() => setOpen((o) => !o)}
      title={call.detail}
    >
      <span className="toolcall-ic">{call.icon}</span>
      <span className="toolcall-name">{call.name}</span>
      {call.detail && <span className={"toolcall-detail" + (open ? " open" : "")}>{call.detail}</span>}
      <span className={"toolcall-state" + (call.status === "running" ? " spin" : "")}>
        {call.status === "running" ? "◌" : "✓"}
      </span>
    </button>
  );
}
