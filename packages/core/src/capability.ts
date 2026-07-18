import type { Registry } from "./registry.js";
import type { Target } from "./types.js";

/**
 * A Capability Profile marks which Element types a Builder Type / target
 * supports. Compilers consult it to reject or degrade out-of-profile Elements.
 */
export interface CapabilityProfile {
  target: Target;
  /** Allow-list of Element types; if omitted, all registered types allowed. */
  allow?: string[];
  /** Deny-list of Element types, applied after `allow`. */
  deny?: string[];
}

/**
 * Whether `type` is allowed by `profile` AND has a render fn for the target.
 * An Element with no render fn for the target is treated as unsupported.
 */
export function isSupported(
  registry: Registry,
  profile: CapabilityProfile,
  type: string,
): boolean {
  const def = registry.get(type);
  if (!def) return false;
  if (!def.render[profile.target]) return false;
  if (profile.allow && !profile.allow.includes(type)) return false;
  if (profile.deny?.includes(type)) return false;
  return true;
}
