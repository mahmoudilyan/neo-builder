import { Registry } from "@neo-builder/core";
import type { ElementDefinition } from "@neo-builder/core";
import { section } from "./section.js";
import { text } from "./text.js";
import { button } from "./button.js";
import { image } from "./image.js";
import { input } from "./input.js";
import { icon } from "./icon.js";
import { youtube } from "./youtube.js";
import { video } from "./video.js";
import { embed } from "./embed.js";
import { social } from "./social.js";
import { spacer } from "./spacer.js";
import { divider } from "./divider.js";
import { list } from "./list.js";
import { quote } from "./quote.js";
import { accordion } from "./accordion.js";
import { navbar } from "./navbar.js";
import { countdown } from "./countdown.js";

export {
  section, text, button, image, input, icon, youtube, video, embed, social, spacer,
  divider, list, quote, accordion, navbar, countdown,
};
export { ICONS, ICON_NAMES, svgIcon } from "./icons.js";

/** All built-in Element Definitions. */
export const builtinElements: ElementDefinition[] = [
  section, navbar, text, list, quote, accordion, button, image, input, icon,
  youtube, video, embed, social, countdown, spacer, divider,
];

/** Register every built-in Element into a Registry. */
export function registerBuiltins(registry: Registry): Registry {
  return registry.registerAll(builtinElements);
}

/**
 * Per-Builder-Type element sets. Each builder gets its own registry; this is the
 * default curation, but you can add custom Elements to any of them.
 */
export const pageElements: ElementDefinition[] = [
  section, navbar, text, list, quote, accordion, button, image, input, icon,
  youtube, video, embed, social, countdown, spacer, divider,
];
export const emailElements: ElementDefinition[] = [
  section, text, list, quote, button, image, spacer, divider,
];
export const formElements: ElementDefinition[] = [section, text, input, button, spacer, divider];

/** Build a fresh Registry pre-loaded with one Builder Type's elements. */
export function registryFor(kind: "page" | "email" | "form"): Registry {
  const sets = { page: pageElements, email: emailElements, form: formElements };
  return new Registry().registerAll(sets[kind]);
}
