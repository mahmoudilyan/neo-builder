import { defaultTheme, type Theme, type ThemeTokens } from "@neo-builder/theme";
import type { MoodName } from "./types.js";

/** Each Mood overrides Theme tokens — fonts, type scale, color, spacing, radius. */
const MOODS: Record<MoodName, (t: ThemeTokens) => ThemeTokens> = {
  editorial: (t) => ({
    ...t,
    fonts: { body: "Georgia, 'Times New Roman', serif", heading: "Georgia, 'Times New Roman', serif" },
    fontSizes: { ...t.fontSizes, "4xl": 84, "3xl": 64, "2xl": 56, xl: 34, lg: 22 },
    fontWeights: { normal: 400, medium: 400, bold: 700, heavy: 700 },
    lineHeights: { tight: 1.05, normal: 1.55, relaxed: 1.75 },
    letterSpacing: { tight: -0.015, normal: 0, wide: 0.12 },
    spacing: [0, 4, 8, 14, 22, 36, 56, 84, 120],
    radii: { sm: 0, md: 0, lg: 0, xl: 0, pill: 0 },
    shadows: { sm: "", md: "", lg: "" },
    gradients: { hero: "linear-gradient(180deg,#f3f1ea 0%,#ffffff 100%)", accent: "", subtle: "linear-gradient(180deg,#faf9f5 0%,#ffffff 100%)" },
    colors: { ...t.colors, primary: "#111111", primaryText: "#ffffff", bg: "#ffffff", surface: "#f3f1ea", text: "#111111", border: "#e3ded2", muted: "#6b6457" },
  }),
  minimal: (t) => ({
    ...t,
    fonts: { body: "Inter, system-ui, -apple-system, sans-serif", heading: "Inter, system-ui, -apple-system, sans-serif" },
    fontSizes: { ...t.fontSizes, "4xl": 64, "3xl": 52, "2xl": 44, xl: 28, lg: 19 },
    fontWeights: { normal: 400, medium: 500, bold: 600, heavy: 700 },
    lineHeights: { tight: 1.15, normal: 1.6, relaxed: 1.8 },
    letterSpacing: { tight: -0.025, normal: 0, wide: 0.06 },
    spacing: [0, 4, 8, 16, 28, 44, 72, 110, 150],
    radii: { sm: 6, md: 10, lg: 20, xl: 28, pill: 999 },
    shadows: { sm: "0 1px 2px rgba(0,0,0,.04)", md: "0 2px 8px rgba(0,0,0,.05)", lg: "0 12px 32px -8px rgba(0,0,0,.08)" },
    gradients: { hero: "", accent: "", subtle: "linear-gradient(180deg,#fafafa 0%,#ffffff 100%)" },
    colors: { ...t.colors, primary: "#111111", primaryText: "#ffffff", bg: "#ffffff", surface: "#fafafa", text: "#1a1a1a", border: "#ededed", muted: "#8a8a8a" },
  }),
  bold: (t) => ({
    ...t,
    fonts: { body: "'Helvetica Neue', Arial, sans-serif", heading: "'Helvetica Neue', Arial, sans-serif" },
    fontSizes: { ...t.fontSizes, "4xl": 96, "3xl": 80, "2xl": 68, xl: 42, lg: 24 },
    fontWeights: { normal: 400, medium: 600, bold: 800, heavy: 900 },
    lineHeights: { tight: 1.0, normal: 1.45, relaxed: 1.6 },
    letterSpacing: { tight: -0.035, normal: -0.01, wide: 0.1 },
    spacing: [0, 4, 8, 12, 20, 32, 52, 80, 112],
    radii: { sm: 8, md: 16, lg: 28, xl: 36, pill: 999 },
    shadows: { sm: "0 2px 6px rgba(0,0,0,.4)", md: "0 8px 24px -4px rgba(109,40,217,.35)", lg: "0 0 60px -10px rgba(124,58,237,.5)" },
    gradients: { hero: "linear-gradient(140deg,#0b0b12 0%,#1d1240 55%,#0b0b12 100%)", accent: "linear-gradient(135deg,#6d28d9 0%,#c026d3 100%)", subtle: "linear-gradient(180deg,#16161f 0%,#0b0b12 100%)" },
    colors: { ...t.colors, primary: "#6d28d9", primaryText: "#ffffff", bg: "#0b0b12", surface: "#16161f", text: "#f4f4ff", border: "#2a2a3a", muted: "#9a9ab0" },
  }),
  warm: (t) => ({
    ...t,
    fonts: { body: "'Trebuchet MS', Verdana, sans-serif", heading: "Georgia, serif" },
    fontSizes: { ...t.fontSizes, "4xl": 72, "3xl": 60, "2xl": 50, xl: 32, lg: 21 },
    fontWeights: { normal: 400, medium: 500, bold: 700, heavy: 800 },
    lineHeights: { tight: 1.15, normal: 1.6, relaxed: 1.8 },
    letterSpacing: { tight: -0.01, normal: 0, wide: 0.08 },
    spacing: [0, 4, 8, 16, 24, 40, 64, 96, 132],
    radii: { sm: 10, md: 18, lg: 30, xl: 38, pill: 999 },
    shadows: { sm: "0 1px 3px rgba(120,72,0,.08)", md: "0 6px 16px -4px rgba(120,72,0,.14)", lg: "0 24px 48px -16px rgba(120,72,0,.2)" },
    gradients: { hero: "linear-gradient(160deg,#fdf0e0 0%,#fffaf3 70%)", accent: "linear-gradient(135deg,#d97706 0%,#ea580c 100%)", subtle: "linear-gradient(180deg,#fffaf3 0%,#fdf6ec 100%)" },
    colors: { ...t.colors, primary: "#d97706", primaryText: "#ffffff", bg: "#fffaf3", surface: "#fdf0e0", text: "#3b2a1a", border: "#eaddcb", muted: "#9c8266" },
  }),
  playful: (t) => ({
    ...t,
    fonts: { body: "'Verdana', sans-serif", heading: "'Trebuchet MS', sans-serif" },
    fontSizes: { ...t.fontSizes, "4xl": 76, "3xl": 62, "2xl": 54, xl: 34, lg: 22 },
    fontWeights: { normal: 400, medium: 600, bold: 700, heavy: 900 },
    lineHeights: { tight: 1.1, normal: 1.55, relaxed: 1.75 },
    letterSpacing: { tight: -0.01, normal: 0, wide: 0.1 },
    spacing: [0, 4, 10, 16, 26, 42, 66, 100, 140],
    radii: { sm: 14, md: 24, lg: 40, xl: 48, pill: 999 },
    shadows: { sm: "0 2px 4px rgba(236,72,153,.12)", md: "0 8px 20px -6px rgba(236,72,153,.25)", lg: "0 24px 56px -16px rgba(168,85,247,.3)" },
    gradients: { hero: "linear-gradient(135deg,#fdf4ff 0%,#ffe4f3 50%,#f5e6ff 100%)", accent: "linear-gradient(135deg,#ec4899 0%,#a855f7 100%)", subtle: "linear-gradient(180deg,#fdf4ff 0%,#ffffff 100%)" },
    colors: { ...t.colors, primary: "#ec4899", primaryText: "#ffffff", bg: "#fdf4ff", surface: "#f5e6ff", text: "#3b1d4e", border: "#ecd5fb", muted: "#8b5fa8" },
  }),
};

/** Produce a mood-adjusted Theme from a base Theme. */
export function applyMood(mood: MoodName, base: Theme = defaultTheme): Theme {
  const fn = MOODS[mood] ?? ((t: ThemeTokens) => t);
  return { id: `${base.id}-${mood}`, tokens: fn(base.tokens) };
}

export const MOOD_CATALOG: { name: MoodName; description: string }[] = [
  { name: "editorial", description: "Serif, high-contrast, magazine-like. Big type, no radius, cream surfaces." },
  { name: "minimal", description: "Clean sans-serif, generous whitespace, muted, subtle radius." },
  { name: "bold", description: "Dark background, huge type, vivid purple, rounded. High energy." },
  { name: "warm", description: "Amber palette, serif headings, rounded, friendly." },
  { name: "playful", description: "Pink/purple, very rounded, big friendly type. Fun, energetic." },
];
