import { defineElement } from "@neo-builder/core";

/** Vertical empty space. Works on web and email. */
export const spacer = defineElement({
  type: "spacer",
  label: "Spacer",
  icon: "↕",
  category: "Layout",
  version: 1,
  schema: { props: { height: "height in px" } },
  aiMeta: { description: "Vertical empty space between Elements.", props: { height: "Pixels." } },
  defaults: () => ({ height: 32 }),
  render: {
    html: (node) => `<div style="height:${Number(node.props.height ?? 32)}px"></div>`,
    mjml: (node) => `<mj-spacer height="${Number(node.props.height ?? 32)}px" />`,
  },
});
