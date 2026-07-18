import { useEffect, useRef, useState } from "react";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { resolveProps, type ElementNode } from "@neo-builder/core";
import { ratioToGrid, resolveBackground, SECTION_WIDTHS, type ThemeTokens } from "@neo-builder/theme";
import { useEditor, useEditorState, useTextEditor } from "../context.js";
import { renderLeafHtml } from "./render.js";
import { PlainText } from "./PlainText.js";
import { InsertMenu } from "./InsertMenu.js";
import { GrabPrompt } from "./GrabPrompt.js";
import { isAvailable } from "../builderType.js";

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

export function NodeView({ node }: { node: ElementNode }) {
  const store = useEditor();
  const { selectedId, hoveredId, breakpoint, preview, builderType } = useEditorState();
  void builderType; // re-render when the Builder Type changes
  const def = store.registry.get(node.type);
  const unavailable = !!def && !isAvailable(def, store.target);
  const [inserting, setInserting] = useState(false);
  const [asking, setAsking] = useState(false);
  const [grabbed, setGrabbed] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
  });

  const selected = selectedId === node.id;
  const hovered = hoveredId === node.id;
  const isSection = node.type === "section";

  // Keyboard, scoped to the selected block:
  //  "/"  → insert menu (Notion-style)
  //  ⌘K   → element-anchored agent prompt (grab-style "edit this")
  //  ⌘C   → copy this Element's context for an external agent (react-grab
  //         parity; skipped while typing or when real text is selected)
  useEffect(() => {
    if (!selected || preview) return;
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.key === "/") {
        e.preventDefault();
        setInserting(true);
      } else if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setAsking(true);
      } else if (e.key.toLowerCase() === "c" && (e.metaKey || e.ctrlKey) && !window.getSelection()?.toString()) {
        e.preventDefault();
        void store.copyContext(node.id).then((ctx) => {
          if (!ctx) return;
          setGrabbed(true);
          window.setTimeout(() => setGrabbed(false), 1500);
        });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, preview, store, node.id]);

  const wrapStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "relative",
  };

  function onClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!preview) store.select(node.id);
  }

  /** Insert a new Element relative to this block, Notion-style ("below"). */
  function insertBelow(type: string) {
    setInserting(false);
    const parent = store.parentOf(node.id);
    if (type === "section" || !parent) {
      // New sections (or blocks whose parent we can't find) land after the
      // enclosing section at the root.
      const rootKids = store.getState().doc.root.children;
      const anchor = isSection ? node.id : parent?.id;
      const at = rootKids.findIndex((c) => c.id === anchor);
      store.addElement(type, store.getState().doc.root.id, at === -1 ? undefined : at + 1);
      return;
    }
    if (isSection) {
      store.addElement(type, node.id); // append inside the section
      return;
    }
    const at = parent.children.findIndex((c) => c.id === node.id);
    store.addElement(type, parent.id, at === -1 ? undefined : at + 1);
  }

  const showChrome = !preview && (hovered || selected || inserting);

  return (
    <div
      ref={setNodeRef}
      style={wrapStyle}
      className={
        "abx-block" +
        (selected && !preview ? " selected" : "") +
        (hovered && !selected && !preview ? " hovered" : "")
      }
      onClick={onClick}
      onMouseEnter={() => !preview && store.hover(node.id)}
      onMouseLeave={() => !preview && store.hover(null)}
      data-el-type={node.type}
      data-el-id={node.id}
    >
      {showChrome && (
        <div className="abx-gutter" onClick={(e) => e.stopPropagation()}>
          <button
            className="abx-gutter-btn"
            title="Insert below (/)"
            onClick={() => {
              store.select(node.id);
              setInserting(true);
            }}
          >
            +
          </button>
          <span className="abx-gutter-btn abx-grip" {...attributes} {...listeners} title="Drag to move">
            ⋮⋮
          </span>
        </div>
      )}

      {!preview && selected && (
        <div className="abx-blockbar" onClick={(e) => e.stopPropagation()}>
          <span className="abx-blockbar-type">
            {def?.icon ?? "▢"} {def?.label ?? node.type}
          </span>
          <button className="abx-ask" title="Ask agent to edit this (⌘K)" onClick={() => setAsking(true)}>
            ✦
          </button>
          <button title="Copy context for your agent (⌘C)" onClick={() => void store.copyContext(node.id)}>
            {grabbed ? "✓" : "⧈"}
          </button>
          <button title="Duplicate" onClick={() => store.duplicate(node.id)}>
            ⧉
          </button>
          <button title="Delete" className="danger" onClick={() => store.remove(node.id)}>
            ×
          </button>
        </div>
      )}

      {asking && !preview && (
        <div className="abx-insert-anchor">
          <GrabPrompt node={node} onClose={() => setAsking(false)} />
        </div>
      )}

      {inserting && !preview && (
        <div className="abx-insert-anchor">
          <InsertMenu title="Insert below" onPick={insertBelow} onClose={() => setInserting(false)} />
        </div>
      )}

      {unavailable && !isSection ? (
        <div className="abx-unavail">{node.type} — not available in this builder</div>
      ) : isSection ? (
        <SectionBody node={node} />
      ) : node.type === "text" ? (
        <InlineText node={node} />
      ) : node.type === "image" ? (
        <LeafImage node={node} selected={selected} preview={preview} />
      ) : (
        <div
          // WYSIWYG: render the Element's own html output.
          dangerouslySetInnerHTML={{
            __html: renderLeafHtml(store.registry, store.theme, node, breakpoint),
          }}
        />
      )}
    </div>
  );
}

