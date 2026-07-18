import type { ElementDefinition, SkillDefinition, ToolDefinition } from "./types.js";

/**
 * The extension registry. Built-in Elements and Extensions register the same
 * way — and so do Tools and Skills. Compilers and the MCP Server read from it.
 */
export class Registry {
  private defs = new Map<string, ElementDefinition>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private tools = new Map<string, ToolDefinition<any, any>>();
  private skills = new Map<string, SkillDefinition>();

  register(def: ElementDefinition): this {
    if (this.defs.has(def.type)) {
      throw new Error(`Element type "${def.type}" is already registered`);
    }
    this.defs.set(def.type, def);
    return this;
  }

  registerAll(defs: ElementDefinition[]): this {
    for (const def of defs) this.register(def);
    return this;
  }

  get(type: string): ElementDefinition | undefined {
    return this.defs.get(type);
  }

  /** Get or throw — use in Compilers where a missing type is a bug. */
  require(type: string): ElementDefinition {
    const def = this.defs.get(type);
    if (!def) throw new Error(`Unknown Element type "${type}"`);
    return def;
  }

  has(type: string): boolean {
    return this.defs.has(type);
  }

  list(): ElementDefinition[] {
    return [...this.defs.values()];
  }

  // --- Tools ---------------------------------------------------------------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerTool<I = Record<string, unknown>, O = unknown>(tool: ToolDefinition<I, O>): this {
    if (this.tools.has(tool.name)) throw new Error(`Tool "${tool.name}" already registered`);
    this.tools.set(tool.name, tool);
    return this;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTool(name: string): ToolDefinition<any, any> | undefined {
    return this.tools.get(name);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listTools(): ToolDefinition<any, any>[] {
    return [...this.tools.values()];
  }

  // --- Skills --------------------------------------------------------------
  registerSkill(skill: SkillDefinition): this {
    if (this.skills.has(skill.name)) throw new Error(`Skill "${skill.name}" already registered`);
    this.skills.set(skill.name, skill);
    return this;
  }
  getSkill(name: string): SkillDefinition | undefined {
    return this.skills.get(name);
  }
  listSkills(): SkillDefinition[] {
    return [...this.skills.values()];
  }
}
