import { useState } from "react";
import { walk } from "@neo-builder/core";
import { useEditor, useEditorState } from "@neo-builder/editor-react";
import { planCommands, type CommandStep } from "@neo-builder/ai";
import { mockPlannerProvider } from "./mockAi.js";

/**
 * Natural-language → command plan. This is what makes the substrate unique vs a
 * plain imperative editor: the LLM composes the same *described* commands a
 * human or `store.chain()` uses, over the live document outline.
 */
export function IntentBox() {
  const store = useEditor();
  const { doc } = useEditorState();
  const [intent, setIntent] = useState("Add a value proposition with a CTA");
  const [steps, setSteps] = useState<CommandStep[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setSteps(null);
    const commands = store.listCommands().map((c) => ({ name: c.name, description: c.description, params: c.params }));
    const docOutline = [...walk(doc)].map((n) => `${n.id}: ${n.type}`).join("\n");
    const plan = await planCommands(mockPlannerProvider, { commands, docOutline, intent });
    store.applyPlan(plan); // one undo step
    setSteps(plan);
    setBusy(false);
  }

  return (
    <div className="intent">
      <h4>Tell the builder what to do</h4>
      <textarea rows={2} value={intent} onChange={(e) => setIntent(e.target.value)} />
      <button className="primary" disabled={busy} onClick={run}>
        {busy ? "Planning…" : "Plan & apply commands"}
      </button>
      {steps && (
        <div className="plan">
          <div className="muted small">Planned {steps.length} command(s):</div>
          {steps.map((s, i) => (
            <code key={i}>
              {s.command}({s.args.map((a) => (typeof a === "object" ? "{…}" : JSON.stringify(a))).join(", ")})
            </code>
          ))}
        </div>
      )}
    </div>
  );
}
