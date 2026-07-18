import type { Breakpoint, ElementNode } from "./types.js";

/** Ordered breakpoints, mobile-first. */
export const BREAKPOINTS: Breakpoint[] = ["base", "sm", "md", "lg"];

/** Min-width (px) each breakpoint activates at. `base` is always active. */
export const BREAKPOINT_MIN_WIDTH: Record<Breakpoint, number> = {
  base: 0,
  sm: 480,
  md: 768,
  lg: 1024,
};

/**
 * Resolve an Element's effective props at `breakpoint`, merging base props with
 * every breakpoint override up to and including the active one (mobile-first).
 */
export function resolveProps(
  node: ElementNode,
  breakpoint: Breakpoint = "base",
): Record<string, unknown> {
  let props = { ...node.props };
  if (!node.responsive) return props;
  const active = BREAKPOINTS.indexOf(breakpoint);
  for (let i = 1; i <= active; i++) {
    const bp = BREAKPOINTS[i]!;
    const override = node.responsive[bp];
    if (override) props = { ...props, ...override };
  }
  return props;
}
