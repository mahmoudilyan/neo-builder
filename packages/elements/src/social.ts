import { defineElement } from "@neo-builder/core";
import { tokens, escapeAttr } from "./util.js";
import { svgIcon } from "./icons.js";

const PLATFORMS = ["github", "twitter", "linkedin", "globe", "mail"] as const;

/** A row of social / contact links rendered as icons. */
export const social = defineElement({
  type: "social",
  label: "Social Links",
  icon: "@",
  category: "Media",
  version: 1,
  schema: {
    props: {
      github: "GitHub URL",
      twitter: "X/Twitter URL",
      linkedin: "LinkedIn URL",
      globe: "website URL",
      mail: "mailto: or email",
      size: "icon size px",
    },
  },
  aiMeta: {
    description: "A row of social/contact links shown as icons. Empty fields are hidden.",
    props: { github: "URL.", twitter: "URL.", linkedin: "URL.", globe: "Website URL.", mail: "Email." },
  },
  defaults: () => ({ github: "", twitter: "", linkedin: "", globe: "", mail: "", size: 22 }),
  render: {
    html: (node, ctx) => {
      const t = tokens(ctx);
      const size = Number(node.props.size ?? 22);
      const links = PLATFORMS.map((p) => {
        const raw = String(node.props[p] ?? "").trim();
        if (!raw) return "";
        const href = p === "mail" && !raw.startsWith("mailto:") ? `mailto:${raw}` : raw;
        return (
          `<a href="${escapeAttr(href)}" style="color:${t.colors.text};display:inline-flex" ` +
          `aria-label="${p}">${svgIcon(p, size, t.colors.text)}</a>`
        );
      }).join("");
      return `<div style="display:flex;gap:${t.spacing[3]}px;align-items:center">${links}</div>`;
    },
  },
});
