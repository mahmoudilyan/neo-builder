import type { AiMeta } from "@neo-builder/core";
import type { Provider } from "./provider.js";
import type { DecaySignal } from "./forecaster.js";

export interface RegenerateInput {
  /** The Element's agent-facing metadata. */
  aiMeta: AiMeta;
  /** The prop being regenerated, e.g. "content" or "label". */
  prop: string;
  /** Current value of that prop. */
  current: string;
  /** Forecast context that triggered regeneration (forecast-informed prompt). */
  signal?: DecaySignal;
  /** Optional Skill text injected as guidance. */
  skill?: string;
  /** Number of Variants to produce. Default 3. */
  count?: number;
}

/**
 * The LLM half of the loop: given an Element's aiMeta + the forecast that
 * triggered it, produce candidate Variants. The numeric forecast is fed into
 * the prompt so generation is forecast-informed, not blind (ADR-0004).
 */
export async function regenerate(
  provider: Provider,
  input: RegenerateInput,
): Promise<string[]> {
  const count = input.count ?? 3;
  const decay = input.signal
    ? `Predicted change: ${(input.signal.delta * 100).toFixed(0)}% vs baseline ` +
      `(baseline=${input.signal.baseline.toFixed(2)}, forecast=${input.signal.predicted.toFixed(2)}).`
    : "";

  const system =
    `You rewrite a single piece of content for a web Element.\n` +
    `Element: ${input.aiMeta.description}\n` +
    (input.skill ? `Guidance: ${input.skill}\n` : "") +
    `Return exactly ${count} alternatives, one per line, no numbering, no quotes.`;

  const prompt =
    `Rewrite the "${input.prop}" to reverse a forecasted performance decline.\n` +
    (decay ? decay + "\n" : "") +
    `Current value: ${input.current}`;

  const out = await provider.generate({ system, prompt, temperature: 1 });
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, count);
}
