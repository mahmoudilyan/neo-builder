# 5. Themes

Themes are **token sets**. Elements reference tokens through semantic Style Props
rather than hard-coding colors/sizes, so swapping a Theme restyles everything.
Tokens are designed against email's constraints as the floor (see
[ADR-0001](../adr/0001-one-universal-document-model.md)).

## Token shape

```ts
interface ThemeTokens {
  colors: { bg; surface; text; muted; primary; primaryText; border };
  fonts:  { body; heading };          // email-safe stacks
  spacing: number[];                  // px scale, index 0..n
  radii:  { sm; md; lg };
  fontSizes: { sm; base; lg; xl; "2xl" };
}
interface Theme { id: string; tokens: ThemeTokens }
```

Start from `defaultTheme` in `@ai-builder/theme`.

## Update a theme (live)

Build a new tokens object and call `store.setTheme`. It updates the active theme,
sets `doc.themeId`, emits `theme:change`, and re-renders the canvas.

```ts
import type { ThemeTokens } from "@ai-builder/theme";

const t = store.theme.tokens as ThemeTokens;
store.setTheme({
  id: store.theme.id,
  tokens: { ...t, colors: { ...t.colors, primary: "#e11d48" } },
});
```

The built-in `ThemePanel` does exactly this with color pickers and font inputs —
edit `colors.*` and `fonts.body` / `fonts.heading` and watch the page update.

> Themes are immutable token objects. "Updating" means calling `setTheme` with a
> new object — never mutate `store.theme.tokens` in place, or the canvas won't
> know to re-render.

## Add a theme

A new Theme is just a new `id` + tokens. Clone-and-rename, then make it active:

```ts
const t = store.theme.tokens as ThemeTokens;
const dark: Theme = {
  id: "dark",
  tokens: { ...t, colors: { ...t.colors, bg: "#0b0d11", surface: "#161a22", text: "#e8eaed" } },
};
store.setTheme(dark);
```

To offer a library of themes, keep an array and let the user pick:

```ts
const themes = [defaultTheme, dark, brandTheme];
function applyTheme(id: string) {
  const theme = themes.find((x) => x.id === id);
  if (theme) store.setTheme(theme);
}
```

`ThemePanel`'s **+ add theme** button clones the current tokens under a new id —
a starting point for building that library.

## Fonts

`fonts.body` / `fonts.heading` are tokens. For email keep web-safe stacks; the
HTML compiler can layer `@font-face` for richer web output (a documented
follow-up). Headings use `fonts.heading`, body text uses `fonts.body`.
