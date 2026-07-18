/**
 * TimesFM forecasting. TimesFM is accessed as a hosted API (not self-hosted
 * weights). This module provides the API client plus the *pure* decision logic
 * that turns forecasts into Metric Signals — the testable heart of
 * Forecast-Gated Regeneration (ADR-0004).
 */

/** Granularity hint for TimesFM (0 = high freq, 1 = medium, 2 = low). */
export type Frequency = 0 | 1 | 2;

export interface ForecastRequest {
  /** Per-Element historical metric series (e.g. daily CTR), oldest first. */
  history: number[];
  /** How many steps ahead to forecast. */
  horizon: number;
  frequency?: Frequency;
}

export interface ForecastResult {
  /** Point forecast for each of the `horizon` future steps. */
  forecast: number[];
}

export interface Forecaster {
  forecast(req: ForecastRequest): Promise<ForecastResult>;
}

export interface TimesFmClientOptions {
  endpoint: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
}

/** Client for a hosted TimesFM inference endpoint. */
export class TimesFmClient implements Forecaster {
  constructor(private opts: TimesFmClientOptions) {}

  async forecast(req: ForecastRequest): Promise<ForecastResult> {
    const f = this.opts.fetchImpl ?? fetch;
    const res = await f(this.opts.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.opts.apiKey}`,
      },
      body: JSON.stringify({
        inputs: [req.history],
        horizon: req.horizon,
        freq: [req.frequency ?? 0],
      }),
    });
    if (!res.ok) {
      throw new Error(`TimesFM request failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { forecast: number[][] };
    return { forecast: data.forecast[0] ?? [] };
  }
}

// ---------------------------------------------------------------------------
// Pure decision logic (no network) — unit-testable.
// ---------------------------------------------------------------------------

export interface DecayOptions {
  /** Fractional drop that counts as decay, e.g. 0.15 = forecast 15% below baseline. */
  threshold?: number;
  /** How many leading history points form the baseline. Default: last 3. */
  baselineWindow?: number;
}

export interface DecaySignal {
  decaying: boolean;
  /** Baseline level (recent actuals). */
  baseline: number;
  /** Mean of the forecast horizon. */
  predicted: number;
  /** Signed fractional change (negative = decline). */
  delta: number;
}

/**
 * A Metric Signal: fires when TimesFM predicts the metric will fall meaningfully
 * below its recent baseline — decay detected *before* it bottoms out.
 */
export function detectDecay(
  history: number[],
  forecast: number[],
  opts: DecayOptions = {},
): DecaySignal {
  const threshold = opts.threshold ?? 0.15;
  const win = opts.baselineWindow ?? 3;
  const recent = history.slice(-win);
  const baseline = mean(recent);
  const predicted = mean(forecast);
  const delta = baseline === 0 ? 0 : (predicted - baseline) / baseline;
  return { decaying: delta <= -threshold, baseline, predicted, delta };
}

/**
 * Counterfactual lift: actual outcome of a Variant vs the TimesFM forecast of
 * what the untouched original would have done. Removes the need for a held-back
 * control (ADR-0004).
 */
export function counterfactualLift(actual: number, counterfactual: number): number {
  if (counterfactual === 0) return 0;
  return (actual - counterfactual) / counterfactual;
}

/**
 * Forecast-Accelerated Bandit allocation: weight traffic toward Variants whose
 * forecasts predict the best outcome, with a floor so every arm keeps exploring.
 */
export function allocateTraffic(forecasts: number[], explore = 0.1): number[] {
  const n = forecasts.length;
  if (n === 0) return [];
  const floor = explore / n;
  const positive = forecasts.map((v) => Math.max(v, 0));
  const total = positive.reduce((a, b) => a + b, 0);
  if (total === 0) return forecasts.map(() => 1 / n);
  return positive.map((v) => floor + (1 - explore) * (v / total));
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
