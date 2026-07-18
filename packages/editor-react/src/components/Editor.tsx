import { useState } from "react";
import type { EditorStore } from "../EditorStore.js";
import type { TextEditorComponent } from "../context.js";
import { BuilderProvider } from "./BuilderProvider.js";
import { Palette } from "./Palette.js";
import { Canvas } from "./Canvas.js";
import { Inspector } from "./Inspector.js";
import { ThemePanel } from "./ThemePanel.js";
import { Toolbar } from "./Toolbar.js";
import "../styles.css";

export interface EditorProps {
  store: EditorStore;
  /** Optional extra panel rendered under the inspector (e.g. the AI loop). */
  aside?: React.ReactNode;
  /** Bind undo/redo keyboard shortcuts. Default: true. */
  keyboard?: boolean;
  /** Optional MJML→HTML renderer for live email export. */
  mjmlToHtml?: (mjml: string) => string;
  /** Opt-in rich text editor (e.g. TipTap). Default: plain text. */
  textEditor?: TextEditorComponent;
}

/**
 * A ready-made default layout. For custom layouts, skip this and compose
 * `<BuilderProvider>` + the individual components yourself.
 */
export function Editor({ store, aside, keyboard = true, mjmlToHtml, textEditor }: EditorProps) {
  const [tab, setTab] = useState<"design" | "theme">("design");
  return (
    <BuilderProvider builder={store} keyboard={keyboard} textEditor={textEditor}>
      <div className="abx">
        <Toolbar mjmlToHtml={mjmlToHtml} />
        <div className="abx-cols">
          <aside className="abx-left">
            <h4>Add</h4>
            <Palette />
          </aside>
          <Canvas />
          <aside className="abx-right">
            <div className="abx-tabs">
              <button className={tab === "design" ? "on" : ""} onClick={() => setTab("design")}>
                Design
              </button>
              <button className={tab === "theme" ? "on" : ""} onClick={() => setTab("theme")}>
                Theme
              </button>
            </div>
            {tab === "design" ? <Inspector /> : <ThemePanel />}
            {aside}
          </aside>
        </div>
      </div>
    </BuilderProvider>
  );
}
