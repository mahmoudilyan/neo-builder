# Brief-and-Recipe generation: the AI authors meaning, the system art-directs

To stop AI-generated pages from looking templated and slop-filled, the AI does
**not** generate the visual layout. It authors only a **Content Brief** —
meaning plus a chosen **Mood** and **Layout Recipe**. A deterministic Layout
Recipe (in `@ai-builder/recipes`) then builds the Document, and the Mood adjusts
the Theme. Generation produces several **divergent Concepts** (different mood +
recipe each) to pick from.

The principle: separate *what* (AI: meaning) from *how it looks* (system: craft).
The system is the art director with taste baked in; the AI writes the brief. The
AI literally cannot produce an ugly or generic layout because it does not control
layout — and divergence (N concepts) stops pages converging to one template.

## Considered Options

- **Direct Document generation** (earlier approach, kept for `generatePage`) — the
  LLM emits a validated Document Model. Flexible, but layout is whatever the model
  picks: same grid every time, the visible "slop".
- **Expand the AI's palette** — more elements + freeform layout. More rope; more
  ways to be inconsistent without more taste.
- **Brief + Recipe + Mood with divergence** (chosen) — creativity lives in a
  curated, deterministic system; the AI supplies meaning and a high-level stance.

## Consequences

- New package `@ai-builder/recipes` owns Moods + Layout Recipes; `@ai-builder/ai`
  gains `generateConcepts` (returns Briefs). The app realizes Briefs with
  `applyConcept`.
- Visual range is bounded by the recipe/mood catalog — adding range means adding
  recipes/moods (a deliberate, curated act), not prompting harder.
- `generatePage` (direct) remains for cases that want raw model layout; Briefs are
  the default for "make me a page".
