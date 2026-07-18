import { describe, it, expect } from "vitest";
import {
  Registry,
  defineElement,
  createDocument,
  createElement,
  insertElement,
} from "@neo-builder/core";
import { buildNodeContext, nodePath } from "./grab.js";

function makeFixture() {
  const registry = new Registry()
    .register(
      defineElement({
        type: "section",
        version: 1,
        schema: { props: { columns: "number" }, allowedChildren: "*" },
        aiMeta: { description: "layout container" },
        render: { html: () => "<section/>" },
      }),
    )
    .register(
      defineElement({
        type: "button",
        label: "Button",
        version: 1,
        schema: { props: { label: "string" } },
        aiMeta: { description: "call to action", props: { label: "short imperative text" } },
        defaults: () => ({ label: "Go" }),
        render: { html: (n) => `<a>${String(n.props.label)}</a>` },
      }),
    );
  let doc = createDocument("default");
  const section = createElement(registry, "section", { columns: 1 });
  doc = insertElement(doc, doc.root.id, section);
  const button = createElement(registry, "button", { label: "Buy now" });
  doc = insertElement(doc, section.id, button);
  return { registry, doc, section, button };
}

describe("nodePath", () => {
  it("walks root → target and returns null for unknown ids", () => {
    const { doc, section, button } = makeFixture();
    expect(nodePath(doc, button.id)).toBe(
      `root#${doc.root.id} > section#${section.id} > button#${button.id}`,
    );
    expect(nodePath(doc, "nope")).toBeNull();
  });
});

describe("buildNodeContext", () => {
  it("packages the node, its contract and the outline", () => {
    const { registry, doc, button } = makeFixture();
    const ctx = buildNodeContext({ doc, registry, id: button.id });
    expect(ctx).toBeTruthy();
    expect(ctx).toContain(`<grabbed-element id="${button.id}" type="button">`);
    expect(ctx).toContain(`props: {"label":"Buy now"}`);
    expect(ctx).toContain("Button — call to action");
    expect(ctx).toContain("label: short imperative text");
    expect(ctx).toContain(`${button.id}: button`); // outline row
    expect(ctx).toContain("</grabbed-element>");
  });

  it("lists children on containers and returns null for unknown ids", () => {
    const { registry, doc, section, button } = makeFixture();
    const ctx = buildNodeContext({ doc, registry, id: section.id });
    expect(ctx).toContain(`children: button#${button.id}`);
    expect(buildNodeContext({ doc, registry, id: "nope" })).toBeNull();
  });
});
