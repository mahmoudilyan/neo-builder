import { useState } from "react";
import { resolveProps, type ElementState } from "@neo-builder/core";
import { useEditor, useEditorState } from "../context.js";

const SPACING_KEYS = ["padding", "gap", "width"];

/**
 * Edits the selected Element: its props (per breakpoint), its raw CSS for the
 * default appearance, and its interactive states (hover/focus/active). Also
 * surfaces the Element's identity — icon, description, and what it accepts.
 */
export function Inspector() {
  const store = useEditor();
  const { selectedId, breakpoint } = useEditorState();
  const node = selectedId ? store.get(selectedId) : undefined;
  const [state, setState] = useState<"default" | ElementState>("default");
  if (!node) return <p className="abx-muted">Select an Element.</p>;

  const def = store.registry.require(node.type);
  const resolved = resolveProps(node, breakpoint);
  const accepts = def.schema.allowedChildren;
  const acceptsLabel = accepts === undefined ? "nothing (leaf)" : accepts === "*" ? "any element" : accepts.join(", ");

  function setProp(key: string, value: unknown) {
    store.setResponsive(node!.id, breakpoint, { [key]: value });
  }

  // CSS-override editor target: default appearance (_style) or an interactive state.
  const styleObj =
    state === "default"
      ? ((node.props._style as Record<string, unknown> | undefined) ?? {})
      : (node.states?.[state] ?? {});

  function setStyle(text: string) {
    try {
      const parsed = text.trim() ? (JSON.parse(text) as Record<string, unknown>) : {};
      if (state === "default") store.updateProps(node!.id, { _style: parsed });
      else store.setState(node!.id, state as ElementState, parsed);
    } catch {
      /* ignore until valid JSON */
    }
  }

  return (
    <div className="abx-inspector">
      <div className="abx-el-head">
        <span className="abx-el-icon">{def.icon ?? "▢"}</span>
        <div>
          <div className="abx-el-name">{def.label ?? node.type}</div>
          <div className="abx-muted abx-small">{def.aiMeta.description}</div>
        </div>
      </div>
      <div className="abx-muted abx-small">
        accepts: {acceptsLabel} · id {node.id.slice(0, 8)}
        {breakpoint !== "base" && <span className="abx-badge">{breakpoint}</span>}
      </div>

      {Object.entries(def.schema.props)
        .filter(([k]) => !k.startsWith("_") && !SPACING_KEYS.includes(k))
        .map(([key, hint]) => (
          <label key={key} title={hint}>
            {key}
            <input value={String(resolved[key] ?? "")} onChange={(e) => setProp(key, e.target.value)} />
          </label>
        ))}

      {SPACING_KEYS.some((k) => k in def.schema.props) && (
        <div className="abx-spacing">
          {(["padding", "gap"] as const)
            .filter((k) => k in def.schema.props)
            .map((k) => (
              <div className="abx-step" key={k}>
                <span>{k}</span>
                <button onClick={() => setProp(k, Math.max(0, Number(resolved[k] ?? 0) - 1))}>−</button>
                <b>{Number(resolved[k] ?? 0)}</b>
                <button onClick={() => setProp(k, Math.min(8, Number(resolved[k] ?? 0) + 1))}>+</button>
              </div>
            ))}
          {"width" in def.schema.props && (
            <label title="drag the canvas corner handle, or set CSS width">
              width
              <input value={String(resolved.width ?? "")} onChange={(e) => setProp("width", e.target.value)} />
            </label>
          )}
        </div>
      )}

      <div className="abx-states">
        <div className="abx-muted abx-small">style state</div>
        <div className="abx-state-tabs">
          {(["default", ...(def.states ?? [])] as const).map((s) => (
            <button key={s} className={s === state ? "on" : ""} onClick={() => setState(s)}>
              {s}
            </button>
          ))}
        </div>
        <textarea
          key={node.id + state}
          rows={4}
          defaultValue={JSON.stringify(styleObj, null, 2)}
          placeholder={state === "default" ? '{ "borderRadius": "12px" }' : '{ "backgroundColor": "#3730a3" }'}
          onBlur={(e) => setStyle(e.target.value)}
        />
        <div className="abx-muted abx-small">
          {state === "default" ? "Base CSS override (_style)." : `CSS applied on :${state}.`}
        </div>
      </div>
    </div>
  );
}
