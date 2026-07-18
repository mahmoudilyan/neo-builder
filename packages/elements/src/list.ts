import { defineElement } from "@neo-builder/core";
import { tokens, escapeHtml } from "./util.js";

const MARKS: Record<string, string> = { check: "✓", dot: "•", arrow: "→", star: "★" };

function items(node: { props: Record<string, unknown> }): string[] {
  return String(node.props.items ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** A feature / benefit list with a marker per line. Works on web and email. */
export const list = defineElement({
  type: "list",
  label: "List",
  icon: "≣",
  category: "Content",
  version: 1,
  schema: {
    props: {
      items: "list items, one per line",
      marker: "'check' | 'dot' | 'arrow' | 'star'",
      align: "'left' | 'center'",
    },
  },
  aiMeta: {
    description:
      "A bulleted feature/benefit list. Each line of `items` becomes one entry with a marker.",
    props: {
      items: "Plain text, one item per line. Keep items short and parallel.",
      marker: "Visual marker style; 'check' suits benefits, 'arrow' suits steps.",
      align: "Horizontal alignment of the list block.",
    },
  },
  defaults: () => ({ items: "Fast setup\nNo code required\nAI keeps it fresh", marker: "check", align: "left" }),
  render: {
    html: (node, ctx) => {
      const t = tokens(ctx);
      const mark = MARKS[String(node.props.marker ?? "check")] ?? "✓";
      const center = String(node.props.align ?? "left") === "center";
      const rows = items(node)
        .map(
          (it) =>
            `<li style="display:flex;gap:${t.spacing[2]}px;align-items:baseline;margin:${t.spacing[1]}px 0${center ? ";justify-content:center" : ""}">` +
            `<span style="color:${t.colors.primary};font-weight:bold">${mark}</span>` +
            `<span>${escapeHtml(it)}</span></li>`,
        )
        .join("");
      return (
        `<ul style="list-style:none;margin:0;padding:0;font-family:${t.fonts.body};` +
        `font-size:${t.fontSizes.base}px;color:${t.colors.text}">${rows}</ul>`
      );
    },
    mjml: (node, ctx) => {
      const t = tokens(ctx);
      const mark = MARKS[String(node.props.marker ?? "check")] ?? "✓";
      const rows = items(node)
        .map((it) => `<span style="color:${t.colors.primary}">${mark}</span>&nbsp;&nbsp;${escapeHtml(it)}`)
        .join("<br/>");
      return (
        `<mj-text font-family="${t.fonts.body}" font-size="${t.fontSizes.base}px" ` +
        `color="${t.colors.text}" align="${String(node.props.align ?? "left")}">${rows}</mj-text>`
      );
    },
  },
});
