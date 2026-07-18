import { defineElement } from "@neo-builder/core";
import { escapeAttr } from "./util.js";

/** A self-hosted video file. Web only. */
export const video = defineElement({
  type: "video",
  label: "Video",
  icon: "🎞",
  category: "Media",
  version: 1,
  schema: {
    props: { src: "video file URL (mp4)", poster: "poster image URL", controls: "boolean" },
  },
  aiMeta: {
    description: "A self-hosted HTML5 video. Web pages only.",
    props: { src: "Video URL.", poster: "Preview image.", controls: "Show player controls." },
  },
  defaults: () => ({ src: "", poster: "", controls: true }),
  render: {
    html: (node) => {
      const poster = node.props.poster ? ` poster="${escapeAttr(node.props.poster)}"` : "";
      const controls = node.props.controls ? " controls" : "";
      return (
        `<video src="${escapeAttr(node.props.src ?? "")}"${poster}${controls} ` +
        `style="width:100%;height:auto;display:block;border-radius:8px"></video>`
      );
    },
  },
});
