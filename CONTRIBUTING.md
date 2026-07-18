# Contributing to Neo Builder

Thanks for your interest! Neo Builder is early and moving fast — the repo is updated
**weekly to bi-weekly**, and there are **no published versions yet**. Expect APIs to
shift until the first release.

## Project setup

Requirements: **Node ≥ 20** and **pnpm 10** (see `packageManager` in `package.json`).

```sh
pnpm install                                # installs deps + sets up git hooks (husky)
pnpm --filter @neo-builder/playground dev   # playground at http://localhost:5173
pnpm test                                   # vitest, runs against source
pnpm typecheck                              # tsc --noEmit across packages
pnpm build                                  # tsup, per-package dist + .d.ts
```

## Repo layout

```
packages/
  core            # headless Document Model, registry, commands, history
  theme           # token-based Theme system
  elements        # built-in Element Definitions
  compiler-html   # Document Model → HTML
  compiler-mjml   # Document Model → MJML (email)
  compiler-form   # Document Model → form schema
  editor-react    # React editor UI + EditorStore (composable API)
  editor-tiptap   # opt-in TipTap rich-text binding
  recipes         # Moods + Layout Recipes (anti-slop generation)
  ai              # BYO-key Providers, generation, planner, critique
  mcp             # MCP surface for external agents
apps/
  playground      # Vite playground (/page, /email, /form)
  docs            # docs site
```

Before writing code, read [`CONTEXT.md`](./CONTEXT.md) — it defines the project
vocabulary (Document Model, Element, Capability Profile, Content Brief, …). PRs and
issues should use those terms.

## Git hooks (husky)

Hooks are installed automatically by `pnpm install` (via the `prepare` script):

- **pre-commit** — runs `pnpm test`; the commit is blocked if tests fail.
- **commit-msg** — validates the message with commitlint against
  [Conventional Commits](https://www.conventionalcommits.org/).

## Commit messages

Use Conventional Commits:

```
<type>(<optional scope>): <description>

feat(core): add symbolic refs to applyPlan
fix(compiler-mjml): degrade gradient backgrounds to fallback color
docs: explain capability profiles
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `build`, `ci`.
Scope is usually the package name without the prefix (`core`, `ai`, `editor-react`, …).

## Versioning & releases

**There are no versions or releases yet.** Do not add changesets or bump versions in
PRs — release tooling (changesets) is configured but intentionally unused until the
first public release. Until then, `main` is the source of truth and is updated weekly
to bi-weekly.

## Pull requests

1. Fork/branch from `main` (`feat/…`, `fix/…`, `docs/…`).
2. Keep PRs focused — one concern per PR.
3. Add or update tests for behavior changes (`pnpm test` must pass).
4. `pnpm typecheck` must pass.
5. New Elements must include `aiMeta` and per-target `render` functions where the
   Capability Profile allows; register them the same way built-ins do.
6. Describe *why*, not only *what*, in the PR body.

## Good first areas

- New Moods and Layout Recipes in `packages/recipes` (curated creative range).
- MJML render functions for Elements that are currently HTML-only.
- New Elements or Extensions (see `docs/builder/` for the custom-element guide).
- Docs and playground polish.

## Questions / discussion

Open a GitHub issue — for bugs include a minimal repro (a Document Model JSON snippet
plus the compile/editor call that misbehaves).
