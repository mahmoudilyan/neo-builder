import type { Document } from "@neo-builder/core";
import type { Theme } from "@neo-builder/theme";

export type MoodName = "editorial" | "minimal" | "bold" | "warm" | "playful";
export type RecipeId = "centered-stack" | "split-hero" | "offset-grid" | "feature-rows";

export interface Feature {
  title: string;
  body: string;
}

/**
 * The semantic brief an AI authors — meaning only. A Layout Recipe turns it into
 * a Document. The AI never controls layout, so it can't make ugly pages.
 */
export interface ContentBrief {
  mood: MoodName;
  recipe: RecipeId;
  headline: string;
  subhead: string;
  cta: { label: string; href?: string };
  features: Feature[];
  /** Optional headline stat, e.g. "31M weekly downloads". */
  stat?: string;
}

/** A realized candidate: brief + the Document + the mood-adjusted Theme. */
export interface Concept {
  brief: ContentBrief;
  doc: Document;
  theme: Theme;
}
