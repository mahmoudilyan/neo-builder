import type { RenderContext } from "@neo-builder/core";
import type { ThemeTokens } from "@neo-builder/theme";

export function tokens(ctx: RenderContext): ThemeTokens {
  return ctx.theme.tokens as unknown as ThemeTokens;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeAttr(value: unknown): string {
  return escapeHtml(value);
}

/** Inline tags allowed in rich text (from TipTap or the AI loop). */
const ALLOWED_INLINE = new Set(["b", "strong", "i", "em", "u", "s", "a", "br", "span"]);

/**
 * Conservative allowlist sanitizer for inline rich text. Keeps a small set of
 * formatting tags, drops everything else (preserving inner text), and only
 * permits safe `href`s on links.
 *
 * NOTE: for production, back this with DOMPurify. This regex pass is adequate
 * for controlled inputs (TipTap output, LLM text) at this stage.
 */
export function sanitizeInlineHtml(input: unknown): string {
  let out = String(input ?? "").replace(/<\/?(script|style|iframe)[^>]*>/gi, "");
  out = out.replace(/<([a-zA-Z0-9]+)([^>]*)>/g, (_m, tag: string, attrs: string) => {
    const t = tag.toLowerCase();
    if (!ALLOWED_INLINE.has(t)) return "";
    if (t === "a") {
      const href = (attrs.match(/href\s*=\s*"([^"]*)"/i) ?? [])[1] ?? "";
      const safe = /^(https?:|mailto:|\/|#)/i.test(href) ? href : "#";
      return `<a href="${safe.replace(/"/g, "&quot;")}">`;
    }
    return `<${t}>`;
  });
  out = out.replace(/<\/([a-zA-Z0-9]+)>/g, (_m, tag: string) =>
    ALLOWED_INLINE.has(tag.toLowerCase()) ? `</${tag.toLowerCase()}>` : "",
  );
  return out;
}

/** Build an inline style attribute from a record, skipping empty values. */
export function style(rules: Record<string, string | number | undefined>): string {
  const body = Object.entries(rules)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  return body ? ` style="${escapeAttr(body)}"` : "";
}
