/**
 * Token-based Theme. Elements reference these tokens via semantic Style Props;
 * Compilers translate tokens to each target. Designed against email's
 * constraints as the floor (ADR-0001): shadows and gradients are CSS strings
 * that html targets use directly and email renders degrade to flat color.
 */
export interface ThemeTokens {
  colors: {
    bg: string;
    surface: string;
    text: string;
    muted: string;
    primary: string;
    primaryText: string;
    border: string;
  };
  fonts: {
    /** Email-safe stack expected; web Compiler may layer @font-face on top. */
    body: string;
    heading: string;
  };
  /** Spacing scale in px (index 0..n). Email needs absolute px units. */
  spacing: number[];
  radii: { sm: number; md: number; lg: number; xl: number; pill: number };
  /** Type scale in px. */
  fontSizes: {
    xs: number;
    sm: number;
    base: number;
    lg: number;
    xl: number;
    "2xl": number;
    "3xl": number;
    "4xl": number;
  };
  /** Numeric font-weight scale. */
  fontWeights: { normal: number; medium: number; bold: number; heavy: number };
  /** Unitless line-heights. */
  lineHeights: { tight: number; normal: number; relaxed: number };
  /** Letter-spacing in em. */
  letterSpacing: { tight: number; normal: number; wide: number };
  /** CSS box-shadow strings; "" = none. html target only — email drops them. */
  shadows: { sm: string; md: string; lg: string };
  /**
   * Named CSS background-image strings (gradients); "" = none. Elements pair
   * each with a flat fallback color for email/legacy targets.
   */
  gradients: { hero: string; accent: string; subtle: string };
}

export interface Theme {
  id: string;
  tokens: ThemeTokens;
}

export const defaultTheme: Theme = {
  id: "default",
  tokens: {
    colors: {
      bg: "#ffffff",
      surface: "#f6f7f9",
      text: "#1a1a1a",
      muted: "#6b7280",
      primary: "#4f46e5",
      primaryText: "#ffffff",
      border: "#e5e7eb",
    },
    fonts: {
      body: "Arial, Helvetica, sans-serif",
      heading: "Georgia, 'Times New Roman', serif",
    },
    spacing: [0, 4, 8, 12, 16, 24, 32, 48, 64],
    radii: { sm: 4, md: 8, lg: 16, xl: 24, pill: 999 },
    fontSizes: { xs: 12, sm: 14, base: 16, lg: 20, xl: 28, "2xl": 40, "3xl": 56, "4xl": 72 },
    fontWeights: { normal: 400, medium: 500, bold: 700, heavy: 800 },
    lineHeights: { tight: 1.1, normal: 1.5, relaxed: 1.7 },
    letterSpacing: { tight: -0.02, normal: 0, wide: 0.08 },
    shadows: {
      sm: "0 1px 2px rgba(16,24,40,.06)",
      md: "0 4px 12px -2px rgba(16,24,40,.1)",
      lg: "0 20px 40px -12px rgba(16,24,40,.18)",
    },
    gradients: {
      hero: "linear-gradient(135deg,#eef2ff 0%,#ffffff 60%)",
      accent: "linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)",
      subtle: "linear-gradient(180deg,#fafafa 0%,#ffffff 100%)",
    },
  },
};

/** Parse a column ratio like "2:1" into grid-template-columns ("2fr 1fr"). */
export function ratioToGrid(ratio: unknown): string | null {
  const parts = String(ratio ?? "")
    .split(":")
    .map((p) => Number(p.trim()));
  if (parts.length < 2 || parts.some((n) => !Number.isFinite(n) || n <= 0)) return null;
  return parts.map((n) => `${n}fr`).join(" ");
}

/**
 * Resolve a section `background` value against the tokens:
 *  - color token key ('bg', 'surface', 'primary'…)
 *  - 'gradient:hero' | 'gradient:accent' | 'gradient:subtle'
 *  - 'image:<url>' (+ overlay 0..1 darkens for text legibility)
 * Returns CSS declarations plus a flat fallback color for email targets.
 */
export function resolveBackground(
  t: ThemeTokens,
  background: unknown,
  overlay?: unknown,
): { css: Record<string, string | undefined>; fallback: string } {
  const raw = String(background ?? "bg");
  if (raw === "none" || raw === "transparent") {
    // Nested sections on gradient/image parents must not paint over them.
    return { css: {}, fallback: t.colors.bg };
  }
  // Literal CSS colors/gradients ("#1a1a2e", "rgb(…)", "linear-gradient(…)"):
  // agents and users reach for these constantly — honor them instead of
  // silently falling back to the default token.
  if (/^(#|rgb\(|rgba\(|hsl\(|hsla\()/i.test(raw)) {
    return { css: { "background-color": raw }, fallback: raw };
  }
  if (/^(linear|radial|conic)-gradient\(/i.test(raw)) {
    return { css: { "background-image": raw }, fallback: t.colors.surface };
  }
  if (raw.startsWith("gradient:")) {
    const key = raw.slice(9) as keyof ThemeTokens["gradients"];
    const g = t.gradients[key] ?? "";
    const fallback = key === "accent" ? t.colors.primary : t.colors.surface;
    return g
      ? { css: { "background-image": g }, fallback }
      : { css: { "background-color": fallback }, fallback };
  }
  if (raw.startsWith("image:")) {
    const url = raw.slice(6);
    const ov = Math.max(0, Math.min(Number(overlay ?? 0), 1));
    const layer = ov > 0 ? `linear-gradient(rgba(0,0,0,${ov}),rgba(0,0,0,${ov})),` : "";
    return {
      css: {
        "background-image": `${layer}url('${url.replace(/'/g, "%27")}')`,
        "background-size": "cover",
        "background-position": "center",
      },
      fallback: t.colors.surface,
    };
  }
  const color = (t.colors as Record<string, string>)[raw] ?? t.colors.bg;
  return { css: { "background-color": color }, fallback: color };
}

/** Section content max-widths by `width` prop. */
export const SECTION_WIDTHS: Record<string, string> = {
  narrow: "480px",
  normal: "640px",
  wide: "960px",
  full: "100%",
};

/** Read a spacing step safely, clamping to the scale bounds. */
export function space(theme: Theme, step: number): number {
  const scale = theme.tokens.spacing;
  const i = Math.max(0, Math.min(step, scale.length - 1));
  return scale[i] ?? 0;
}
