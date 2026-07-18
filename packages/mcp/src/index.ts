import type { Registry } from "@neo-builder/core";

/**
 * The canonical surface for external AI agents (Claude, Cursor, Codex, Gemini)
 * to operate the builder. This package derives the MCP toolset from Core: every
 * command becomes a tool, and Element `aiMeta` is surfaced so agents know what
 * they can build.
 *
 * Transport binding (stdio/HTTP via @modelcontextprotocol/sdk) is wired in a
 * follow-up; this module produces the transport-agnostic tool descriptors.
 */

export interface ToolDescriptor {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

/** Mutation tools — mirror @neo-builder/core commands. */
export const commandTools: ToolDescriptor[] = [
  {
    name: "insert_element",
    description: "Insert a new Element of a registered type into a parent Element.",
    inputSchema: {
      type: "object",
      properties: {
        parentId: { type: "string", description: "Id of the parent Element." },
        type: { type: "string", description: "Registered Element type." },
        props: { type: "object", description: "Initial props for the Element." },
        index: { type: "number", description: "Insertion index (optional)." },
      },
      required: ["parentId", "type"],
    },
  },
  {
    name: "update_props",
    description: "Merge new props into an existing Element (keeps its Element id).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Target Element id." },
        props: { type: "object", description: "Props to merge." },
      },
      required: ["id", "props"],
    },
  },
  {
    name: "remove_element",
    description: "Remove an Element and its subtree.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Element id to remove." } },
      required: ["id"],
    },
  },
];

/**
 * Build the full agent toolset: the command tools, a `list_element_types` tool
 * generated from each Element's aiMeta, and every registered Tool surfaced as
 * an MCP tool.
 */
export function buildToolset(registry: Registry): ToolDescriptor[] {
  const catalog = registry
    .list()
    .map((d) => `- ${d.type}: ${d.aiMeta.description}`)
    .join("\n");

  const listTool: ToolDescriptor = {
    name: "list_element_types",
    description: `List the Element types available to build with.\n${catalog}`,
    inputSchema: { type: "object", properties: {}, required: [] },
  };

  // Registered Tools become first-class MCP tools.
  const registered: ToolDescriptor[] = registry.listTools().map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(t.inputSchema).map(([k, hint]) => [k, { type: "string", description: hint }]),
      ),
      required: Object.keys(t.inputSchema),
    },
  }));

  return [...commandTools, listTool, ...registered];
}

/**
 * Registered Skills, formatted for injection as MCP prompts / context. "A Skill
 * knows" — these carry instructions, not executable behaviour.
 */
export function buildSkillPrompts(registry: Registry): { name: string; description: string; instructions: string }[] {
  return registry.listSkills().map((s) => ({
    name: s.name,
    description: s.description,
    instructions: s.instructions,
  }));
}
