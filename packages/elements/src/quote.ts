import { defineElement } from "@neo-builder/core";
import { tokens, escapeHtml, escapeAttr } from "./util.js";

/** A testimonial / pull quote with attribution. Works on web and email. */
export const quote = defineElement({
  type: "quote",
  label: "Quote",
  icon: "❝",
  category: "Content",
  version: 1,
  schema: {
    props: {
      text: "the quoted sentence(s)",
      author: "who said it",
      role: "author role / company",
      avatar: "optional avatar image URL",
    },
  },
  aiMeta: {
    description:
      "A testimonial or pull quote with author attribution. Social proof — a prime landing-page Element.",
    props: {
      text: "The quote body, without surrounding quote marks (they are rendered).",
      author: "Person's name.",
      role: "Short role line, e.g. 'CTO, Acme'.",
      avatar: "Optional https image URL, rendered as a small circle.",
    },
  },
  defaults: () => ({
    text: "We shipped our launch page in an afternoon — and it keeps improving itself.",
    author: "Jordan Lee",
    role: "Founder, Northwind",
    avatar: "",
  }),
  render: {
    html: (node, ctx) => {
      const t = tokens(ctx);
      const avatar = String(node.props.avatar ?? "").trim();
      const img = /^https?:\/\//i.test(avatar)
        ? `<img src="${escapeAttr(avatar)}" alt="" style="width:40px;height:40px;border-radius:50%;object-fit:cover" />`
        : "";
      return (
        `<figure style="margin:0;padding:${t.spacing[5]}px;border:1px solid ${t.colors.border};` +
        `background-color:${t.colors.surface};border-radius:${t.radii.lg}px">` +
        `<div aria-hidden="true" style="font-family:${t.fonts.heading};font-size:${t.fontSizes["2xl"]}px;` +
        `line-height:1;color:${t.colors.primary}">&ldquo;</div>` +
        `<blockquote style="margin:0;font-family:${t.fonts.heading};font-size:${t.fontSizes.lg}px;` +
        `color:${t.colors.text};font-style:italic">${escapeHtml(node.props.text)}</blockquote>` +
        `<figcaption style="display:flex;align-items:center;gap:${t.spacing[2]}px;margin-top:${t.spacing[3]}px;` +
        `font-family:${t.fonts.body};font-size:${t.fontSizes.sm}px;color:${t.colors.muted}">${img}` +
        `<span><strong style="color:${t.colors.text}">${escapeHtml(node.props.author)}</strong>` +
        `${node.props.role ? " · " + escapeHtml(node.props.role) : ""}</span></figcaption></figure>`
      );
    },
    mjml: (node, ctx) => {
      const t = tokens(ctx);
      return (
        `<mj-text font-family="${t.fonts.heading}" font-size="${t.fontSizes.lg}px" ` +
        `color="${t.colors.text}" font-style="italic">&ldquo;${escapeHtml(node.props.text)}&rdquo;</mj-text>` +
        `<mj-text font-family="${t.fonts.body}" font-size="${t.fontSizes.sm}px" color="${t.colors.muted}">` +
        `<strong>${escapeHtml(node.props.author)}</strong>` +
        `${node.props.role ? " · " + escapeHtml(node.props.role) : ""}</mj-text>`
      );
    },
  },
});
