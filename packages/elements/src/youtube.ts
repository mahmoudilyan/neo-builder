import { defineElement } from "@neo-builder/core";
import { escapeAttr } from "./util.js";

/** Extract a YouTube video id from a url or raw id. */
function youtubeId(input: string): string {
  const m = input.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/);
  return m ? m[1]! : input.trim();
}

/** An embedded YouTube video (responsive 16:9). Web only — not email/form. */
export const youtube = defineElement({
  type: "youtube",
  label: "YouTube",
  icon: "▶",
  category: "Media",
  version: 1,
  schema: { props: { url: "YouTube URL or video id" } },
  aiMeta: {
    description: "An embedded YouTube video, responsive 16:9. Web pages only.",
    props: { url: "Full YouTube URL or just the video id." },
  },
  defaults: () => ({ url: "dQw4w9WgXcQ" }),
  render: {
    html: (node) => {
      const id = youtubeId(String(node.props.url ?? ""));
      return (
        `<div style="position:relative;width:100%;padding-top:56.25%">` +
        `<iframe src="https://www.youtube.com/embed/${escapeAttr(id)}" ` +
        `style="position:absolute;inset:0;width:100%;height:100%;border:0" ` +
        `allowfullscreen title="YouTube video"></iframe></div>`
      );
    },
  },
});
