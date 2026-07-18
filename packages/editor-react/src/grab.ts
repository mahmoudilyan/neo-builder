import { findById, walk, type Document, type ElementNode, type Registry } from "@neo-builder/core";

/**
 * The "grab" layer: package an Element as precise, paste-ready context for an
 * agent (in-app planner, Claude Code, Cursor…). The react-grab idea — point at
 * something, copy exactly what the agent needs — applied to the Document Model:
 * instead of fiber-walking to a source file, we already own the structure, so
 * the grabbed context is the node itself plus its registry contract (aiMeta).
 */
export interface GrabInput {
  doc: Document;
  registry: Registry;
  id: string;
}

/** Ancestor chain from root to `id`, e.g. `root > section#a1 > button#b2`. */
export function nodePath(doc: Document, id: string): string | null {
  const trail: ElementNode[] = [];
  const search = (n: ElementNode): boolean => {
    trail.push(n);
    if (n.id === id) return true;
    for (const c of n.children) if (search(c)) return true;
    trail.pop();
    return false;
  };
  if (!search(doc.root)) return null;
  return trail.map((n) => `${n.type}#${n.id}`).join(" > ");
}

/**
 * Build the paste-ready context block for one Element. Returns null when the
 * id is not in the Document.
 */
export function buildNodeContext({ doc, registry, id }: GrabInput): string | null {
  const node = findById(doc, id);
  const path = nodePath(doc, id);
  if (!node || !path) return null;
  const def = registry.get(node.type);

  const lines: string[] = [
    `<grabbed-element id="${node.id}" type="${node.type}">`,
    `path: ${path}`,
    `props: ${JSON.stringify(node.props)}`,
  ];
  if (node.responsive) lines.push(`responsive: ${JSON.stringify(node.responsive)}`);
  if (node.states) lines.push(`states: ${JSON.stringify(node.states)}`);
  if (node.children.length)
    lines.push(`children: ${node.children.map((c) => `${c.type}#${c.id}`).join(", ")}`);
  if (def) {
    lines.push(`element: ${def.label ?? def.type} — ${def.aiMeta.description}`);
    const hints = { ...def.schema.props, ...def.aiMeta.props };
    const hintLines = Object.entries(hints).map(([k, v]) => `  ${k}: ${v}`);
    if (hintLines.length) lines.push("prop hints:", ...hintLines);
  }
  lines.push(
    `document outline (id: type):`,
    ...[...walk(doc)].map((n) => `  ${n.id}: ${n.type}`),
    `</grabbed-element>`,
  );
  return lines.join("\n");
}
