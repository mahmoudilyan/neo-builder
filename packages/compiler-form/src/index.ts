import type {
  CapabilityProfile,
  Document,
  ElementNode,
  RenderContext,
  Registry,
  ThemeLike,
} from "@neo-builder/core";
import { isSupported, walk } from "@neo-builder/core";

export interface CompileFormOptions {
  registry: Registry;
  theme: ThemeLike;
  profile?: CapabilityProfile;
}

/** The default Form profile. Only Elements with a `form` render contribute. */
export const formProfile: CapabilityProfile = { target: "form" };

/** A compiled form: an ordered list of field/control descriptors. */
export interface FormSchema {
  fields: Record<string, unknown>[];
}

/**
 * Compile a Document Model to a structured form schema by collecting each
 * Element's `form` render. The same universal model that produces a Landing
 * Page produces a Form — Elements without a `form` render are simply absent.
 */
export function compileForm(doc: Document, opts: CompileFormOptions): FormSchema {
  const { registry, theme } = opts;
  const profile = opts.profile ?? formProfile;
  const ctx: RenderContext = {
    target: "form",
    theme,
    renderChildren: () => "",
    renderNode: () => "",
  };

  const fields: Record<string, unknown>[] = [];
  for (const node of walk(doc)) {
    if (node.type === "root") continue;
    if (!isSupported(registry, profile, node.type)) continue;
    const render = registry.require(node.type).render.form;
    if (!render) continue;
    try {
      fields.push(JSON.parse(render(node as ElementNode, ctx)) as Record<string, unknown>);
    } catch {
      /* skip a malformed field rather than break the whole form */
    }
  }
  return { fields };
}
