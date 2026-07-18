import { useMemo, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { walk, type ElementDefinition } from "@neo-builder/core";
import { useEditor, useEditorState } from "../context.js";
import { isAvailable } from "../builderType.js";

const CATEGORY_ORDER = ["Layout", "Content", "Media", "Interactive"];

/** Element types offered for the active Builder Type, grouped and searchable. */
export function Palette() {
  const store = useEditor();
  const { builderType } = useEditorState();
  const [query, setQuery] = useState("");
  const target = store.builder.target;

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const defs = store.registry
      .list()
      .filter((d) => isAvailable(d, target))
      .filter(
        (d) =>
          !q ||
          (d.label ?? d.type).toLowerCase().includes(q) ||
          d.aiMeta.description.toLowerCase().includes(q),
      );
    const byCat = new Map<string, ElementDefinition[]>();
    for (const d of defs) {
      const c = d.category ?? "Other";
      byCat.set(c, [...(byCat.get(c) ?? []), d]);
    }
    return [...byCat.entries()].sort(
      ([a], [b]) =>
        (CATEGORY_ORDER.indexOf(a) + 1 || 99) - (CATEGORY_ORDER.indexOf(b) + 1 || 99),
    );
  }, [store, target, query]);

  return (
    <div className="abx-palette" key={builderType}>
      <input
        className="abx-palette-search"
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {groups.map(([category, defs]) => (
        <div key={category} className="abx-palette-group">
          <div className="abx-palette-cat">{category}</div>
          <div className="abx-palette-grid">
            {defs.map((d) => (
              <PaletteItem key={d.type} type={d.type} />
            ))}
          </div>
        </div>
      ))}
      {groups.length === 0 && <div className="abx-palette-none">No matches</div>}
    </div>
  );
}

function PaletteItem({ type }: { type: string }) {
  const store = useEditor();
  const { doc, selectedId } = useEditorState();
  const def = store.registry.get(type)!;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `new:${type}`,
    data: { kind: "new", type },
  });

  function firstSectionId(): string | null {
    for (const n of walk(doc)) if (n.type === "section") return n.id;
    return null;
  }

  // Click still works (drag needs 4px movement); appends like before.
  function add() {
    if (type === "section") return void store.addElement("section", doc.root.id);
    const selected = selectedId ? store.get(selectedId) : undefined;
    const parentId =
      selected?.type === "section"
        ? selected.id
        : firstSectionId() ?? store.addElement("section", doc.root.id).id;
    store.addElement(type, parentId);
  }

  return (
    <button
      ref={setNodeRef}
      className="abx-palette-item"
      style={{ opacity: isDragging ? 0.5 : 1 }}
      title={`${def.aiMeta.description}\n(drag onto canvas or click to add)`}
      onClick={add}
      {...listeners}
      {...attributes}
    >
      <span className="abx-pi-icon">{def.icon ?? "▢"}</span>
      <span className="abx-pi-label">{def.label ?? type}</span>
    </button>
  );
}
