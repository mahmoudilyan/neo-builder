import type { ElementNode } from "@neo-builder/core";
import { useEditor } from "../context.js";

/**
 * Default inline text editor: plain contentEditable, no dependencies. Commits on
 * blur (one undo step). Opt into rich text by passing a TipTap-based
 * `textEditor` (see @neo-builder/editor-tiptap) to <BuilderProvider>.
 */
export function PlainText({ node, onDone }: { node: ElementNode; onDone: () => void }) {
  const store = useEditor();
  return (
    <div
      contentEditable
      suppressContentEditableWarning
      className="abx-edit"
      autoFocus
      onBlur={(e) => {
        store.updateProps(node.id, { content: e.currentTarget.textContent ?? "" });
        onDone();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
      }}
    >
      {String(node.props.content ?? "")}
    </div>
  );
}
