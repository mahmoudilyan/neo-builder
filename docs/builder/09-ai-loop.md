# 9. The AI loop (Forecast-Gated Regeneration)

The differentiator: TimesFM forecasts each Element's metric trajectory, and when
it predicts **decay before it happens**, an LLM regenerates that Element. Full
rationale in [ADR-0004](../adr/0004-forecast-gated-regeneration.md). All pieces
live in `@ai-builder/ai`.

## Pieces

```ts
import {
  TimesFmClient,        // hosted TimesFM API client (Forecaster)
  detectDecay,          // forecast -> Metric Signal (pure)
  counterfactualLift,   // actual vs predicted-no-change (pure)
  allocateTraffic,      // forecast-accelerated bandit (pure)
  regenerate,           // LLM produces Variants
  AnthropicProvider,    // BYO-key Provider
} from "@ai-builder/ai";
```

The decision math (`detectDecay`, `counterfactualLift`, `allocateTraffic`) is
**pure and unit-tested** — no network — so you can reason about and test the loop
without calling any model.

## The loop, wired to an Element

```ts
// 1. History comes from instrumentation (here: from your analytics store).
const history = await metrics.series(node.id, "ctr"); // number[]

// 2. TimesFM forecasts the near future.
const forecaster = new TimesFmClient({ endpoint, apiKey });
const { forecast } = await forecaster.forecast({ history, horizon: 3 });

// 3. Fire only if decay is predicted.
const signal = detectDecay(history, forecast, { threshold: 0.15 });
if (!signal.decaying) return;

// 4. LLM regenerates — forecast-informed prompt.
const provider = new AnthropicProvider({ apiKey: ANTHROPIC_KEY });
const variants = await regenerate(provider, {
  aiMeta: registry.require(node.type).aiMeta,
  prop: "content",
  current: String(node.props.content),
  signal,                 // numeric forecast goes into the prompt
});

// 5. Apply a Variant — Element id is preserved so the series stays continuous.
store.replaceProps(node.id, { ...node.props, content: variants[0] });
```

## Three uses of TimesFM beyond the trigger

```ts
// Forecast-accelerated bandit: weight traffic toward predicted winners,
// but keep every arm exploring.
const weights = allocateTraffic(perVariantForecasts, 0.1);

// Counterfactual baseline: measure lift vs what the original would have done,
// no held-back control group needed.
const lift = counterfactualLift(actualOutcome, forecastOfOriginal);
```

## Autonomy

Whether a winning Variant ships automatically is a per-Routine setting,
**human-approval by default**, with opt-in **Autopilot**. In the editor the
default is propose-then-apply: the AI panel shows Variants and traffic weights,
and the user clicks **Apply**.

## Try it without keys

The playground (`apps/playground`) wires this exact flow with a **mock Provider**
and a **synthetic declining series** (`src/mockAi.ts`), so you can watch
`detectDecay` fire, `regenerate` produce Variants, and `allocateTraffic` weight
them — then **Apply** one. Swap `mockProvider` for `AnthropicProvider({ apiKey })`
and a real `TimesFmClient` to go live.

## What's open vs cloud

`@ai-builder/ai` (the Provider, the TimesFM client, the loop logic) is open and
BYO-key. The **managed** loop — hosted forecasting, instrumentation ingestion,
the routine runtime that runs this on a schedule/trigger — is the paid cloud
(see [ADR-0003](../adr/0003-open-core-boundary.md)). The `history` array above is
the boundary: in production it comes from cloud instrumentation.
