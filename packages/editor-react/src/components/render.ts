import {
  type Breakpoint,
  type ElementNode,
  type RenderContext,
  type Registry,
  type ThemeLike,
  resolveProps,
} from "@neo-builder/core";

/**
 * Render a single Element to HTML for the canvas, using its own `render.html`
 * (the same function the Compiler uses — WYSIWYG). Props are resolved for the
 * active breakpoint so responsive overrides show live.
 */
export function renderLeafHtml(
  registry: Registry,
  theme: ThemeLike,
  node: ElementNode,
  breakpoint: Breakpoint,
): string {
  const def = registry.get(node.type);
  const render = def?.render.html;
  if (!render) return `<span style="color:#b00">[no preview: ${node.type}]</span>`;
  const resolved: ElementNode = { ...node, props: resolveProps(node, breakpoint) };
  const ctx: RenderContext = {
    target: "html",
    theme,
    renderChildren: () => "",
    renderNode: () => "",
  };
  return render(resolved, ctx);
}
