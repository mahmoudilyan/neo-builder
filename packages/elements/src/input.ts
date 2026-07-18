import { defineElement } from "@neo-builder/core";
import { tokens, style, escapeAttr } from "./util.js";

/**
 * A form input. Carries both an `html` render (for Landing pages) and a `form`
 * render (for the Form Compiler) — demonstrating per-target render functions
 * (ADR-0002). It has no `mjml` render, so email's Capability Profile excludes it.
 */
export const input = defineElement({
  type: "input",
  label: "Input",
  icon: "▭",
  category: "Interactive",
  states: ["focus", "hover"],
  version: 1,
  schema: {
    props: {
      name: "field name",
      label: "field label",
      inputType: "'text' | 'email' | 'number' | 'tel'",
      required: "boolean",
    },
  },
  aiMeta: {
    description: "A labelled form field. Used in Forms and on Landing pages; not in Email.",
    props: {
      name: "Submitted field key.",
      label: "Visible label.",
      inputType: "HTML input type / validation hint.",
      required: "Whether the field must be filled.",
    },
  },
  defaults: () => ({ name: "field", label: "Field", inputType: "text", required: false }),
  render: {
    html: (node, ctx) => {
      const t = tokens(ctx);
      const labelStyle = style({
        display: "block",
        "font-family": t.fonts.body,
        "font-size": `${t.fontSizes.sm}px`,
        color: t.colors.text,
        "margin-bottom": `${t.spacing[1]}px`,
      });
      const inputStyle = style({
        display: "block",
        width: "100%",
        padding: `${t.spacing[2]}px`,
        "font-size": `${t.fontSizes.base}px`,
        border: `1px solid ${t.colors.border}`,
        "border-radius": `${t.radii.sm}px`,
      });
      const name = escapeAttr(node.props.name ?? "field");
      const req = node.props.required ? " required" : "";
      return (
        `<label${labelStyle} for="${name}">${escapeAttr(node.props.label)}</label>` +
        `<input id="${name}" name="${name}" type="${escapeAttr(
          node.props.inputType ?? "text",
        )}"${req}${inputStyle} />`
      );
    },
    form: (node) =>
      JSON.stringify({
        name: node.props.name,
        label: node.props.label,
        type: node.props.inputType ?? "text",
        required: Boolean(node.props.required),
      }),
  },
});
