import { describe, it, expect } from "vitest";
import { Registry, createDocument, createElement, insertElement } from "@neo-builder/core";
import { registerBuiltins } from "@neo-builder/elements";
import { defaultTheme } from "@neo-builder/theme";
import { compileMjml } from "./index.js";

function buildDoc() {
  const reg = registerBuiltins(new Registry());
  let doc = createDocument(defaultTheme.id);
  const section = createElement(reg, "section", { columns: 2 });
  doc = insertElement(doc, doc.root.id, section);
  doc = insertElement(doc, section.id, createElement(reg, "text", { content: "Hi", as: "h1" }));
  doc = insertElement(doc, section.id, createElement(reg, "button", { label: "Shop", href: "/s" }));
  doc = insertElement(doc, section.id, createElement(reg, "input", { name: "email" }));
  return { reg, doc };
}

describe("compileMjml", () => {
  it("emits MJML from the same Document Model", () => {
    const { reg, doc } = buildDoc();
    const mjml = compileMjml(doc, { registry: reg, theme: defaultTheme });
    expect(mjml).toContain("<mjml>");
    expect(mjml).toContain("<mj-body");
    expect(mjml).toContain("<mj-section");
    expect(mjml).toContain("<mj-text");
    expect(mjml).toContain("<mj-button");
    // 2 columns requested -> 2 mj-column.
    expect(mjml.match(/<mj-column>/g)?.length).toBe(2);
  });

  it("excludes Elements with no mjml render (email Capability Profile)", () => {
    const { reg, doc } = buildDoc();
    const mjml = compileMjml(doc, { registry: reg, theme: defaultTheme });
    expect(mjml).not.toContain("<input");
    expect(mjml).toContain("excluded from email: input");
  });
});
