import { useEffect, useMemo, useRef, useState } from "react";
import type { ElementDefinition } from "@neo-builder/core";
import { useEditor } from "../context.js";
import { isAvailable } from "../builderType.js";

export interface InsertMenuProps {
  /** Called with the chosen Element type. */
  onPick: (type: string) => void;
  onClose: () => void;
  /** Optional heading, e.g. "Insert below". */
  title?: string;
}

const CATEGORY_ORDER = ["Layout", "Content", "Media", "Interactive"];

/**
 * Notion-style insert menu: searchable, keyboard-navigable list of the
 * Elements available in the active Builder Type. Opens from a block's "+"
 * gutter button or by pressing "/" with a block selected.
 */
export function InsertMenu({ onPick, onClose, title = "Insert" }: InsertMenuProps) {
  const store = useEditor();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const defs = useMemo(() => {
    const all = store.registry.list().filter((d) => isAvailable(d, store.target));
    const q = query.trim().toLowerCase();
    const match = q
      ? all.filter(
          (d) =>
            (d.label ?? d.type).toLowerCase().includes(q) ||
            d.type.toLowerCase().includes(q) ||
            d.aiMeta.description.toLowerCase().includes(q),
        )
      : all;
    return [...match].sort((a, b) => {
      const ca = CATEGORY_ORDER.indexOf(a.category ?? "");
      const cb = CATEGORY_ORDER.indexOf(b.category ?? "");
      return (ca === -1 ? 99 : ca) - (cb === -1 ? 99 : cb);
    });
  }, [store, query]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => inputRef.current?.focus(), []);

  // Close on outside click.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [onClose]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") return void onClose();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, defs.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && defs[active]) {
      e.preventDefault();
      onPick(defs[active].type);
    }
  }

  // Group for display, preserving sort order.
  const groups: { category: string; items: { def: ElementDefinition; index: number }[] }[] = [];
  defs.forEach((def, index) => {
    const category = def.category ?? "Other";
    const g = groups[groups.length - 1];
    if (g && g.category === category) g.items.push({ def, index });
    else groups.push({ category, items: [{ def, index }] });
  });

  return (
    <div ref={rootRef} className="abx-insert" onKeyDown={onKey} onClick={(e) => e.stopPropagation()}>
      <div className="abx-insert-head">{title}</div>
      <input
        ref={inputRef}
        className="abx-insert-search"
        placeholder="Search elements…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="abx-insert-list">
        {groups.map((g) => (
          <div key={g.category}>
            <div className="abx-insert-cat">{g.category}</div>
            {g.items.map(({ def, index }) => (
              <button
                key={def.type}
                className={"abx-insert-item" + (index === active ? " active" : "")}
                onMouseEnter={() => setActive(index)}
                onClick={() => onPick(def.type)}
              >
                <span className="abx-insert-ic">{def.icon ?? "▢"}</span>
                <span className="abx-insert-txt">
                  <span className="abx-insert-name">{def.label ?? def.type}</span>
                  <span className="abx-insert-desc">{def.aiMeta.description}</span>
                </span>
              </button>
            ))}
          </div>
        ))}
        {defs.length === 0 && <div className="abx-insert-none">No matches for “{query}”</div>}
      </div>
    </div>
  );
}
