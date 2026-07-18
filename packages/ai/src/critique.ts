import type { ImageInput, OnActivity, Provider } from "./provider.js";
import { extractJson } from "./generate.js";
import { parseCommandPlan, type CommandStep, type PlannerCommand } from "./planner.js";

/**
 * The "eyes" of the agent: show the model a screenshot of the compiled page
 * and get back (a) a verdict and (b) a fix plan expressed in the same
 * describable commands as the planner. The registry stays the hard boundary —
 * the critic can only repair through validated commands, never freehand.
 */

export interface CritiqueIssue {
  /** 1 = cosmetic … 3 = badly hurts the page. */
  severity: 1 | 2 | 3;
  area: string;
  note: string;
}

export interface CritiqueResult {
  verdict: "ship" | "fix";
  issues: CritiqueIssue[];
  steps: CommandStep[];
}

export interface CritiqueInput {
  /** Screenshot of the rendered page. */
  image: ImageInput;
  /** The described commands the model may use (e.g. store.listCommands()). */
  commands: PlannerCommand[];
  /** Outline of the current document (ids + types) so fixes can target nodes. */
  docOutline: string;
  /**
   * Element prop contracts (from buildElementHints). Without this the critic
   * invents CSS-ish props (fontSize, color:"#fff") that renders ignore — the
   * fix "applies" with zero visual effect.
   */
  elements?: string;
  /** Optional extra intent, e.g. "match a bold, high-energy direction". */
  intent?: string;
}

/** The design rubric the critic scores against. Exported for reuse/tuning. */
export const DESIGN_RUBRIC = [
  "Hierarchy: one dominant headline; sizes step down deliberately; no two elements compete.",
  "Contrast: text is comfortably readable on its background, including over gradients/images.",
  "Spacing rhythm: consistent vertical spacing; the hero breathes; nothing is cramped or orphaned.",
  "Alignment: content shares clean axes; centered and left-aligned content are not mixed arbitrarily.",
  "Line length: paragraphs stay near 45–75 characters; headlines wrap on sensible break points.",
  "Color: one accent used with intent; backgrounds alternate purposefully, not randomly.",
  "CTA: a single obvious primary action above the fold; secondary actions visibly subordinate.",
  "Slop check: no generic filler copy, no meaningless stock phrases, no empty decorative sections.",
].join("\n- ");

export function buildCritiqueSystemPrompt(
  commands: PlannerCommand[],
  docOutline: string,
  elements?: string,
): string {
  const list = commands
    .map((c) => {
      const params = c.params.map((p) => `${p.name}${p.optional ? "?" : ""}: ${p.hint}`).join(", ");
      return `- ${c.name}(${params}) — ${c.description}`;
    })
    .join("\n");
  return (
    `You are a demanding art director reviewing a screenshot of a page built ` +
    `in a visual builder. Judge it against this rubric:\n- ${DESIGN_RUBRIC}\n\n` +
    `You repair problems by emitting commands (args positional, in order):\n${list}\n\n` +
    (elements
      ? `Element types and their props — update steps must use EXACTLY these ` +
        `props (invented props like fontSize/lineHeight are silently ignored). ` +
        `Sizes come from the type scale ('sm'…'4xl'), text color takes a token ` +
        `('text'|'muted'|'primary') or a literal CSS color, section background ` +
        `takes a token, 'gradient:hero|accent|subtle', or a literal CSS ` +
        `color/gradient. Arbitrary raw CSS goes in a _style object prop:\n${elements}\n\n`
      : "") +
    `Current document outline (id: type):\n${docOutline}\n\n` +
    `Rules:\n` +
    `- Use ONLY the listed commands and ONLY ids from the outline.\n` +
    `- Fix the few things that matter most this round (max ~6 steps); smaller is better.\n` +
    `- Verdict "ship" when remaining issues are cosmetic (severity 1) or none.\n` +
    `- Your FINAL message must be ONLY the JSON object — no prose.\n\n` +
    `Return ONLY JSON: {"verdict":"ship"|"fix","issues":[{"severity":1|2|3,` +
    `"area":"hierarchy","note":"…"}],"steps":[{"command":"update","args":["<id>",{...}]}]}`
  );
}

/** Validate a raw critique payload. Unknown commands are dropped. Pure. */
export function parseCritique(data: unknown, commands: PlannerCommand[]): CritiqueResult {
  const obj = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const rawIssues = Array.isArray(obj.issues) ? obj.issues : [];
  const issues: CritiqueIssue[] = rawIssues
    .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
    .map((i) => ({
      severity: ([1, 2, 3].includes(Number(i.severity)) ? Number(i.severity) : 2) as 1 | 2 | 3,
      area: String(i.area ?? "general"),
      note: String(i.note ?? ""),
    }));
  const steps = parseCommandPlan(obj, commands);
  const verdict: "ship" | "fix" =
    obj.verdict === "ship" || (steps.length === 0 && issues.every((i) => i.severity === 1))
      ? "ship"
      : "fix";
  return { verdict, issues, steps };
}

/** One critique round: screenshot in, verdict + validated fix plan out. */
export async function critiquePage(
  provider: Provider,
  input: CritiqueInput,
  onActivity?: OnActivity,
): Promise<CritiqueResult> {
  const system = buildCritiqueSystemPrompt(input.commands, input.docOutline, input.elements);
  const req = {
    system,
    prompt:
      (input.intent ? `Direction to honor: ${input.intent}\n\n` : "") +
      "Here is the current render. Critique it against the rubric and return the JSON.",
    images: [input.image],
    maxTokens: 4096,
  };
  const out = onActivity && provider.generateStream
    ? await provider.generateStream(req, onActivity)
    : await provider.generate(req);
  return parseCritique(extractJson(out), input.commands);
}
