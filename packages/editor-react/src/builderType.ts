import type { CapabilityProfile, ElementDefinition, Target } from "@neo-builder/core";
import { landingPageProfile } from "@neo-builder/compiler-html";
import { emailProfile } from "@neo-builder/compiler-mjml";
import { formProfile } from "@neo-builder/compiler-form";

/** The medium the editor is currently building for. */
export type BuilderType = "page" | "email" | "form";

export interface BuilderTypeMeta {
  id: BuilderType;
  label: string;
  target: Target;
  profile: CapabilityProfile;
  /** Verb shown on the export button. */
  exportLabel: string;
  emptyHint: string;
}

export const BUILDER_TYPES: Record<BuilderType, BuilderTypeMeta> = {
  page: {
    id: "page",
    label: "Page",
    target: "html",
    profile: landingPageProfile,
    exportLabel: "Export HTML",
    emptyHint: "Drag or click a section to begin your page",
  },
  email: {
    id: "email",
    label: "Email",
    target: "mjml",
    profile: emailProfile,
    exportLabel: "Export MJML",
    emptyHint: "Build an email — inputs aren't available here",
  },
  form: {
    id: "form",
    label: "Form",
    target: "form",
    profile: formProfile,
    exportLabel: "Export schema",
    emptyHint: "Add a section, then inputs and a submit button",
  },
};

export const BUILDER_TYPE_LIST = Object.values(BUILDER_TYPES);

/**
 * Whether an Element is usable in a target: it either renders to that target,
 * or it's a structural container (which is allowed everywhere even if it emits
 * no output of its own, e.g. a section in a Form).
 */
export function isAvailable(def: ElementDefinition, target: Target): boolean {
  return !!def.render[target] || def.schema.allowedChildren !== undefined;
}
