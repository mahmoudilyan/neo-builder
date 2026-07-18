import type { ElementDefinition, SkillDefinition, ToolDefinition } from "./types.js";

/** Identity helper that gives Element authors full type-checking + inference. */
export function defineElement(def: ElementDefinition): ElementDefinition {
  return def;
}

/** Identity helper for defining a Tool. */
export function defineTool<I = Record<string, unknown>, O = unknown>(
  tool: ToolDefinition<I, O>,
): ToolDefinition<I, O> {
  return tool;
}

/** Identity helper for defining a Skill. */
export function defineSkill(skill: SkillDefinition): SkillDefinition {
  return skill;
}
