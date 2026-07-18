import { createDocument, createElement, insertElement, type Document, type Registry } from "@neo-builder/core";
import type { ContentBrief, RecipeId } from "./types.js";

/** Add a feature as its own 1-column sub-section (title + body grouped). */
function addFeatureColumn(doc: Document, reg: Registry, parentId: string, title: string, body: string, pad = 3): Document {
  const col = createElement(reg, "section", { columns: 1, padding: pad, background: "none" });
  doc = insertElement(doc, parentId, col);
  doc = insertElement(doc, col.id, createElement(reg, "text", { content: title, as: "h3" }));
  doc = insertElement(doc, col.id, createElement(reg, "text", { content: body, as: "p", color: "muted" }));
  return doc;
}

function addFeatures(doc: Document, reg: Registry, brief: ContentBrief, columns: number, pad: number): Document {
  if (!brief.features.length) return doc;
  const wrap = createElement(reg, "section", {
    columns: Math.min(columns, Math.max(brief.features.length, 1)),
    padding: pad,
    width: "wide",
  });
  doc = insertElement(doc, doc.root.id, wrap);
  for (const f of brief.features) doc = addFeatureColumn(doc, reg, wrap.id, f.title, f.body);
  return doc;
}

/** Each Layout Recipe is a deterministic, art-directed brief → Document builder. */
export const RECIPES: Record<RecipeId, (brief: ContentBrief, reg: Registry) => Document> = {
  // Centered, generous hero on a gradient; features in a 3-up row. Calm + classic.
  "centered-stack": (brief, reg) => {
    let doc = createDocument("temp");
    const hero = createElement(reg, "section", {
      columns: 1, background: "gradient:hero", padding: 8, minHeight: 460,
    });
    doc = insertElement(doc, doc.root.id, hero);
    doc = insertElement(doc, hero.id, createElement(reg, "text", { content: brief.headline, as: "h1", size: "3xl", align: "center", maxWidth: "18em" }));
    doc = insertElement(doc, hero.id, createElement(reg, "text", { content: brief.subhead, as: "p", size: "lg", color: "muted", align: "center", maxWidth: "36em" }));
    doc = insertElement(doc, hero.id, createElement(reg, "button", { label: brief.cta.label, href: brief.cta.href ?? "#", size: "lg" }));
    if (brief.stat) doc = insertElement(doc, hero.id, createElement(reg, "text", { content: brief.stat, as: "h3", color: "primary", align: "center" }));
    return addFeatures(doc, reg, brief, 3, 7);
  },

  // Ratio hero (pitch wide, stat narrow); features in a 2-up grid. Asymmetric.
  "split-hero": (brief, reg) => {
    let doc = createDocument("temp");
    const hero = createElement(reg, "section", {
      columns: 2, ratio: "2:1", background: "gradient:hero", padding: 8, minHeight: 420, width: "wide",
    });
    doc = insertElement(doc, doc.root.id, hero);
    const pitch = createElement(reg, "section", { columns: 1, padding: 0, background: "none" });
    doc = insertElement(doc, hero.id, pitch);
    doc = insertElement(doc, pitch.id, createElement(reg, "text", { content: brief.headline, as: "h1", size: "3xl", align: "left" }));
    doc = insertElement(doc, pitch.id, createElement(reg, "text", { content: brief.subhead, as: "p", size: "lg", color: "muted", align: "left", maxWidth: "30em" }));
    doc = insertElement(doc, pitch.id, createElement(reg, "button", { label: brief.cta.label, href: brief.cta.href ?? "#", size: "lg" }));
    const accent = createElement(reg, "section", { columns: 1, padding: 4, background: "none" });
    doc = insertElement(doc, hero.id, accent);
    doc = insertElement(doc, accent.id, createElement(reg, "text", { content: brief.stat ?? brief.features[0]?.title ?? "", as: "h2", size: "4xl", color: "primary", align: "left" }));
    return addFeatures(doc, reg, brief, 2, 7);
  },

  // Left-aligned hero, oversized display type; features in a 2-up offset grid.
  "offset-grid": (brief, reg) => {
    let doc = createDocument("temp");
    const hero = createElement(reg, "section", { columns: 1, background: "bg", padding: 8, minHeight: 420, width: "wide" });
    doc = insertElement(doc, doc.root.id, hero);
    doc = insertElement(doc, hero.id, createElement(reg, "text", { content: brief.headline, as: "h1", size: "4xl", align: "left", maxWidth: "14em" }));
    doc = insertElement(doc, hero.id, createElement(reg, "text", { content: brief.subhead, as: "p", size: "lg", color: "muted", align: "left", maxWidth: "34em" }));
    if (brief.stat) doc = insertElement(doc, hero.id, createElement(reg, "text", { content: brief.stat, as: "h3", color: "primary", align: "left" }));
    doc = insertElement(doc, hero.id, createElement(reg, "button", { label: brief.cta.label, href: brief.cta.href ?? "#", size: "lg" }));
    return addFeatures(doc, reg, brief, 2, 6);
  },

  // Centered hero, then each feature as a full-width row with alternating bg.
  "feature-rows": (brief, reg) => {
    let doc = createDocument("temp");
    const hero = createElement(reg, "section", { columns: 1, background: "gradient:hero", padding: 8, minHeight: 420 });
    doc = insertElement(doc, doc.root.id, hero);
    doc = insertElement(doc, hero.id, createElement(reg, "text", { content: brief.headline, as: "h1", size: "3xl", align: "center", maxWidth: "18em" }));
    doc = insertElement(doc, hero.id, createElement(reg, "text", { content: brief.subhead, as: "p", size: "lg", color: "muted", align: "center", maxWidth: "36em" }));
    doc = insertElement(doc, hero.id, createElement(reg, "button", { label: brief.cta.label, href: brief.cta.href ?? "#", size: "lg" }));
    brief.features.forEach((f, i) => {
      const row = createElement(reg, "section", { columns: 1, padding: 6, background: i % 2 === 0 ? "bg" : "surface" });
      doc = insertElement(doc, doc.root.id, row);
      doc = insertElement(doc, row.id, createElement(reg, "text", { content: f.title, as: "h2", align: "center" }));
      doc = insertElement(doc, row.id, createElement(reg, "text", { content: f.body, as: "p", color: "muted", align: "center", maxWidth: "38em" }));
    });
    return doc;
  },
};

export const RECIPE_CATALOG: { id: RecipeId; description: string }[] = [
  { id: "centered-stack", description: "Centered gradient hero, calm and classic; features in a 3-up row." },
  { id: "split-hero", description: "Asymmetric 2:1 hero (pitch + oversized stat); features in a 2-up grid." },
  { id: "offset-grid", description: "Left-aligned display-type hero; features in a 2-up offset grid." },
  { id: "feature-rows", description: "Centered gradient hero, then each feature as a full-width alternating row." },
];
