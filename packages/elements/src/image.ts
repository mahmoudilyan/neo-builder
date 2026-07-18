import { defineElement } from "@neo-builder/core";
import { style, escapeAttr } from "./util.js";

/** A responsive image. */
export const image = defineElement({
  type: "image",
  label: "Image",
  icon: "▣",
  category: "Media",
  states: ["hover"],
  version: 1,
  schema: {
    props: {
      src: "image URL (from the Asset Library)",
      alt: "alternative text",
      width: "width, e.g. '100%' or '320px'",
    },
  },
  aiMeta: {
    description: "An image, typically sourced from the Asset Library. Resizable.",
    props: {
      src: "Image URL.",
      alt: "Accessibility/alt text; also used as AI context.",
      width: "CSS width — drag the corner handle on the canvas to resize.",
    },
  },
  defaults: () => ({ src: "", alt: "", width: "100%" }),
  render: {
    html: (node) => {
      const s = style({ width: String(node.props.width ?? "100%"), "max-width": "100%", height: "auto", display: "block" });
      return `<img src="${escapeAttr(node.props.src ?? "")}" alt="${escapeAttr(
        node.props.alt ?? "",
      )}"${s} />`;
    },
    mjml: (node) =>
      `<mj-image src="${escapeAttr(node.props.src ?? "")}" alt="${escapeAttr(node.props.alt ?? "")}" />`,
  },
});
