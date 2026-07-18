import { describe, it, expect, vi } from "vitest";
import {
  Registry,
  defineElement,
  createDocument,
  createElement,
  insertElement,
} from "@neo-builder/core";
import { EditorStore } from "./EditorStore.js";

function makeStore() {
  const registry = new Registry().register(
    defineElement({
      type: "button",
      version: 1,
      schema: { props: { label: "string" } },
      aiMeta: { description: "call to action" },
      defaults: () => ({ label: "Go" }),
      render: { html: (n) => `<a>${String(n.props.label)}</a>` },
    }),
  );
  let doc = createDocument("default");
  const button = createElement(registry, "button");
  doc = insertElement(doc, doc.root.id, button);
  const store = new EditorStore({
    registry,
    doc,
    theme: { id: "default", tokens: {} },
  });
  return { store, button };
}

describe("EditorStore grab layer", () => {
  it("askAgent emits agent:intent with the explicit or selected id", () => {
    const { store, button } = makeStore();
    const events: unknown[] = [];
    store.on("agent:intent", (p) => events.push(p));

    store.askAgent("make it red", button.id);
    expect(events[0]).toEqual({ id: button.id, intent: "make it red" });

    store.select(button.id);
    store.askAgent("shorter");
    expect(events[1]).toEqual({ id: button.id, intent: "shorter" });
  });

  it("grabContext returns paste-ready context; null for unknown ids", () => {
    const { store, button } = makeStore();
    expect(store.grabContext(button.id)).toContain(`type="button"`);
    expect(store.grabContext("nope")).toBeNull();
  });

  it("copyContext writes to the clipboard and emits grab:copy", async () => {
    const { store, button } = makeStore();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    const events: unknown[] = [];
    store.on("grab:copy", (p) => events.push(p));
    const ctx = await store.copyContext(button.id);

    expect(ctx).toContain(`type="button"`);
    expect(writeText).toHaveBeenCalledWith(ctx);
    expect(events).toEqual([{ id: button.id, context: ctx }]);
    vi.unstubAllGlobals();
  });
});
