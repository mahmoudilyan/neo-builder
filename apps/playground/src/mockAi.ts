import type { Provider, GenerateRequest } from "@neo-builder/ai";

/**
 * A mock Provider so the playground exercises the *real* regeneration loop
 * (@neo-builder/ai `regenerate`) with no API key. Swap for AnthropicProvider with
 * a key to get real model output.
 */
export const mockProvider: Provider = {
  name: "mock",
  async generate(req: GenerateRequest): Promise<string> {
    await new Promise((r) => setTimeout(r, 450));
    const current = req.prompt.split("Current value:").pop()?.trim() ?? "this";
    const seeds = [
      `${current} — now 50% off`,
      `Don't miss out: ${current}`,
      `${current}, free for a limited time`,
      `Unlock ${current} today`,
      `The smarter way to ${current.toLowerCase()}`,
    ];
    // Return 3 "alternatives", one per line, like a real model would.
    return seeds.slice(0, 3).join("\n");
  },
};

/**
 * A mock Provider for page generation: returns a schema-valid Document Model as
 * JSON (what a real LLM would emit when asked by `generatePage`). Swap for
 * AnthropicProvider with a key for real generation.
 */
export const mockPageProvider: Provider = {
  name: "mock-page",
  async generate(): Promise<string> {
    await new Promise((r) => setTimeout(r, 600));
    return JSON.stringify({
      sections: [
        {
          type: "section",
          props: { columns: 1, bg: "surface", padding: 7 },
          children: [
            { type: "text", props: { content: "Ship faster with AcmeKit", as: "h1", align: "center" } },
            { type: "text", props: { content: "Production-ready components, typed end to end.", as: "p", align: "center" } },
            { type: "button", props: { label: "Get started", href: "#start" } },
          ],
        },
        {
          type: "section",
          props: { columns: 2, padding: 6 },
          children: [
            { type: "text", props: { content: "Type-safe by default", as: "h3" } },
            { type: "text", props: { content: "Tree-shakeable & tiny", as: "h3" } },
          ],
        },
      ],
    });
  },
};

/**
 * A mock concepts Provider: returns divergent Content Briefs (what generateConcepts
 * expects). Each uses a different mood + recipe. Swap for a live provider.
 */
export const mockConceptsProvider: Provider = {
  name: "mock-concepts",
  async generate(): Promise<string> {
    await new Promise((r) => setTimeout(r, 500));
    return JSON.stringify({
      concepts: [
        {
          mood: "editorial",
          recipe: "split-hero",
          headline: "Types you write once. Validation you never repeat.",
          subhead: "Define a schema and derive the TypeScript type from it — one source of truth.",
          cta: { label: "npm install zod", href: "#" },
          features: [
            { title: "2kb core", body: "Zero dependencies. Tree-shakeable to what you import." },
            { title: "Parse or safeParse", body: "Throw a ZodError, or get a typed result union." },
          ],
          stat: "31M downloads / week",
        },
        {
          mood: "bold",
          recipe: "centered-stack",
          headline: "Validate at the trust boundary.",
          subhead: "API responses, forms, env vars — wrap them in a schema and stop guessing.",
          cta: { label: "Read the docs", href: "#" },
          features: [
            { title: "14x faster in v4", body: "String parsing up to 14x faster than v3." },
            { title: "JSON Schema out", body: "Emit JSON Schema from any Zod type." },
            { title: "Inference first", body: "z.infer<typeof schema> gives you the type free." },
          ],
        },
        {
          mood: "minimal",
          recipe: "offset-grid",
          headline: "One schema. The type, the validator, the docs.",
          subhead: "Stop maintaining types and runtime checks separately.",
          cta: { label: "Get started", href: "#" },
          features: [
            { title: "Composable", body: "Build big schemas from small ones with .extend and .merge." },
            { title: "Framework-agnostic", body: "Works in Node, browsers, edge runtimes." },
          ],
          stat: "37.8k GitHub stars",
        },
      ],
    });
  },
};

/**
 * A mock planner Provider: reads the document outline from the system prompt and
 * emits a command plan (JSON) — what a real LLM does in `planCommands`. Targets
 * an existing section if there is one, else adds a section to the root.
 */