/** Image with a corner resize handle that commits `width` on release. */
function LeafImage({ node, selected, preview }: { node: ElementNode; selected: boolean; preview: boolean }) {
  const store = useEditor();
  const { breakpoint } = useEditorState();
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState<number | null>(null);
  const html = renderLeafHtml(store.registry, store.theme, node, breakpoint);

  function onDown(e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = ref.current?.offsetWidth ?? 300;
    const move = (ev: PointerEvent) => setLive(Math.max(40, startW + (ev.clientX - startX)));
    const up = (ev: PointerEvent) => {
      const w = Math.max(40, Math.round(startW + (ev.clientX - startX)));
      store.updateProps(node.id, { width: `${w}px` });
      setLive(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div
      ref={ref}
      style={{ position: "relative", display: "inline-block", maxWidth: "100%", width: live ? `${live}px` : undefined }}
    >
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {selected && !preview && <span className="abx-resize" onPointerDown={onDown} />}
    </div>
  );
}

function SectionBody({ node }: { node: ElementNode }) {
  const store = useEditor();
  const { breakpoint } = useEditorState();
  const t = store.theme.tokens as unknown as ThemeTokens;
  const p = resolveProps(node, breakpoint);
  const cols = Math.max(1, Math.min(Number(p.columns ?? 1), 4));
  const pad = t.spacing[Number(p.padding ?? 6)] ?? 24;
  const { css } = resolveBackground(t, p.background ?? p.bg, p.overlay);
  const minHeight = Number(p.minHeight ?? 0);

  return (
    <section
      style={{
        backgroundColor: css["background-color"],
        backgroundImage: css["background-image"],
        backgroundSize: css["background-size"],
        backgroundPosition: css["background-position"],
        padding: pad,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: ratioToGrid(p.ratio) ?? `repeat(${cols}, 1fr)`,
          gap: t.spacing[Number(p.gap ?? 4)] ?? 16,
          maxWidth: SECTION_WIDTHS[String(p.width ?? "normal")] ?? 640,
          margin: "0 auto",
          minHeight: minHeight > 0 ? minHeight : undefined,
          alignContent: minHeight > 0 ? "center" : undefined,
        }}
      >
        <SortableContext items={node.children.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {node.children.map((c) => (
            <NodeView key={c.id} node={c} />
          ))}
        </SortableContext>
        {node.children.length === 0 && <div className="abx-empty">Empty section — press “/” or drag elements here</div>}
      </div>
    </section>
  );
}

function InlineText({ node }: { node: ElementNode }) {
  const store = useEditor();
  const { breakpoint, preview } = useEditorState();
  const [editing, setEditing] = useState(false);
  const html = renderLeafHtml(store.registry, store.theme, node, breakpoint);

  const TextEditor = useTextEditor() ?? PlainText;
  if (preview || !editing) {
    return (
      <div
        onDoubleClick={() => !preview && setEditing(true)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return <TextEditor node={node} onDone={() => setEditing(false)} />;
}
