# Forecast-Gated Regeneration: combining TimesFM with an LLM

The signature self-optimizing loop uses TimesFM (a zero-shot decoder-only time-series
foundation model) and an LLM together. Instrumented compiled output produces per-Element
time-series; TimesFM forecasts each Element's near-future trajectory; a forecast crossing
a decay threshold fires a metric-signal Routine; the LLM regenerates that Element's
content. The Element id is preserved across regeneration so the time-series stays
continuous.

TimesFM is used in three roles beyond the trigger: (1) **forecast-accelerated bandit** —
forecast each Variant's early trajectory to shift traffic to the predicted winner before a
classic bandit would converge; (2) **counterfactual baseline** — forecast what the
untouched Element would have done, so lift is measured against a predicted-no-change line
instead of a permanently held-back control; (3) **forecast-informed generation** — feed
the numeric forecast and decay shape into the LLM prompt. Autonomy is per-Routine,
defaulting to human-approval with opt-in Autopilot.

## Why this combination

TimesFM is zero-shot, so it forecasts fresh pages with no per-customer training — the
reason it can gate regeneration immediately. The novelty over plain A/B testing is
forecasting *decay before it happens* and regenerating pre-emptively. This entire loop is
cloud-only.

## Consequences

Compiled output must carry stable per-Element instrumentation, and the cloud must run
ingestion + aggregation. Email's limited tracking means it cannot fully participate in the
loop (see ADR-0005).