export const mockPlannerProvider: Provider = {
  name: "mock-planner",
  async generate(req): Promise<string> {
    await new Promise((r) => setTimeout(r, 450));
    const sys = req.system ?? "";
    const intent = (req.prompt ?? "").slice(0, 48);
    const sectionId = (sys.match(/(\S+): section/) ?? [])[1];
    const rootId = (sys.match(/(\S+): root/) ?? [])[1];
    const steps: { command: string; args: unknown[] }[] = [];
    // Grab-anchored ask: target the element the user pointed at.
    const focus = sys.match(/<grabbed-element id="([^"]+)" type="([^"]+)">/);
    if (focus) {
      const [, fid, ftype] = focus;
      if (ftype === "section") steps.push({ command: "insert", args: [fid, "text", { content: `✨ ${intent}` }] });
      else if (ftype === "button") steps.push({ command: "update", args: [fid, { label: `✨ ${intent}` }] });
      else steps.push({ command: "update", args: [fid, { content: `✨ ${intent}` }] });
      return JSON.stringify({ steps });
    }
    if (sectionId) {
      steps.push({ command: "insert", args: [sectionId, "text", { content: `✨ ${intent}`, as: "h2", align: "center" }] });
      steps.push({ command: "insert", args: [sectionId, "button", { label: "Learn more", href: "#" }] });
    } else if (rootId) {
      // Demo the symbolic-ref form: fill the section created by step 0.
      steps.push({ command: "insert", args: [rootId, "section", { columns: 1, padding: 6 }] });
      steps.push({ command: "insert", args: ["$0", "text", { content: `✨ ${intent}`, as: "h2", align: "center" }] });
    }
    return JSON.stringify({ steps });
  },
};

/**
 * Fabricate a declining per-Element metric history (e.g. CTR/day) so the
 * TimesFM-style decay detector has something to fire on. In production this
 * series comes from instrumentation; here we simulate it.
 */
export function fakeDecliningSeries(): { history: number[]; forecast: number[] } {
  const history = [0.12, 0.121, 0.118, 0.11, 0.1, 0.092];
  // Pretend TimesFM forecast continues the decline.
  const forecast = [0.082, 0.075, 0.07];
  return { history, forecast };
}

/**
 * A mock critique Provider: first round "finds" a hierarchy issue and centers
 * the first text element; second round ships. Lets the Polish loop demo
 * offline — the real critic is a vision call over the screenshot.
 */
export function makeMockCriticProvider(): Provider {
  let round = 0;
  return {
    name: "mock-critic",
    async generate(req: GenerateRequest): Promise<string> {
      await new Promise((r) => setTimeout(r, 600));
      round += 1;
      const sys = req.system ?? "";
      const textId = (sys.match(/(\S+): text/) ?? [])[1];
      if (round > 1 || !textId) return JSON.stringify({ verdict: "ship", issues: [], steps: [] });
      return JSON.stringify({
        verdict: "fix",
        issues: [
          { severity: 2, area: "hierarchy", note: "Headline size is timid for a hero — bump to the display scale." },
        ],
        steps: [{ command: "update", args: [textId, { size: "3xl" }] }],
      });
    },
  };
}

/**
 * A mock Provider for freeform dialect generation: returns Element HTML (what
 * generatePageHtml expects from a live model). Shows off the expressive props.
 */
export const mockHtmlProvider: Provider = {
  name: "mock-html",
  async generate(): Promise<string> {
    await new Promise((r) => setTimeout(r, 700));
    return `
<theme primary="#0e7490" primary-text="#ffffff" bg="#f8fdfe" surface="#e8f6f9" text="#0f2e33" muted="#5e8289" border="#d3e9ee" heading-font="Inter, system-ui, sans-serif" body-font="Inter, system-ui, sans-serif" gradient-hero="linear-gradient(160deg,#e8f6f9 0%,#f8fdfe 70%)" gradient-accent="linear-gradient(135deg,#0e7490 0%,#0891b2 100%)" gradient-subtle="linear-gradient(180deg,#f8fdfe 0%,#eef8fa 100%)" radius="soft" />
<section columns="1" background="gradient:hero" min-height="460" padding="8">
  <text as="h1" size="3xl" align="center" max-width="18em">Ship your docs site in an afternoon</text>
  <text size="lg" color="muted" align="center" max-width="36em">Markdown in, versioned reference out — search, dark mode and OpenAPI pages included.</text>
  <button label="Start free" href="#start" size="lg" />
</section>
<section columns="3" padding="7" width="wide">
  <section columns="1" background="none" padding="3">
    <text as="h3">Zero config</text>
    <text color="muted">Point it at a folder of markdown. Navigation and search build themselves.</text>
  </section>
  <section columns="1" background="none" padding="3">
    <text as="h3">OpenAPI native</text>
    <text color="muted">Drop in a spec, get typed request/response pages with runnable examples.</text>
  </section>
  <section columns="1" background="none" padding="3">
    <text as="h3">Versioned</text>
    <text color="muted">Every release keeps its docs. Old links never break.</text>
  </section>
</section>
<section columns="1" background="surface" padding="7">
  <text as="h2" align="center">Trusted by teams who hate stale docs</text>
  <text color="muted" align="center" max-width="38em">"We replaced three tools and our docs finally match the API." — Dana, platform lead</text>
</section>`;
  },
};
