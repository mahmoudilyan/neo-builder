import { defineElement } from "@neo-builder/core";
import { tokens, escapeHtml, escapeAttr } from "./util.js";

const UNITS = ["days", "hours", "mins", "secs"] as const;

/** A launch/deadline countdown. Live (JS) on pages; email can't run JS. */
export const countdown = defineElement({
  type: "countdown",
  label: "Countdown",
  icon: "⏱",
  category: "Interactive",
  version: 1,
  schema: {
    props: {
      until: "target date-time, ISO 8601 (e.g. 2026-12-31T00:00:00Z)",
      label: "caption shown above the timer",
    },
  },
  aiMeta: {
    description:
      "A live countdown timer to a deadline — urgency for launches and offers. Landing pages only (uses a small script).",
    props: {
      until: "ISO 8601 date-time the timer counts down to.",
      label: "Short caption, e.g. 'Offer ends in'.",
    },
  },
  defaults: () => {
    const d = new Date(Date.now() + 7 * 864e5);
    return { until: d.toISOString().slice(0, 19) + "Z", label: "Launching in" };
  },
  render: {
    html: (node, ctx) => {
      const t = tokens(ctx);
      const until = String(node.props.until ?? "");
      const boxes = UNITS.map(
        (u) =>
          `<div style="min-width:64px;padding:${t.spacing[3]}px;background-color:${t.colors.text};` +
          `color:${t.colors.bg};border-radius:${t.radii.md}px;text-align:center">` +
          `<div data-cd="${u}" style="font-size:${t.fontSizes.xl}px;font-weight:bold;font-family:${t.fonts.heading}">0</div>` +
          `<div style="font-size:${t.fontSizes.sm}px;opacity:.7">${u}</div></div>`,
      ).join("");
      // Self-contained: each instance finds its own boxes via the wrapping div.
      const script =
        `<script>(function(){var w=document.currentScript.parentNode;var end=new Date("${escapeAttr(until)}").getTime();` +
        `function pad(n){return n<10?"0"+n:""+n}function tick(){var d=Math.max(0,end-Date.now());` +
        `var v={days:Math.floor(d/864e5),hours:Math.floor(d/36e5)%24,mins:Math.floor(d/6e4)%60,secs:Math.floor(d/1e3)%60};` +
        `["days","hours","mins","secs"].forEach(function(k){var el=w.querySelector('[data-cd="'+k+'"]');if(el)el.textContent=pad(v[k])});}` +
        `tick();setInterval(tick,1000);})()</script>`;
      return (
        `<div style="font-family:${t.fonts.body};text-align:center">` +
        `<div style="color:${t.colors.muted};font-size:${t.fontSizes.sm}px;text-transform:uppercase;` +
        `letter-spacing:.08em;margin-bottom:${t.spacing[3]}px">${escapeHtml(node.props.label)}</div>` +
        `<div style="display:flex;gap:${t.spacing[3]}px;justify-content:center">${boxes}</div>${script}</div>`
      );
    },
  },
});
