import type { ThemeTokens } from "@neo-builder/theme";
import { useEditor, useEditorState } from "../context.js";

/** Live Theme editing + adding a new Theme (clone-and-rename). */
export function ThemePanel() {
  const store = useEditor();
  useEditorState(); // re-render on theme:change (commits doc.themeId)
  const theme = store.theme;
  const t = theme.tokens as unknown as ThemeTokens;

  function setColor(key: keyof ThemeTokens["colors"], value: string) {
    const tokens: ThemeTokens = { ...t, colors: { ...t.colors, [key]: value } };
    store.setTheme({ id: theme.id, tokens });
  }
  function setFont(key: keyof ThemeTokens["fonts"], value: string) {
    const tokens: ThemeTokens = { ...t, fonts: { ...t.fonts, [key]: value } };
    store.setTheme({ id: theme.id, tokens });
  }
  function addTheme() {
    const id = prompt("New theme id", theme.id + "-copy");
    if (id) store.setTheme({ id, tokens: { ...t } });
  }

  const colorKeys: (keyof ThemeTokens["colors"])[] = ["bg", "surface", "text", "primary", "primaryText", "border"];

  return (
    <div className="abx-theme">
      <div className="abx-muted abx-small">active: {theme.id}</div>
      {colorKeys.map((k) => (
        <label key={k} className="abx-color">
          <input type="color" value={toHex(t.colors[k])} onChange={(e) => setColor(k, e.target.value)} />
          <span>{k}</span>
        </label>
      ))}
      <label>
        body font
        <input value={t.fonts.body} onChange={(e) => setFont("body", e.target.value)} />
      </label>
      <label>
        heading font
        <input value={t.fonts.heading} onChange={(e) => setFont("heading", e.target.value)} />
      </label>
      <button onClick={addTheme}>+ add theme</button>
    </div>
  );
}

function toHex(c: string): string {
  return /^#[0-9a-f]{6}$/i.test(c) ? c : "#000000";
}
