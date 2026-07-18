# One universal Document Model compiled to each target

Every Builder Type (Landing Page, Form, Email, Site) edits a single canonical
Document Model rather than having its own model. Per-target output is produced by
Compilers, and a Capability Profile marks which Elements/props each target supports
(email forbids JS/interactive Elements; form adds validation Elements).

## Considered Options

- **One universal model + Compilers** (chosen) — write an Element once, reuse Blocks
  across Builder Types, give AI a single schema to reason over.
- **Separate model per target** — each builder optimal for its medium, but 4× the
  Element work, no Block portability, and AI needs per-target knowledge.

## Consequences

Medium constraints must be expressed as Capability Profiles, and Compilers must reject
or gracefully degrade Elements they cannot render. Email is the constraining target and
sets the floor for the styling/token system.
