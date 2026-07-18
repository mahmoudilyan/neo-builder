import { defineElement } from "@neo-builder/core";
import { tokens, escapeHtml, escapeAttr } from "./util.js";

function links(node: { props: Record<string, unknown> }): { label: string; href: string }[] {
  return String(node.props.links ?? "")
    .split("\n")
    .map((line) => {
      const [label, href] = line.split("|");
      return { label: (label ?? "").trim(), href: (href ?? "#").trim() || "#" };
    })
    .filter((x) => x.label);
}

/** A page header: brand, nav links, and an optional CTA. Page-only. */
export const navbar = defineElement({
  type: "navbar",
  label: "Navbar",
  icon: "☰",
  category: "Layout",
  version: 1,
  schema: {
    props: {
      brand: "brand / logo text",
      links: "one 'Label | href' per line",
      ctaLabel: "optional call-to-action button text",
      ctaHref: "CTA destination URL",
    },
  },
  aiMeta: {
    description:
      "A page navigation header with brand text, links, and an optional CTA button. Use once at the top of a landing page.",
    props: {
      brand: "Short brand name shown on the left.",
      links: "One nav link per line, label and href separated by '|'.",
      ctaLabel: "If set, renders a primary button on the right.",
      ctaHref: "Where the CTA points.",
    },
  },
  defaults: () => ({
    brand: "Acme",
    links: "Features | #features\nPricing | #pricing\nFAQ | #faq",
    ctaLabel: "Get started",
    ctaHref: "#",
  }),
  render: {
    html: (node, ctx) => {
      const t = tokens(ctx);
      const nav = links(node)
        .map(
          (l) =>
            `<a href="${escapeAttr(l.href)}" style="color:${t.colors.muted};text-decoration:none;` +
            `font-size:${t.fontSizes.sm}px">${escapeHtml(l.label)}</a>`,
        )
        .join("");
      const cta = String(node.props.ctaLabel ?? "").trim()
        ? `<a href="${escapeAttr(node.props.ctaHref ?? "#")}" style="background-color:${t.colors.primary};` +
          `color:${t.colors.primaryText};text-decoration:none;padding:${t.spacing[2]}px ${t.spacing[4]}px;` +
          `border-radius:${t.radii.md}px;font-size:${t.fontSizes.sm}px">${escapeHtml(node.props.ctaLabel)}</a>`
        : "";
      return (
        `<header style="display:flex;align-items:center;gap:${t.spacing[5]}px;` +
        `font-family:${t.fonts.body};padding:${t.spacing[3]}px 0">` +
        `<strong style="font-size:${t.fontSizes.lg}px;color:${t.colors.text}">${escapeHtml(node.props.brand)}</strong>` +
        `<nav style="display:flex;gap:${t.spacing[4]}px;margin-left:auto;align-items:center">${nav}${cta}</nav></header>`
      );
    },
  },
});
