import { BREAKPOINTS, type Breakpoint } from "@neo-builder/core";
import { compileHtml } from "@neo-builder/compiler-html";
import { compileMjml } from "@neo-builder/compiler-mjml";
import { compileForm } from "@neo-builder/compiler-form";
import { useEditor, useEditorState } from "../context.js";

const LABEL: Record<Breakpoint, string> = { base: "📱 base", sm: "sm", md: "💻 md", lg: "🖥 lg" };

export interface ToolbarProps {
  /** Optional MJML→HTML renderer for live email export (e.g. mjml-browser). */
  mjmlToHtml?: (mjml: string) => string;
}

export function Toolbar({ mjmlToHtml }: ToolbarProps) {
  const store = useEditor();
  const { breakpoint, preview, canUndo, canRedo, builderType } = useEditorState();
  void builderType;
  const builder = store.builder;

  function openWindow(content: string, asText: boolean) {
    const w = window.open("", "_blank");
    if (!w) return;
    if (asText) {
      const esc = content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      w.document.write(`<pre style="white-space:pre-wrap;font:13px monospace;padding:20px">${esc}</pre>`);
    } else {
      w.document.write(content);
    }
    w.document.close();
  }

  function exportOutput() {
    const doc = store.getState().doc;
    const opts = { registry: store.registry, theme: store.theme };
    if (store.target === "html") return openWindow(compileHtml(doc, { ...opts, title: "Export" }), false);
    if (store.target === "form")
      return openWindow(JSON.stringify(compileForm(doc, opts), null, 2), true);
    // email / mjml
    const mjml = compileMjml(doc, opts);
    if (mjmlToHtml) return openWindow(mjmlToHtml(mjml), false);
    openWindow(mjml, true);
  }

  return (
    <div className="abx-toolbar">
      <span className="abx-builder-tag">{builder.label} builder</span>
      <span className="abx-sep" />
      <button disabled={!canUndo} onClick={() => store.undo()} title="Undo (⌘/Ctrl+Z)">
        ↶ undo
      </button>
      <button disabled={!canRedo} onClick={() => store.redo()} title="Redo (⌘/Ctrl+Shift+Z)">
        ↷ redo
      </button>
      <span className="abx-sep" />
      <div className="abx-bps">
        {BREAKPOINTS.map((bp) => (
          <button key={bp} className={bp === breakpoint ? "on" : ""} onClick={() => store.setBreakpoint(bp)}>
            {LABEL[bp]}
          </button>
        ))}
      </div>
      <span className="abx-spacer" />
      <button className={preview ? "on" : ""} onClick={() => store.togglePreview()}>
        {preview ? "✓ preview" : "preview"}
      </button>
      <button onClick={exportOutput}>{builder.exportLabel}</button>
    </div>
  );
}
