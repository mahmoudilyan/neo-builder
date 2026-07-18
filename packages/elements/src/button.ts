import { defineElement } from "@neo-builder/core";
import { tokens, style, escapeHtml, escapeAttr } from "./util.js";

/** A call-to-action link styled as a button. */
export const button = defineElement({
  type: "button",
  label: "Button",
  icon: "⬢",
  category: "Interactive",
  states: ["hover", "active", "focus"],
  version: 1,
  schema: {
    props: {
      label: "button text",
      href: "destination URL",
      variant: "'solid' | 'outline' | 'ghost'",
      size: "'sm' | 'md' | 'lg'",
      rounded: "'sm' | 'md' | 'lg' | 'pill'",
    },
  },
  aiMeta: {
    description: "A call-to-action button (rendered as a styled link). Drives conversions.",
    props: {
      label: "The CTA text — a prime target for the regeneration loop.",
      href: "Where the button points.",
      variant:
        "'solid' = filled primary (the main CTA — use once per section), 'outline' = bordered secondary, 'ghost' = text-only tertiary.",
      size: "'lg' for hero CTAs, 'md' default, 'sm' for inline/nav.",
      rounded: "Corner radius token; 'pill' for fully rounded.",
    },
  },
  defaults: () => ({ label: "Click me", href: "#", variant: "solid", size: "md", rounded: "md" }),
  render: {
    html: (node, ctx) => {
      const t = tokens(ctx);
      const variant = String(node.props.variant ?? "solid");
      const size = String(node.props.size ?? "md");
      const roundedKey = String(node.props.rounded ?? "md");
      const sizes: Record<string, { font: number; padY: number; padX: number }> = {
        sm: { font: t.fontSizes.sm, padY: t.spacing[2] ?? 8, padX: t.spacing[4] ?? 16 },
        md: { font: t.fontSizes.base, padY: t.spacing[3] ?? 12, padX: t.spacing[5] ?? 24 },
        lg: { font: t.fontSizes.lg, padY: t.spacing[4] ?? 16, padX: t.spacing[6] ?? 32 },
      };
      const dim = sizes[size] ?? sizes.md!;
      const radius = (t.radii as Record<string, number>)[roundedKey] ?? t.radii.md;
      const variants: Record<string, Record<string, string | number | undefined>> = {
        solid: {
          "background-color": t.colors.primary,
          color: t.colors.primaryText,
          "box-shadow": t.shadows.md || undefined,
        },
        outline: {
          "background-color": "transparent",
          color: t.colors.primary,
          border: `2px solid ${t.colors.primary}`,
        },
        ghost: {
          "background-color": "transparent",
          color: t.colors.primary,
        },
      };
      const s = style({
        display: "inline-block",
        "font-family": t.fonts.body,
        "font-size": `${dim.font}px`,
        "font-weight": String(t.fontWeights.medium),
        "text-decoration": "none",
        padding: `${dim.padY}px ${dim.padX}px`,
        "border-radius": `${radius}px`,
        ...(variants[variant] ?? variants.solid),
      });
      return `<a href="${escapeAttr(node.props.href ?? "#")}"${s}>${escapeHtml(
        node.props.label,
      )}</a>`;
    },
    mjml: (node, ctx) => {
      const t = tokens(ctx);
      const variant = String(node.props.variant ?? "solid");
      const roundedKey = String(node.props.rounded ?? "md");
      const radius = (t.radii as Record<string, number>)[roundedKey] ?? t.radii.md;
      // Email floor: outline/ghost degrade to a bordered/plain look, no shadows.
      const bg = variant === "solid" ? t.colors.primary : "transparent";
      const color = variant === "solid" ? t.colors.primaryText : t.colors.primary;
      const border = variant === "outline" ? ` border="2px solid ${t.colors.primary}"` : "";
      return (
        `<mj-button href="${escapeAttr(node.props.href ?? "#")}" ` +
        `background-color="${bg}" color="${color}"${border} ` +
        `font-family="${t.fonts.body}" font-weight="${t.fontWeights.medium}" ` +
        `border-radius="${radius}px" align="left">` +
        `${escapeHtml(node.props.label)}</mj-button>`
      );
    },
    form: (node) => JSON.stringify({ kind: "submit", label: node.props.label }),
  },
});
