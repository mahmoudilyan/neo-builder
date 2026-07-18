import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { useEditor, useEditorState } from "../context.js";
import { NodeView } from "./NodeView.js";
import type { Breakpoint } from "@neo-builder/core";

const FRAME_WIDTH: Record<Breakpoint, number> = { base: 390, sm: 480, md: 768, lg: 1024 };

/**
 * The device frame + sortable tree of sections. The DndContext lives in
 * <Editor> so the Palette (outside the canvas) can drag new Elements in.
 */
export function Canvas() {
  const store = useEditor();
  const { doc, breakpoint, preview } = useEditorState();
  // Whole-canvas dropzone so palette drops with no node under the cursor still land.
  const { setNodeRef } = useDroppable({ id: "canvas-root" });

  return (
    <div className="abx-canvas" onClick={() => store.select(null)}>
      <div
        ref={setNodeRef}
        className="abx-frame"
        style={{ maxWidth: FRAME_WIDTH[breakpoint], outline: preview ? "none" : undefined }}
      >
        <SortableContext
          items={doc.root.children.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {doc.root.children.map((n) => (
            <NodeView key={n.id} node={n} />
          ))}
        </SortableContext>
        {doc.root.children.length === 0 && (
          <div className="abx-empty big">{store.builder.emptyHint}</div>
        )}
      </div>
    </div>
  );
}
