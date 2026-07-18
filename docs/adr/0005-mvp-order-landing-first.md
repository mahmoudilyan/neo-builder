# Build order: Landing Page first, Email demoted from #1

Builder Types ship in the order Landing Page → Form → Email → Site, even though the
original ask listed Email first. The differentiator (Forecast-Gated Regeneration, ADR-0004)
needs full client analytics — dwell, scroll, per-Element CTR. Email only supports opens and
click redirects, so an Email-first launch could not demonstrate the moat and would look
like yet-another email builder.

Landing Page is the only early target that exercises the full styling, instrumentation, and
regeneration loop end-to-end. Form follows cheaply (shares the HTML compiler, adds
validation Elements). Email comes third, by which point Compilers and Capability Profiles
are battle-tested; Site is last.

## Consequences

Email is reframed as a broadcast surface for content the loop already optimized on Landing
Pages, rather than the primary AI-optimization target.
