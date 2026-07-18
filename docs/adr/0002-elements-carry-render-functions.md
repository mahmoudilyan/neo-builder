# Elements carry their own per-target render functions

Each Element Definition ships its own render functions (`html`, `mjml`, `form`, …)
plus `schema`, `aiMeta`, and an `edit` view. Compilers walk the Document Model and call
the matching render function rather than owning a central switch over element types.

## Considered Options

- **Element-carries-render** (chosen) — third-party Extensions are compilable on every
  target without patching Compilers; the extension story works.
- **Compiler-owns-rendering** — Elements are pure data and each Compiler has a big switch
  over known types. Third-party Elements can't compile unless they modify every Compiler,
  which kills the extension model.

## Consequences

Element authors must think multi-target. A missing render function for a target, combined
with that target's Capability Profile, means the Element is excluded/degraded there rather
than erroring.
