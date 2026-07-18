import { useEffect } from "react";
import { createElement, insertElement } from "@neo-builder/core";
import { useEditor, useEditorState } from "@neo-builder/editor-react";
import { Button, Text } from "@marmoui/ui";

/**
 * Live examples of the TipTap-style command API. Every button runs a real
 * `store.chain()…run()` and shows the code. Demonstrates built-in commands and
 * a custom one registered via `store.registerCommand`.
 */
export function CommandsDemo() {
  const store = useEditor();
  const { doc, selectedId } = useEditorState();

  // Register a custom command once: chain().cmd("addHero").run()
  useEffect(() => {
    store.registerCommand("addHero", () => (ctx) => {
      const section = createElement(ctx.registry, "section", { columns: 1, bg: "surface", padding: 7 });
      ctx.draft.doc = insertElement(ctx.draft.doc, ctx.draft.doc.root.id, section);
      const heading = createElement(ctx.registry, "text", { content: "Hero headline", as: "h1", align: "center" });
      ctx.draft.doc = insertElement(ctx.draft.doc, section.id, heading);
      ctx.draft.selectedId = section.id;
      return true;
    });
  }, [store]);

  const sel = selectedId ? store.get(selectedId) : undefined;
  const sectionId = sel?.type === "section" ? sel.id : doc.root.children[0]?.id;

  return (
    <div className="cmds">
      <Text variant="label-sm" className="text-ink-light">
        Commands API
      </Text>

      <Button variant="secondary" size="xs" onClick={() => store.chain().insert(doc.root.id, "section", { columns: 1, padding: 6 }).run()}>
        Add section
      </Button>
      <code>chain().insert(rootId, "section", {"{ columns: 1 }"}).run()</code>

      <Button variant="secondary" size="xs"
        disabled={!sectionId}
        onClick={() => sectionId && store.chain().insert(sectionId, "button", { label: "Buy now" }).run()}
      >
        Add CTA to section
      </Button>
      <code>chain().insert(sectionId, "button", {"{ label }"}).run()</code>

      <Button variant="secondary" size="xs"
        disabled={!sel}
        onClick={() => sel && store.chain().setState(sel.id, "hover", { backgroundColor: "#3730a3" }).run()}
      >
        Hover-style selected
      </Button>
      <code>chain().setState(id, "hover", {"{ backgroundColor }"}).run()</code>

      <Button variant="secondary" size="xs" disabled={!sel} onClick={() => sel && store.chain().select(sel.id).remove(sel.id).run()}>
        Remove selected
      </Button>
      <code>chain().remove(id).run()</code>

      <Button variant="secondary" size="xs" onClick={() => store.chain().cmd("addHero").run()}>Run custom: addHero</Button>
      <code>store.registerCommand("addHero", …); chain().cmd("addHero").run()</code>

      <Text variant="body-sm" className="text-ink-light">
        Each chain is one undo step (⌘/Ctrl+Z).
      </Text>
    </div>
  );
}
