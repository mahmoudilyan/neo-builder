import { useEffect, useRef } from "react";
import { useEditor as useTipTap, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { ElementNode } from "@neo-builder/core";
import { useEditor } from "@neo-builder/editor-react";

/** TipTap getHTML() returns block <p>…</p>; store inline so the `as` tag wraps it. */
function toInline(html: string): string {
  return html
    .replace(/<\/p>\s*<p>/g, "<br>")
    .replace(/^<p>/, "")
    .replace(/<\/p>\s*$/, "")
    .trim();
}

/**
 * Opt-in rich-text editor for `text` Elements, backed by TipTap (ProseMirror).
 * Pass it to the builder to enable rich text:
 *
 * ```tsx
 * <BuilderProvider builder={store} textEditor={TiptapText}>…</BuilderProvider>
 * // or: <Editor store={store} textEditor={TiptapText} />
 * ```
 *
 * Commits once on blur/unmount (one undo step). Content is stored as inline HTML
 * and sanitized at render by the `text` Element.
 */
export function TiptapText({ node, onDone }: { node: ElementNode; onDone: () => void }) {
  const store = useEditor();
  const htmlRef = useRef(String(node.props.content ?? ""));

  const editor = useTipTap({
    extensions: [StarterKit],
    content: String(node.props.content ?? ""),
    autofocus: "end",
    editorProps: { attributes: { class: "abx-tiptap" } },
    onUpdate: ({ editor }) => {
      htmlRef.current = toInline(editor.getHTML());
    },
    onBlur: () => {
      store.updateProps(node.id, { content: htmlRef.current });
      onDone();
    },
  });

  useEffect(() => () => store.updateProps(node.id, { content: htmlRef.current }), [node.id, store]);

  if (!editor) return null;
  const mark = (active: boolean) => (active ? "on" : "");
  const keep = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="abx-rt">
      <div className="abx-rt-bar" onMouseDown={keep}>
        <button className={mark(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}>
          B
        </button>
        <button className={mark(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}>
          i
        </button>
        <button className={mark(editor.isActive("strike"))} onClick={() => editor.chain().focus().toggleStrike().run()}>
          S
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
