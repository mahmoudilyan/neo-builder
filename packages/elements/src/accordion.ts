import { defineElement } from "@neo-builder/core";
import { tokens, escapeHtml } from "./util.js";

interface QA {
  q: string;
  a: string;
}

function parse(node: { props: Record<string, unknown> }): QA[] {
  return String(node.props.items ?? "")
    .split("\n")
    .map((line) => {
      const [q, ...rest] = line.split("|");
      return { q: (q ?? "").trim(), a: rest.join("|").trim() };
    })
    .filter((x) => x.q);
}

/** An FAQ accordion (native <details>, no JS). Page-only. */
export const accordion = defineElement({
  type: "accordion",
  label: "FAQ",
  icon: "▾",
  category: "Content",
  version: 1,
  schema: {
    props: {
      items: "one 'Question | Answer' per line",
    },
  },
  aiMeta: {
    description:
      "An FAQ accordion. Each line of `items` is 'Question | Answer'; renders as native expandable rows (no JS). Landing pages only.",
    props: {
      items: "One entry per line, question and answer separated by '|'.",
    },
  },
  defaults: () => ({
    items:
      "Is there a free plan? | Yes — build and publish one page free.\nCan I export the code? | Every page exports clean HTML.",
  }),
  render: {
    html: (node, ctx) => {
      const t = tokens(ctx);
      const rows = parse(node)
        .map(
          (x) =>
            `<details style="border-bottom:1px solid ${t.colors.border};padding:${t.spacing[3]}px 0">` +
            `<summary style="cursor:pointer;font-family:${t.fonts.body};font-weight:bold;` +
            `font-size:${t.fontSizes.base}px;color:${t.colors.text}">${escapeHtml(x.q)}</summary>` +
            `<p style="margin:${t.spacing[2]}px 0 0;font-family:${t.fonts.body};` +
            `font-size:${t.fontSizes.base}px;color:${t.colors.muted}">${escapeHtml(x.a)}</p></details>`,
        )
        .join("");
      return `<div>${rows}</div>`;
    },
  },
});
