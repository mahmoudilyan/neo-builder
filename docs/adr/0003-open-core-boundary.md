# Open-core boundary: AI capability is open, managed AI infrastructure is paid

The npm packages — Core, Compilers, Elements, Editor, Theme, MCP Server, and the
bring-your-own-key Provider — are open source and free, including in-app AI (you pay your
own model bill). The paid cloud owns the managed infrastructure: instrumentation
ingestion, the Forecaster (hosted TimesFM), the Forecast-Gated Regeneration loop, the
managed Routine runtime, hosted Asset Library + CDN, collaboration, and hosting.

This deliberately rejects a strict "AI = premium only" reading. Gating the agent API or
in-app AI would undercut the agent-first ethos and adoption; the defensible moat is the
hard-to-self-host managed infrastructure, not the API surface.

## Consequences

Open packages stay maximally adoptable. Cloud code lives in a separate private repo.
Licenses split by concern (see ADR-0005-adjacent README note): builder packages MIT,
AI-related packages (`ai`, `mcp`) Apache-2.0 for the patent grant.
