import { walk, type Document, type ElementNode } from "@neo-builder/core";

/** Find the parent node of `id`, or undefined. */
export function parentOf(doc: Document, id: string): ElementNode | undefined {
  for (const n of walk(doc)) if (n.children.some((c) => c.id === id)) return n;
  return undefined;
}

export interface DropTarget {
  parentId: string;
  index: number;
}

/**
 * Resolve where a dragged item lands, given the node being dragged over.
 * Shared by reorder/move (existing nodes) and palette drops (new nodes).
 * `isSection` describes the *dragged* item.
 */
export function resolveTarget(
  doc: Document,
  isSection: boolean,
  overId: string | null,
): DropTarget {
  const root = doc.root;
  // Sections always live directly under root.
  if (isSection) {
    const idx = overId ? root.children.findIndex((c) => c.id === overId) : -1;
    return { parentId: root.id, index: idx < 0 ? root.children.length : idx };
  }
  if (!overId) {
    // No target: drop into the last section, or root if there are none.
    const lastSection = [...root.children].reverse().find((c) => c.type === "section");
    const parent = lastSection ?? root;
    return { parentId: parent.id, index: parent.children.length };
  }
  // Dropped onto a section container → append inside it.
  for (const n of walk(doc)) {
    if (n.id === overId && n.type === "section") {
      return { parentId: n.id, index: n.children.length };
    }
  }
  // Dropped onto a sibling element → place at its index in its parent.
  const oParent = parentOf(doc, overId);
  if (oParent) {
    const idx = oParent.children.findIndex((c) => c.id === overId);
    return { parentId: oParent.id, index: idx < 0 ? oParent.children.length : idx };
  }
  return { parentId: root.id, index: root.children.length };
}
