import { defineElement } from "@neo-builder/core";
import { escapeAttr } from "./util.js";

/** A generic iframe embed — maps, calendars, forms, anything embeddable. Web only. */
export const embed = defineElement({
  type: "embed",
  label: "Embed / Map",
  icon: "🗺",
  category: "Media",
  version: 1,
  schema: { props: { url: "embed URL (e.g. Google Maps embed)", height: "height in px" } },
  aiMeta: {
    description: "A generic iframe embed (maps, calendars, third-party widgets). Web only.",
    props: { url: "The embed URL.", height: "Frame height in px." },
  },
  defaults: () => ({ url: "https://www.openstreetmap.org/export/embed.html?bbox=-0.13,51.5,-0.10,51.52&layer=mapnik", height: 320 }),
  render: {
    html: (node) =>
      `<iframe src="${escapeAttr(node.props.url ?? "")}" ` +
      `style="width:100%;height:${Number(node.props.height ?? 320)}px;border:0;border-radius:8px" ` +
      `loading="lazy" title="Embed"></iframe>`,
  },
});
