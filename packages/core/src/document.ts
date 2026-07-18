import type { Document, ElementNode } from "./types.js";
import { createId } from "./id.js";
import type { Registry } from "./registry.js";

/** Current document-level schema version. */
export const DOCUMENT_SCHEMA_VERSION = 1;

/** Create an empty Document with a root container. */
export function createDocument(themeId: string): Document {
  return {
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    themeId,
    root: { id: createId(), type: "root", props: {}, children: [] },
  };
}

/**
 * Create an Element node of `type`, applying the definition's defaults.
 * Throws if the type is not registered.
 */
export function createElement(
  registry: Registry,
  type: string,
  props: Record<string, unknown> = {},
  children: ElementNode[] = [],
): ElementNode {
  const def = registry.require(type);
  return {
    id: createId(),
    type,
    props: { ...(def.defaults?.() ?? {}), ...props },
    children,
  };
}

/** Depth-first walk over every node in the document (root included). */
export function* walk(doc: Document): Generator<ElementNode> {
  yield* walkNode(doc.root);
}

function* walkNode(node: ElementNode): Generator<ElementNode> {
  yield node;
  for (const child of node.children) yield* walkNode(child);
}

/** Find a node by id, or undefined. */
export function findById(doc: Document, id: string): ElementNode | undefined {
  for (const node of walk(doc)) if (node.id === id) return node;
  return undefined;
}
