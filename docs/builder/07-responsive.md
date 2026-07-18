# 7. Responsive design

Responsive design is **per-Element prop overrides per breakpoint**, mobile-first.

## Breakpoints

```ts
import { BREAKPOINTS, BREAKPOINT_MIN_WIDTH } from "@ai-builder/core";
// BREAKPOINTS         = ["base", "sm", "md", "lg"]
// BREAKPOINT_MIN_WIDTH = { base: 0, sm: 480, md: 768, lg: 1024 }
```

`base` always applies. `sm`/`md`/`lg` layer on top as the viewport widens.

## The data model

Overrides live on `node.responsive`, keyed by breakpoint. Only the props that
*change* at that width are stored:

```jsonc
{
  "id": "sec1", "type": "section",
  "props":      { "columns": 1 },          // base / mobile
  "responsive": { "md": { "columns": 2 } } // 2 columns from 768px up
}
```

Resolve effective props with `resolveProps` (base merged with every override up
to and including the target breakpoint):

```ts
import { resolveProps } from "@ai-builder/core";
resolveProps(node, "base"); // { columns: 1 }
resolveProps(node, "sm");   // { columns: 1 }
resolveProps(node, "md");   // { columns: 2 }
resolveProps(node, "lg");   // { columns: 2 }  (inherits md)
```

## Editing responsively

The Inspector writes to the **active breakpoint**. Switch breakpoints in the
Toolbar; the canvas frame resizes (`base` 390px → `lg` 1024px) and edits target
that width:

```ts
store.setBreakpoint("md");                  // now editing the md override
store.setResponsive(id, "md", { columns: 2 });
// base edits go to props directly:
store.setResponsive(id, "base", { columns: 1 }); // == updateProps
```

In the UI: pick `md`, change `columns` to 2 in the Inspector — a `md override`
badge appears and only the `md`+ view changes. Switch back to `base` to confirm
mobile is untouched.

## How it reaches output

- **Canvas** — renders `resolveProps(node, breakpoint)` live, so toggling the
  breakpoint shows the responsive result immediately.
- **HTML compiler** — emits real `@media` queries. For each Element that has
  `responsive` overrides, it renders one variant per breakpoint and toggles them
  with **exclusive width ranges** (show/hide), e.g. a section with
  `responsive.md = { columns: 2 }` produces a 1-column variant shown below 768px
  and a 2-column variant shown at/above 768px. Non-responsive Elements get no
  wrappers and no extra CSS — clean output for the common case.

```html
<style>.r0-0{display:none}.r0-1{display:none}
@media (max-width:767px){.r0-0{display:block}}
@media (min-width:768px){.r0-1{display:block}}</style>
<div class="r0-0"><!-- 1 column --></div>
<div class="r0-1"><!-- 2 columns --></div>
```

This show/hide technique is chosen because the model uses inline styles (so it
also works in email): a class can't override an inline style without specificity
hacks, but swapping whole variants per range always works.

## Tips

- Design mobile-first: put the smallest layout in `props`, widen with overrides.
- Only store deltas in `responsive` — don't duplicate unchanged props.
- Not every prop needs overrides; text content usually stays constant while
  layout props (`columns`, `align`, sizing) change.
