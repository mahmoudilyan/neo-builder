import { describe, it, expect } from "vitest";
import { Registry, defineElement } from "@neo-builder/core";
import {
  parseElementHtml,
  parseDialectFragment,
  parseDialectTheme,
  extractDialect,
  buildDialectVocabulary,
  generatePageHtml,
} from "./dialect.js";
import type { Provider } from "./provider.js";

const theme = { id: "default", tokens: {} };

function makeRegistry() {
  return new Registry()
    .register(
      defineElement({
        type: "section",
        version: 1,
        schema: {
          props: { columns: "number", background: "token", minHeight: "px number", padding: "step" },
          allowedChildren: "*",
        },
        aiMeta: { description: "layout band" },
        defaults: () => ({ columns: 1 }),
        render: { html: () => "<section/>" },
      }),
    )
    .register(
      defineElement({
        type: "text",
        version: 1,
        schema: { props: { content: "inline html", as: "p|h1|h2|h3", size: "scale", maxWidth: "css width" } },
        aiMeta: { description: "text block" },
        defaults: () => ({ content: "Text", as: "p" }),
        render: { html: (n) => `<p>${String(n.props.content)}</p>` },
      }),
    )
    .register(
      defineElement({
        type: "image",
        version: 1,
        schema: { props: { src: "url", alt: "alt text" } },
        aiMeta: { description: "image" },
        render: { html: () => "<img/>" },
      }),
    );
}

describe("parseElementHtml", () => {
  it("parses nested dialect: tags → types, kebab attrs → camel props, inner html → content", () => {
    const reg = makeRegistry();
    const doc = parseElementHtml(
      `<section columns="2" background="gradient:hero" min-height="460">
         <text as="h1" size="3xl" max-width="18em">Ship <b>faster</b></text>
         <image src="https://x.test/a.png" alt="product" />
       </section>
       <section padding="7">
         <text>Second band</text>
       </section>`,
      reg,
      theme,
    );
    expect(doc.root.children).toHaveLength(2);
    const hero = doc.root.children[0];
    expect(hero.props).toMatchObject({ columns: 2, background: "gradient:hero", minHeight: 460 });
    expect(hero.children.map((c) => c.type)).toEqual(["text", "image"]);
    expect(hero.children[0].props).toMatchObject({ as: "h1", size: "3xl", maxWidth: "18em", content: "Ship <b>faster</b>" });
    expect(hero.children[0].id).toBeTruthy();
  });

  it("drops unknown tags with their subtree and unknown props; survives fences and <page>", () => {
    const reg = makeRegistry();
    const doc = parseElementHtml(
      "```html\n<page><section columns=\"1\" style=\"color:red\" bogus-prop=\"x\">" +
        `<marquee><text>smuggled</text></marquee><text>kept</text></section></page>\n\`\`\``,
      reg,
      theme,
    );
    const section = doc.root.children[0];
    expect(section.props).not.toHaveProperty("style");
    expect(section.props).not.toHaveProperty("bogusProp");
    expect(section.children).toHaveLength(1);
    expect(String(section.children[0].props.content)).toBe("kept");
  });

  it("handles nested same-tag containers and unclosed (truncated) tags", () => {
    const reg = makeRegistry();
    const nodes = parseDialectFragment(
      `<section columns="1"><section columns="3"><text>inner</text></section></section><section columns="2"><text>lost`,
      reg,
    );
    expect(nodes).toHaveLength(1); // the truncated trailing section is dropped whole
    expect(nodes[0].children[0].type).toBe("section");
    expect(nodes[0].children[0].children[0].props.content).toBe("inner");
  });

  it("extractDialect strips comments/doctype and unwraps page", () => {
    expect(extractDialect("<!doctype html><!-- hi --><page><section /></page>")).toBe("<section />");
  });
});

describe("buildDialectVocabulary", () => {
  it("derives tag shapes from the registry (kebab-case attrs, content leaves, self-closing)", () => {
    const v = buildDialectVocabulary(makeRegistry());
    expect(v).toContain('min-height="px number"');
    expect(v).toContain("<text ");
    expect(v).toContain("inline rich text</text>");
    expect(v).toContain('<image src="url" alt="alt text" />');
  });
});

describe("generatePageHtml", () => {
  it("round-trips a mock provider's markup into a validated Document", async () => {
    const provider: Provider = {
      name: "fake",
      async generate() {
        return (
          `<theme primary="#0e7490" bg="#f8fdfe" gradient-hero="linear-gradient(160deg,#e8f6f9,#f8fdfe)" radius="pill" />` +
          `<section columns="1" background="gradient:hero"><text as="h1">Hello</text></section>`
        );
      },
    };
    const base = { id: "default", tokens: { colors: { bg: "#fff", surface: "#eee", text: "#111", muted: "#777", primary: "#00f", primaryText: "#fff", border: "#ddd" }, fonts: { body: "Arial", heading: "Georgia" }, gradients: { hero: "", accent: "", subtle: "" }, radii: { sm: 4, md: 8, lg: 16, xl: 24, pill: 999 }, spacing: [0], fontSizes: {}, fontWeights: {}, lineHeights: {}, letterSpacing: {}, shadows: {} } };
    const { doc, theme: generated } = await generatePageHtml(provider, { registry: makeRegistry(), theme: base, prompt: "x" });
    expect(doc.root.children[0].children[0].props.content).toBe("Hello");
    const tokens = generated.tokens as { colors: { primary: string; text: string }; gradients: { hero: string }; radii: { md: number } };
    expect(generated.id).toBe("generated");
    expect(tokens.colors.primary).toBe("#0e7490"); // model-authored
    expect(tokens.colors.text).toBe("#111"); // unset key keeps base
    expect(tokens.gradients.hero).toContain("160deg");
    expect(tokens.radii.md).toBe(20); // "pill" preset
  });

  it("parseDialectTheme rejects junk values and keeps the base without a theme tag", () => {
    const base = { id: "default", tokens: { colors: { bg: "#fff", surface: "#eee", text: "#111", muted: "#777", primary: "#00f", primaryText: "#fff", border: "#ddd" }, fonts: { body: "Arial", heading: "Georgia" }, gradients: { hero: "g1", accent: "", subtle: "" }, radii: { sm: 4, md: 8, lg: 16, xl: 24, pill: 999 } } };
    expect(parseDialectTheme("<section />", base)).toBe(base);
    const t = parseDialectTheme(`<theme primary="not-a-color" gradient-hero="also junk" radius="wat" />`, base);
    const tokens = t.tokens as { colors: { primary: string }; gradients: { hero: string }; radii: { md: number } };
    expect(tokens.colors.primary).toBe("#00f");
    expect(tokens.gradients.hero).toBe("g1");
    expect(tokens.radii.md).toBe(8);
  });
});
