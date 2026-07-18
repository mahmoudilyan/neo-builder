import type { OnActivity, Provider } from "./provider.js";
import { extractJson } from "./generate.js";

/** Structural description of a command the planner may use. */
export interface PlannerCommand {
  name: string;
  description: string;
  params: { name: string; hint: string; optional?: boolean }[];
}

/** A planned command invocation: a command name + positional args. */
export interface CommandStep {
  command: string;
  args: unknown[];
}

export interface PlanCommandsInput {
  /** The described commands the model may use (e.g. store.listCommands()). */
  commands: PlannerCommand[];
  /** A short outline of the current document (ids + types) to target edits. */
  docOutline: string;
  /** The user's natural-language intent. */
  intent: string;
  /**
   * Element prop contracts (type → prop hints), e.g. from buildElementHints().
   * Without this, models invent raw CSS values for token/scale props.
   */
  elements?: string;
  /**
   * Context for the Element the user is pointing at (grab-style anchored
   * edits): the node, its props, its registry contract. When present, the
   * plan should target this Element unless the intent clearly says otherwise.
   */
  focus?: string;
}

/**
 * The unique layer over the command substrate: turn natural language into a
 * plan of described commands. Unlike an opaque imperative editor API, every
 * command is self-describing, so an LLM can compose them — the same commands a
 * human or `store.chain()` uses.
 */
/** Compact per-type prop contracts for the planner prompt. */
export function buildElementHints(
  defs: { type: string; schema: { props: Record<string, string> } }[],
): string {
  return defs
    .map((d) => `- ${d.type}: ${Object.entries(d.schema.props).map(([k, v]) => `${k} (${v})`).join(", ")}`)
    .join("\n");
}

export function buildPlannerSystemPrompt(
  commands: PlannerCommand[],
  docOutline: string,
  focus?: string,
  elements?: string,
): string {
  const list = commands
    .map((c) => {
      const params = c.params.map((p) => `${p.name}${p.optional ? "?" : ""}: ${p.hint}`).join(", ");
      return `- ${c.name}(${params}) — ${c.description}`;
    })
    .join("\n");
  return (
    `You operate a visual builder by emitting a plan of commands.\n\n` +
    `Available commands (args are positional, in the order shown):\n${list}\n\n` +
    (elements
      ? `Element types and their props — use EXACTLY these props with these value ` +
        `kinds (scale steps are numbers 0-8; prefer Theme token names like ` +
        `'surface' or 'gradient:hero'; section background also accepts a literal ` +
        `CSS color or gradient. Other raw CSS like '64px 24px' padding is invalid — ` +
        `it belongs only in a _style object):\n${elements}\n\n`
      : "") +
    `Current document outline (id: type):\n${docOutline}\n\n` +
    (focus
      ? `The user is pointing at this element — target it (or its children) ` +
        `unless the intent clearly says otherwise:\n${focus}\n\n`
      : "") +
    `Rules:\n` +
    `- Use ONLY the listed commands. Unknown commands are dropped; steps with\n` +
    `  unknown ids are skipped. NEVER invent ids.\n` +
    `- Reference existing element ids from the outline; use the root id to add sections.\n` +
    `- To target an element CREATED by an earlier step in this plan, use "$K"\n` +
    `  where K is the 0-based index of the step that inserted it. Example:\n` +
    `  step 0 inserts a section, step 1 inserts a text into it:\n` +
    `  {"steps":[{"command":"insert","args":["<rootId>","section",{"columns":3}]},\n` +
    `            {"command":"insert","args":["$0","text",{"content":"Hi","as":"h2"}]}]}\n` +
    `- Give insert its FULL props inline (3rd arg) — never insert bare elements\n` +
    `  planning to fill them with later updates.\n` +
    `- Keep the plan minimal and purposeful.\n` +
    `- Do any web searching FIRST. Then your FINAL message must be ONLY the JSON\n` +
    `  object — no preamble, no explanation, no prose before or after it.\n\n` +
    `Return ONLY JSON: {"steps":[{"command":"insert","args":["<rootId>","section",{"columns":1}]}]}`
  );
}

/** Validate a raw plan: keep only steps that name a known command. Pure. */
export function parseCommandPlan(data: unknown, commands: PlannerCommand[]): CommandStep[] {
  const known = new Set(commands.map((c) => c.name));
  const steps = (data && typeof data === "object" ? (data as { steps?: unknown }).steps : undefined) ?? [];
  if (!Array.isArray(steps)) return [];
  return steps
    .filter((s): s is { command: string; args?: unknown } => !!s && typeof (s as { command?: unknown }).command === "string")
    .filter((s) => known.has(s.command))
    .map((s) => ({ command: s.command, args: Array.isArray(s.args) ? s.args : [] }));
}

/** Plan a sequence of commands from natural language. */
export async function planCommands(
  provider: Provider,
  input: PlanCommandsInput,
  onActivity?: OnActivity,
): Promise<CommandStep[]> {
  const system = buildPlannerSystemPrompt(input.commands, input.docOutline, input.focus, input.elements);
  const req = { system, prompt: input.intent, maxTokens: 4096 };
  const out = onActivity && provider.generateStream
    ? await provider.generateStream(req, onActivity)
    : await provider.generate(req);
  return parseCommandPlan(extractJson(out), input.commands);
}
