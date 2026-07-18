import type { Breakpoint, Document, ElementNode, ElementState } from "./types.js";

/**
 * Immutable tree edits. Each returns a new Document; the input is untouched.
 * These are the operations the MCP Server and Editor both drive through.
 */

function mapNode(
  node: ElementNode,
  fn: (n: ElementNode) => ElementNode,
): ElementNode {
  const mapped = fn(node);
  const children = mapped.children.map((c) => mapNode(c, fn));
  return children === mapped.children ? mapped : { ...mapped, children };
}

/** Merge new props into the Element with `id`. Keeps the same Element id. */
export function updateProps(
  doc: Document,
  id: string,
  props: Record<string, unknown>,
): Document {
  return {
    ...doc,
    root: mapNode(doc.root, (n) =>
      n.id === id ? { ...n, props: { ...n.props, ...props } } : n,
    ),
  };
}

/**
 * Replace the props of an Element wholesale — used by regeneration, which
 * swaps content while preserving the Element id (ADR-0004).
 */
export function replaceProps(
  doc: Document,
  id: string,
  props: Record<string, unknown>,
): Document {
  return {
    ...doc,
    root: mapNode(doc.root, (n) => (n.id === id ? { ...n, props } : n)),
  };
}

/** Merge per-breakpoint overrides for an Element. `base` writes to `props`. */
export function setResponsive(
  doc: Document,
  id: string,
  breakpoint: Breakpoint,
  props: Record<string, unknown>,
): Document {
  if (breakpoint === "base") return updateProps(doc, id, props);
  return {
    ...doc,
    root: mapNode(doc.root, (n) => {
      if (n.id !== id) return n;
      const responsive = { ...n.responsive };
      responsive[breakpoint] = { ...responsive[breakpoint], ...props };
      return { ...n, responsive };
    }),
  };
}

/** Set the raw style overrides for an Element's interactive `state`. */
export function setElementState(
  doc: Document,
  id: string,
  state: ElementState,
  style: Record<string, unknown>,
): Document {
  return {
    ...doc,
    root: mapNode(doc.root, (n) => {
      if (n.id !== id) return n;
      const states = { ...n.states };
      states[state] = style;
      return { ...n, states };
    }),
  };
}

/** Move an Element to a new parent at `index` (default: append). */
export function moveElement(
  doc: Document,
  id: string,
  toParentId: string,
  index?: number,
): Document {
  let moved: ElementNode | undefined;
  const without = mapNode(doc.root, (n) => {
    const found = n.children.find((c) => c.id === id);
    if (found) {
      moved = found;
      return { ...n, children: n.children.filter((c) => c.id !== id) };
    }
    return n;
  });
  if (!moved) return doc;
  const captured = moved;
  return {
    ...doc,
    root: mapNode(without, (n) => {
      if (n.id !== toParentId) return n;
      const children = [...n.children];
      children.splice(index ?? children.length, 0, captured);
      return { ...n, children };
    }),
  };
}

/** Insert `child` into `parentId` at `index` (default: append). */
export function insertElement(
  doc: Document,
  parentId: string,
  child: ElementNode,
  index?: number,
): Document {
  return {
    ...doc,
    root: mapNode(doc.root, (n) => {
      if (n.id !== parentId) return n;
      const children = [...n.children];
      children.splice(index ?? children.length, 0, child);
      return { ...n, children };
    }),
  };
}

/** Remove the Element with `id` (and its subtree). The root cannot be removed. */
export function removeElement(doc: Document, id: string): Document {
  return {
    ...doc,
    root: mapNode(doc.root, (n) => {
      if (!n.children.some((c) => c.id === id)) return n;
      return { ...n, children: n.children.filter((c) => c.id !== id) };
    }),
  };
}
