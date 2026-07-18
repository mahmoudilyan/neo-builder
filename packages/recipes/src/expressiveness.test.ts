import { describe, it, expect } from "vitest";
import { compileHtml } from "@neo-builder/compiler-html";
import { registryFor } from "@neo-builder/elements";
import { ratioToGrid, resolveBackground, defaultTheme } from "@neo-builder/theme";
import { applyConcept } from "./index.js";
import type { ContentBrief } from "./types.js";

const brief: ContentBrief = {
  mood: "bold",
  recipe: "split-hero",
  headline: "Validate at the trust boundary.",
  subhead: "API responses, forms, env vars — stop guessing.",
  cta: { label: "Get started", href: "#" },
  features: [
    { title: "14x faster", body: "String parsing up to 14x faster." },
    { title: "Inference first", body: "The type comes free." },
  ],
  stat: "31M downloads / week",
};

describe("theme helpers", () => {
  it("parses ratios and rejects junk", () => {
    expect(ratioToGrid("2:1")).toBe("2fr 1fr");
    expect(ratioToGrid("1:2:1")).toBe("1fr 2fr 1fr");
    expect(ratioToGrid("banana")).toBeNull();
    expect(ratioToGrid(undefined)).toBeNull();
  });

  it("resolves gradient, image+overlay, none and token backgrounds", () => {
    const t = defaultTheme.tokens;
    expect(resolveBackground(t, "gradient:accent").css["background-image"]).toContain("linear-gradient");
    expect(resolveBackground(t, "gradient:accent").fallback).toBe(t.colors.primary);
    const img = resolveBackground(t, "image:https://x.test/a.jpg", 0.5);
    expect(img.css["background-image"]).toContain("rgba(0,0,0,0.5)");
    expect(img.css["background-size"]).toBe("cover");
    expect(resolveBackground(t, "none").css).toEqual({});
    expect(resolveBackground(t, "#1a1a2e").css["background-color"]).toBe("#1a1a2e");
    expect(resolveBackground(t, "rgb(20,20,40)").fallback).toBe("rgb(20,20,40)");
    expect(resolveBackground(t, "linear-gradient(90deg,#000,#333)").css["background-image"]).toContain("90deg");
    expect(resolveBackground(t, "surface").css["background-color"]).toBe(t.colors.surface);
  });
});

describe("recipe → mood → compiled HTML uses the expressive tokens", () => {
  it("bold split-hero renders gradient bg, ratio grid, display type and CTA shadow", () => {
    const reg = registryFor("page");
    const { doc, theme } = applyConcept(brief, reg, defaultTheme);
    const html = compileHtml(doc, { registry: reg, theme, fullDocument: false });

    expect(html).toContain("background-image:linear-gradient"); // gradient hero
    expect(html).toContain("grid-template-columns:2fr 1fr"); // ratio
    expect(html).toContain("min-height:420px"); // hero commands the viewport
    expect(html).toContain("font-size:80px"); // bold mood 3xl headline
    expect(html).toContain("box-shadow"); // solid CTA carries mood shadow
    expect(html).toContain("letter-spacing:-0.035em"); // tight display tracking
  });
});
