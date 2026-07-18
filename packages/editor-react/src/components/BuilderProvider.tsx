import { useEffect } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { EditorStore } from "../EditorStore.js";
import { EditorProvider, TextEditorProvider, type TextEditorComponent } from "../context.js";
import { PlainText } from "./PlainText.js";
import { resolveTarget } from "./dnd.js";

export interface BuilderProviderProps {
  /** The store from `useBuilder` / `createEditorStore`. */
  builder: EditorStore;
  children: React.ReactNode;
  /** Bind ⌘/Ctrl+Z undo and ⌘/Ctrl+Shift+Z (or Ctrl+Y) redo. Default: true. */
  keyboard?: boolean;
  /** Inline text editor for `text` Elements. Default: plain. Pass TipTap to opt in. */
  textEditor?: TextEditorComponent;
}

/**
 * The composable root: provides the store, the inline text editor, drag-and-drop,
 * and keyboard shortcuts to any descendant. Compose your own layout from the
 * exported components (`Palette`, `Canvas`, `Inspector`, `Toolbar`, …) inside it.
 */
export function BuilderProvider({ builder, children, keyboard = true, textEditor }: BuilderProviderProps) {
  const store = builder;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    if (!keyboard) return;
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        store.undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        store.redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store, keyboard]);

  function onDragEnd(e: DragEndEvent) {
    const overId = e.over ? String(e.over.id) : null;
    const over = overId === "canvas-root" ? null : overId;
    const data = e.active.data.current as { kind?: string; type?: string } | undefined;
    const doc = store.getState().doc;
    if (data?.kind === "new" && data.type) {
      const t = resolveTarget(doc, data.type === "section", over);
      store.addElement(data.type, t.parentId, t.index);
      return;
    }
    const activeId = String(e.active.id);
    if (!over || activeId === over) return;
    const aNode = store.get(activeId);
    if (!aNode) return;
    const t = resolveTarget(doc, aNode.type === "section", over);
    store.move(activeId, t.parentId, t.index);
  }

  return (
    <EditorProvider value={store}>
      <TextEditorProvider value={textEditor ?? PlainText}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          {children}
        </DndContext>
      </TextEditorProvider>
    </EditorProvider>
  );
}
