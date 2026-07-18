import { describe, it, expect } from "vitest";
import { buildPlannerSystemPrompt, parseCommandPlan, type PlannerCommand } from "./planner.js";

const commands: PlannerCommand[] = [
  { name: "insert", description: "insert", params: [] },
  { name: "update", description: "update", params: [] },
];

describe("parseCommandPlan", () => {
  it("keeps known commands with their args", () => {
    const steps = parseCommandPlan(
      { steps: [{ command: "insert", args: ["root", "section", { columns: 1 }] }, { command: "update", args: ["id", { content: "Hi" }] }] },
      commands,
    );
    expect(steps).toHaveLength(2);
    expect(steps[0]).toEqual({ command: "insert", args: ["root", "section", { columns: 1 }] });
  });

  it("drops unknown commands and tolerates missing args", () => {
    const steps = parseCommandPlan(
      { steps: [{ command: "hackTheGibson" }, { command: "update" }] },
      commands,
    );
    expect(steps).toEqual([{ command: "update", args: [] }]);
  });
});

describe("buildPlannerSystemPrompt", () => {
  it("includes the focused element block only when focus is given", () => {
    const base = buildPlannerSystemPrompt(commands, "r1: root");
    expect(base).not.toContain("pointing at");

    const focused = buildPlannerSystemPrompt(commands, "r1: root", '<grabbed-element id="b2" type="button">');
    expect(focused).toContain("pointing at");
    expect(focused).toContain('<grabbed-element id="b2" type="button">');
  });
});
