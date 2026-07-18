import { useState } from "react";
import { useEditor, useEditorState } from "@neo-builder/editor-react";
import { detectDecay, regenerate, allocateTraffic, type DecaySignal } from "@neo-builder/ai";
import { mockProvider, fakeDecliningSeries } from "./mockAi.js";
import { Alert, Badge, Button, Text } from "@marmoui/ui";
import { ArrowsClockwise } from "@phosphor-icons/react";

const AI_PROP: Record<string, string> = { text: "content", button: "label" };

interface Out {
  signal: DecaySignal;
  variants: string[];
  weights: number[];
  prop: string;
}

/**
 * The Forecast-Gated Regeneration loop, wired into the editor as an aside panel.
 * Uses the real @neo-builder/ai logic with a mock Provider + synthetic series.
 */
export function AiPanel() {
  const store = useEditor();
  const { selectedId } = useEditorState();
  const node = selectedId ? store.get(selectedId) : undefined;
  const prop = node ? AI_PROP[node.type] : undefined;
  const [out, setOut] = useState<Out | null>(null);
  const [loading, setLoading] = useState(false);

  if (!node || !prop) return null;

  async function run() {
    setLoading(true);
    setOut(null);
    const { history, forecast } = fakeDecliningSeries();
    const signal = detectDecay(history, forecast, { threshold: 0.15 });
    const variants = signal.decaying
      ? await regenerate(mockProvider, {
          aiMeta: store.registry.require(node!.type).aiMeta,
          prop: prop!,
          current: String(node!.props[prop!] ?? ""),
          signal,
        })
      : [];
    const forecasts = variants.map((_, i) => 1 + i * 0.6);
    setOut({ signal, variants, weights: allocateTraffic(forecasts), prop: prop! });
    setLoading(false);
  }

  function apply(text: string) {
    store.replaceProps(node!.id, { ...node!.props, [out!.prop]: text });
    setOut(null);
  }

  return (
    <div className="aipanel">
      <Text variant="label-sm" className="text-ink-light">
        AI loop
      </Text>
      <Button
        variant="secondary"
        size="sm"
        leftIcon={<ArrowsClockwise />}
        loading={loading}
        loadingText="Forecasting…"
        disabled={loading}
        onClick={run}
      >
        Simulate forecast & regenerate
      </Button>
      {out && (
        <div className="aiout">
          <Badge variant={out.signal.decaying ? "warning" : "success"} size="sm">
            forecast {(out.signal.delta * 100).toFixed(0)}% vs baseline — {out.signal.decaying ? "decay → regenerating" : "healthy"}
          </Badge>
          {out.variants.map((v, i) => (
            <div key={i} className="variant">
              <div className="vtext">{v}</div>
              <div className="vmeta">
                <Text variant="body-sm" className="text-ink-light">
                  traffic {(out.weights[i]! * 100).toFixed(0)}%
                </Text>
                <Button variant="secondary" size="xs" onClick={() => apply(v)}>
                  Apply
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
