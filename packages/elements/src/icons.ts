/**
 * A small, curated inline-SVG icon set (24×24, currentColor). Extend by adding
 * entries, or swap for a full library (Lucide, etc.) by registering your own
 * `icon` Element. Values are the inner SVG markup.
 */
export const ICONS: Record<string, string> = {
  "arrow-right": '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  star: '<path d="M12 2l3 7 7 .5-5.5 4.5 2 7-6.5-4-6.5 4 2-7L2 9.5 9 9z"/>',
  heart: '<path d="M20.8 5.6a5 5 0 00-7.1 0L12 7.3l-1.7-1.7a5 5 0 10-7.1 7.1L12 21l8.8-8.3a5 5 0 000-7.1z"/>',
  play: '<path d="M6 4l14 8-14 8z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  "map-pin": '<path d="M12 22s7-5.5 7-12a7 7 0 10-14 0c0 6.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  bolt: '<path d="M13 2L4 14h6l-1 8 9-12h-6z"/>',
  link: '<path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/>',
  github: '<path d="M9 19c-4 1.5-4-2-6-2m12 4v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 00-1.3-3.2 4.3 4.3 0 00-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 00-6 0C6.3 1.6 5.3 1.9 5.3 1.9a4.3 4.3 0 00-.1 3.2A4.6 4.6 0 003.9 8.3c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V20"/>',
  twitter: '<path d="M4 4l7 9m0 0l-7 7m7-7l9-9m-9 9l7 7" stroke-width="2"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 10v7M7 7v.01M11 17v-4a2 2 0 014 0v4" fill="none"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/>',
};

export function svgIcon(name: string, size = 24, color = "currentColor"): string {
  const inner = ICONS[name] ?? ICONS["star"]!;
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" ` +
    `stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
  );
}

export const ICON_NAMES = Object.keys(ICONS);
