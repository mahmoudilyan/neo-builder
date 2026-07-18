import { describe, it, expect } from "vitest";
import { Registry, defineElement, createDocument, findById } from "@neo-builder/core";
import { EditorStore } from "./EditorStore.js";

function makeStore() {
  const registry = new Registry()
    .register(
      defineElement({
        type: "section",
        version: 1,
        schema: { props: { columns: "number" }, allowedChildren: "*" },
        aiMeta: { description: "band" },
        render: { html: () => "<section/>" },
      }),
    )
    .register(
      defineElement({
        type: "text",
        version: 1,
        schema: { props: { content: "string" } },
        aiMeta: { description: "text" },
        defaults: () => ({ content: "Text" }),
        render: { html: (n) => `<p>${String(n.props.content)}</p>` },
      }),
    );
  return new EditorStore({ registry, doc: createDocument("default"), theme: { id: "default", tokens: {} } });
}

describe("applyPlan symbolic refs + lenient execution", () => {
  it("resolves $K to the id created by step K, nesting correctly", () => {
    const store = makeStore();
    const rootId = store.getState().doc.root.id;
    const { applied, skipped } = store.applyPlan([
      { command: "insert", args: [rootId, "section", { columns: 3 }] },
      { command: "insert", args: ["$0", "text", { content: "Starter" }] },
      { command: "insert", args: ["$0", "text", { content: "Pro" }] },
      { command: "update", args: ["$1", { content: "Starter — $0/mo" }] },
    ]);
    expect(applied).toBe(4);
    expect(skipped).toBe(0);
    const section = store.getState().doc.root.children[0];
    expect(section.type).toBe("section");
    expect(section.children.map((c) => String(c.props.content))).toEqual(["Starter — $0/mo", "Pro"]);
  });

  it("skips invalid steps (hallucinated ids, unknown commands) without voiding the plan", () => {
    const store = makeStore();
    const rootId = store.getState().doc.root.id;
    const { applied, skipped } = store.applyPlan([
      { command: "insert", args: [rootId, "text", { content: "kept" }] },
      { command: "update", args: ["made-up-id", { content: "lost" }] },
      { command: "freehandCss", args: [] },
      { command: "insert", args: ["$1", "text", { content: "parent failed" }] }, // $1 unresolved
    ]);
    expect(applied).toBe(1);
    expect(skipped).toBe(3);
    expect(String(store.getState().doc.root.children[0]?.props.content)).toBe("kept");
    expect(store.getState().canUndo).toBe(true); // committed as one undo step
  });

  it("resolves refs nested inside objects and arrays in args", () => {
    const store = makeStore();
    const rootId = store.getState().doc.root.id;
    store.applyPlan([
      { command: "insert", args: [rootId, "text", { content: "a" }] },
      { command: "update", args: ["$0", { content: "linked", meta: { sourceId: "$0" } }] },
    ]);
    const node = store.getState().doc.root.children[0];
    expect(String(node.props.content)).toBe("linked");
    expect((node.props.meta as { sourceId: string }).sourceId).toBe(node.id);
  });
});
