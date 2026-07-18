import { useEffect, useRef, useState } from "react";
import type { ElementNode } from "@neo-builder/core";
import { useEditor } from "../context.js";

/**
 * Element-anchored agent prompt (the react-grab interaction, Document-native):
 * point at an element, type what should change, and the connected agent plans
 * commands against that element. Submitting emits `agent:intent`; the host app
 * (AgentPanel, MCP bridge…) subscribes and runs the planner.
 */
export function GrabPrompt({ node, onClose }: { node: ElementNode; onClose: () => void }) {
  const store = useEditor();
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  function submit() {
    const intent = text.trim();
    if (!intent) return;
    store.askAgent(intent, node.id);
    onClose();
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape") onClose();
    e.stopPropagation();
  }

  const def = store.registry.get(node.type);
  return (
    <div className="abx-grabprompt" onClick={(e) => e.stopPropagation()}>
      <div className="abx-grabprompt-head">
        <span className="abx-grabprompt-target">
          ✦ {def?.icon ?? "▢"} {def?.label ?? node.type}
        </span>
        <button className="abx-grabprompt-close" title="Close (Esc)" onClick={onClose}>
          ×
        </button>
      </div>
      <textarea
        ref={ref}
        rows={2}
        placeholder="What should change here? e.g. “make this shorter and bolder”"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
      />
      <div className="abx-grabprompt-foot">
        <span className="abx-grabprompt-hint">Enter to send · ⌘C copies context for your agent</span>
        <button className="abx-grabprompt-send" disabled={!text.trim()} onClick={submit}>
          Ask agent
        </button>
      </div>
    </div>
  );
}
