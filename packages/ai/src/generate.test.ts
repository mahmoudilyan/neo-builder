import { describe, it, expect } from "vitest";
import { Registry, defineElement, walk } from "@neo-builder/core";
import { parseGeneratedDocument } from "./generate.js";

const theme = { id: "default", tokens: { colors: { bg: "#fff", primary: "#000" } } };

function reg() {
  return new Registry()
    .register(
      defineElement({
        type: "section",
        version: 1,
        schema: { props: { columns: "n" }, allowedChildren: "*" },
        aiMeta: { description: "band" },
        defaults: () => ({ columns: 1 }),
        render: { html: () => "" },
      }),
    )
    .register(
      defineElement({
        type: "text",
        version: 1,
        schema: { props: { content: "s" } },
        aiMeta: { description: "text" },
        defaults: () => ({ content: "" }),
        render: { html: () => "" },
      }),
    );
}

describe("parseGeneratedDocument (no-slop validation)", () => {
  it("builds a Document from valid generated JSON", () => {
    const r = reg();
    const doc = parseGeneratedDocument(
      { sections: [{ type: "section", props: { columns: 2 }, children: [{ type: "text", props: { content: "Hi" } }] }] },
      r,
      theme,
    );
    const types = [...walk(doc)].map((n) => n.type);
    expect(types).toEqual(["root", "section", "text"]);
    const text = [...walk(doc)].find((n) => n.type === "text");
    expect(text?.props.content).toBe("Hi");
    expect(text?.id).toBeTruthy(); // ids assigned
  });

  it("drops unknown element types and props not in schema", () => {
    const r = reg();
    const doc = parseGeneratedDocument(
      {
        sections: [
          { type: "section", props: { columns: 1, evil: "x" }, children: [{ type: "marquee", props: {} }] },
        ],
      },
      r,
      theme,
    );
    const section = doc.root.children[0]!;
    expect(section.children).toHaveLength(0); // unknown "marquee" dropped
    expect("evil" in section.props).toBe(false); // off-schema prop dropped
  });
});

describe("extractJson robustness", () => {
  it("stops at the first balanced object when prose or a second object follows", async () => {
    const { extractJson } = await import("./generate.js");
    const out = extractJson(
      `{"steps":[{"command":"insert","args":["id1","section",{"columns":1}]}]}\n\nI added a section as requested. {"note":"extra"}`,
    ) as { steps: unknown[] };
    expect(out.steps).toHaveLength(1);
  });

  it("handles braces and escapes inside strings", async () => {
    const { extractJson } = await import("./generate.js");
    const out = extractJson(`{"a":"curly } and quote \\" inside"} trailing`) as { a: string };
    expect(out.a).toContain("curly }");
  });

  it("still reports truncated output clearly", async () => {
    const { extractJson } = await import("./generate.js");
    expect(() => extractJson(`{"steps":[{"command":"insert"`)).toThrow(/Could not parse/);
  });
});
