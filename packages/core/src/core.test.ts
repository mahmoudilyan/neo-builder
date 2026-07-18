import { describe, it, expect } from "vitest";
import {
  Registry,
  defineElement,
  defineTool,
  defineSkill,
  createDocument,
  createElement,
  insertElement,
  updateProps,
  replaceProps,
  removeElement,
  findById,
  serialize,
  deserialize,
  bindData,
  setElementState,
  accepts,
} from "./index.js";

function makeRegistry() {
  return new Registry().register(
    defineElement({
      type: "text",
      version: 1,
      schema: { props: { content: "string" } },
      aiMeta: { description: "text" },
      defaults: () => ({ content: "hi" }),
      render: { html: (n) => `<p>${String(n.props.content)}</p>` },
    }),
  );
}

describe("document + commands", () => {
  it("inserts, updates and removes immutably, preserving Element id", () => {
    const reg = makeRegistry();
    const doc0 = createDocument("default");
    const el = createElement(reg, "text", { content: "a" });
    const doc1 = insertElement(doc0, doc0.root.id, el);

    expect(doc0.root.children).toHaveLength(0); // input untouched
    expect(doc1.root.children).toHaveLength(1);

    const doc2 = updateProps(doc1, el.id, { content: "b" });
    expect(findById(doc2, el.id)?.props.content).toBe("b");
    expect(findById(doc2, el.id)?.id).toBe(el.id); // id stable

    const doc3 = replaceProps(doc2, el.id, { content: "c" });
    expect(findById(doc3, el.id)?.props).toEqual({ content: "c" });
    expect(findById(doc3, el.id)?.id).toBe(el.id); // id survives regeneration

    const doc4 = removeElement(doc3, el.id);
    expect(findById(doc4, el.id)).toBeUndefined();
  });
});

describe("serialization + migration", () => {
  it("runs per-Element migration on load when version is behind", () => {
    const reg = new Registry().register(
      defineElement({
        type: "text",
        version: 2,
        schema: { props: { body: "string" } },
        aiMeta: { description: "text" },
        migrate: (old) => ({ body: old.content ?? old.body }),
        render: { html: (n) => `<p>${String(n.props.body)}</p>` },
      }),
    );
    // Hand-craft a v1 serialized doc (prop named `content`, __v: 1).
    const json = JSON.stringify({
      schemaVersion: 1,
      themeId: "default",
      root: {
        id: "root",
        type: "root",
        props: {},
        children: [{ id: "t1", type: "text", props: { content: "old" }, __v: 1, children: [] }],
      },
    });
    const doc = deserialize(json, reg);
    expect(findById(doc, "t1")?.props).toEqual({ body: "old" });
  });

  it("round-trips serialize -> deserialize", () => {
    const reg = makeRegistry();
    let doc = createDocument("default");
    const el = createElement(reg, "text", { content: "x" });
    doc = insertElement(doc, doc.root.id, el);
    const back = deserialize(serialize(doc, reg), reg);
    expect(findById(back, el.id)?.props.content).toBe("x");
  });
});

describe("data bindings", () => {
  it("resolves {{path}} tokens in string props from data", () => {
    const reg = makeRegistry();
    let doc = createDocument("default");
    const el = createElement(reg, "text", { content: "Hi {{user.name}}, {{count}} left" });
    doc = insertElement(doc, doc.root.id, el);
    const bound = bindData(doc, { user: { name: "Mo" }, count: 3 });
    expect(findById(bound, el.id)?.props.content).toBe("Hi Mo, 3 left");
    // original untouched (immutable)
    expect(findById(doc, el.id)?.props.content).toContain("{{user.name}}");
  });

  it("leaves missing paths as empty and non-binding props alone", () => {
    const reg = makeRegistry();
    let doc = createDocument("default");
    const el = createElement(reg, "text", { content: "{{missing}}!" });
    doc = insertElement(doc, doc.root.id, el);
    expect(findById(bindData(doc, {}), el.id)?.props.content).toBe("!");
  });
});

describe("tools + skills registry", () => {
  it("registers and lists tools and skills", () => {
    const reg = new Registry();
    reg.registerTool(
      defineTool({
        name: "translate",
        description: "Translate text",
        inputSchema: { text: "the text", lang: "target language" },
        run: ({ text }: { text: string }) => text.toUpperCase(),
      }),
    );
    reg.registerSkill(
      defineSkill({ name: "voice", description: "Brand voice", instructions: "Be concise." }),
    );
    expect(reg.listTools().map((t) => t.name)).toEqual(["translate"]);
    expect(reg.getSkill("voice")?.instructions).toBe("Be concise.");
  });
});

describe("interactive states + accepts", () => {
  it("sets per-state style overrides and keeps id", () => {
    const reg = makeRegistry();
    let doc = createDocument("default");
    const el = createElement(reg, "text", { content: "x" });
    doc = insertElement(doc, doc.root.id, el);
    doc = setElementState(doc, el.id, "hover", { backgroundColor: "#000" });
    expect(findById(doc, el.id)?.states?.hover).toEqual({ backgroundColor: "#000" });
    expect(findById(doc, el.id)?.id).toBe(el.id);
  });

  it("accepts() reflects allowedChildren", () => {
    const container = defineElement({
      type: "box",
      version: 1,
      schema: { props: {}, allowedChildren: "*" },
      aiMeta: { description: "box" },
      render: { html: () => "" },
    });
    const leaf = makeRegistry().require("text");
    expect(accepts(container, "text")).toBe(true);
    expect(accepts(leaf, "text")).toBe(false);
  });
});
