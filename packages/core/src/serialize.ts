import type { Document, ElementNode } from "./types.js";
import type { Registry } from "./registry.js";

/**
 * Serialized form carries per-node `__v` (the Element version at save time) so
 * migrations can run on load. Stored as plain JSON.
 */
interface SerializedNode extends ElementNode {
  __v?: number;
  children: SerializedNode[];
}
interface SerializedDocument extends Omit<Document, "root"> {
  root: SerializedNode;
}

export function serialize(doc: Document, registry: Registry): string {
  const stamp = (node: ElementNode): SerializedNode => ({
    ...node,
    __v: registry.get(node.type)?.version ?? 0,
    children: node.children.map(stamp),
  });
  const out: SerializedDocument = { ...doc, root: stamp(doc.root) };
  return JSON.stringify(out);
}

/**
 * Parse JSON and run per-Element migrations up to each Element's current
 * version (ADR-0001/ADR-0002 — each Element Definition owns its migrate fn).
 */
export function deserialize(json: string, registry: Registry): Document {
  const raw = JSON.parse(json) as SerializedDocument;
  const migrate = (node: SerializedNode): ElementNode => {
    const def = registry.get(node.type);
    let props = node.props;
    if (def?.migrate && (node.__v ?? 0) < def.version) {
      props = def.migrate(props, node.__v ?? 0);
    }
    const { __v: _drop, ...rest } = node;
    return { ...rest, props, children: node.children.map(migrate) };
  };
  return { ...raw, root: migrate(raw.root) };
}
