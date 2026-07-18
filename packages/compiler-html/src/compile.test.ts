import { describe, it, expect } from "vitest";
import { Registry, createDocument, createElement, insertElement } from "@neo-builder/core";
import type { CapabilityProfile } from "@neo-builder/core";
import { registerBuiltins } from "@neo-builder/elements";
import { defaultTheme } from "@neo-builder/theme";
import { compileHtml } from "./index.js";

function buildDoc() {
  const reg = registerBuiltins(new Registry());
  let doc = createDocument(defaultTheme.id);
  const section = createElement(reg, "section", { columns: 1 });
  doc = insertElement(doc, doc.root.id, section);
  doc = insertElement(doc, section.id, createElement(reg, "text", { content: "Hello", as: "h1" }));
  doc = insertElement(doc, section.id, createElement(reg, "button", { label: "Buy", href: "/x" }));
  doc = insertElement(doc, section.id, createElement(reg, "input", { name: "email" }));
  return { reg, doc };
}

describe("compileHtml end-to-end", () => {
  it("compiles a Document Model to HTML through the registry", () => {
    const { reg, doc } = buildDoc();
    const html = compileHtml(doc, { registry: reg, theme: defaultTheme, title: "Demo" });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Hello");
    expect(html).toContain('href="/x"');
    expect(html).toContain('name="email"'); // input supported on html target
  });

  it("emits exclusive @media ranges for responsive overrides", () => {
    const reg = registerBuiltins(new Registry());
    let doc = createDocument(defaultTheme.id);
    const section = createElement(reg, "section", { columns: 1 });
    // 2 columns from md (768px) up.
    section.responsive = { md: { columns: 2 } };
    doc = insertElement(doc, doc.root.id, section);

    const html = compileHtml(doc, { registry: reg, theme: defaultTheme });
    expect(html).toContain("<style>");
    expect(html).toContain("@media (min-width:768px)");
    // base variant hidden above md, md variant shown at/above md.
    expect(html).toContain("(max-width:767px)");
    expect(html).toContain('class="r0-0"');
    expect(html).toContain('class="r0-1"');
  });

  it("adds no wrappers or styles for non-responsive documents", () => {
    const { reg, doc } = buildDoc();
    const html = compileHtml(doc, { registry: reg, theme: defaultTheme });
    expect(html).not.toContain("<style>");
    expect(html).not.toContain('class="r0-0"');
  });

  it("respects a Capability Profile that denies an Element type", () => {
    const { reg, doc } = buildDoc();
    const profile: CapabilityProfile = { target: "html", deny: ["input"] };
    const html = compileHtml(doc, { registry: reg, theme: defaultTheme, profile });
    expect(html).not.toContain('name="email"');
    expect(html).toContain("skipped unsupported element: input");
  });
});
