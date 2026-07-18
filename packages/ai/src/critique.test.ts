import { describe, it, expect } from "vitest";
import { buildCritiqueSystemPrompt, critiquePage, parseCritique } from "./critique.js";
import type { PlannerCommand } from "./planner.js";
import type { Provider } from "./provider.js";

const commands: PlannerCommand[] = [
  { name: "update", description: "update props", params: [] },
  { name: "remove", description: "remove element", params: [] },
];

describe("parseCritique", () => {
  it("keeps known-command steps and coerces issues", () => {
    const r = parseCritique(
      {
        verdict: "fix",
        issues: [{ severity: 3, area: "contrast", note: "muted text on gradient" }, { severity: 9, note: "?" }],
        steps: [
          { command: "update", args: ["t1", { color: "text" }] },
          { command: "freehandCss", args: ["nope"] },
        ],
      },
      commands,
    );
    expect(r.verdict).toBe("fix");
    expect(r.issues).toHaveLength(2);
    expect(r.issues[1].severity).toBe(2); // out-of-range → default
    expect(r.steps).toEqual([{ command: "update", args: ["t1", { color: "text" }] }]);
  });

  it("ships when no steps and only cosmetic issues, or on explicit verdict", () => {
    expect(parseCritique({ issues: [{ severity: 1, area: "x", note: "" }], steps: [] }, commands).verdict).toBe("ship");
    expect(parseCritique({ verdict: "ship", steps: [{ command: "update", args: [] }] }, commands).verdict).toBe("ship");
    expect(parseCritique({}, commands).verdict).toBe("ship");
  });
});

describe("critiquePage", () => {
  it("sends the screenshot as an image and parses the reply", async () => {
    let seen: { images?: unknown; system?: string } = {};
    const provider: Provider = {
      name: "fake",
      async generate(req) {
        seen = req;
        return JSON.stringify({ verdict: "fix", issues: [], steps: [{ command: "remove", args: ["s9"] }] });
      },
    };
    const r = await critiquePage(provider, {
      image: { data: "aGk=", mediaType: "image/png" },
      commands,
      docOutline: "r1: root\ns9: section",
    });
    expect((seen.images as unknown[]).length).toBe(1);
    expect(seen.system).toContain("art director");
    expect(r.steps).toEqual([{ command: "remove", args: ["s9"] }]);
  });
});

describe("buildCritiqueSystemPrompt", () => {
  it("includes rubric, commands and outline", () => {
    const s = buildCritiqueSystemPrompt(commands, "r1: root");
    expect(s).toContain("Hierarchy");
    expect(s).toContain("- update() — update props");
    expect(s).toContain("r1: root");
  });
});
