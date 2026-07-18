import { describe, it, expect } from "vitest";
import { Registry, createDocument, createElement, insertElement } from "@neo-builder/core";
import { registerBuiltins } from "@neo-builder/elements";
import { defaultTheme } from "@neo-builder/theme";
import { compileForm } from "./index.js";

describe("compileForm", () => {
  it("collects form fields from the same Document Model", () => {
    const reg = registerBuiltins(new Registry());
    let doc = createDocument(defaultTheme.id);
    const section = createElement(reg, "section");
    doc = insertElement(doc, doc.root.id, section);
    doc = insertElement(doc, section.id, createElement(reg, "text", { content: "Sign up", as: "h2" }));
    doc = insertElement(doc, section.id, createElement(reg, "input", { name: "email", inputType: "email", required: true }));
    doc = insertElement(doc, section.id, createElement(reg, "button", { label: "Join" }));
    // image has no form render -> absent from the schema
    doc = insertElement(doc, section.id, createElement(reg, "image", { src: "/x.png" }));

    const schema = compileForm(doc, { registry: reg, theme: defaultTheme });
    const kinds = schema.fields.map((f) => f.kind);
    expect(kinds).toContain("static"); // text
    expect(kinds).toContain("submit"); // button
    const email = schema.fields.find((f) => f.name === "email");
    expect(email).toMatchObject({ type: "email", required: true });
    expect(schema.fields.some((f) => f.kind === "image")).toBe(false);
  });
});
