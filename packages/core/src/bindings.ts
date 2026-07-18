import type { Document, ElementNode } from "./types.js";

/** Read a dotted path (e.g. "user.name") from a data object. */
function getPath(data: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, data);
}

const TOKEN = /\{\{\s*([\w.]+)\s*\}\}/g;

/** Replace `{{path}}` tokens in a single string with values from `data`. */
function interpolate(value: string, data: unknown): string {
  return value.replace(TOKEN, (_m, path: string) => {
    const v = getPath(data, path);
    return v === undefined || v === null ? "" : String(v);
  });
}

function bindProps(props: Record<string, unknown>, data: unknown): Record<string, unknown> {
  let changed = false;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === "string" && v.includes("{{")) {
      out[k] = interpolate(v, data);
      changed = true;
    } else {
      out[k] = v;
    }
  }
  return changed ? out : props;
}

function bindNode(node: ElementNode, data: unknown): ElementNode {
  const props = bindProps(node.props, data);
  const children = node.children.map((c) => bindNode(c, data));
  if (props === node.props && children.every((c, i) => c === node.children[i])) return node;
  return { ...node, props, children };
}

/**
 * Resolve `{{path}}` data bindings throughout a Document against `data`,
 * returning a new Document. This is how store content is updated smoothly from
 * a data source without re-authoring: bind `text.content` to `{{product.name}}`
 * and re-run `bindData` whenever the data changes.
 */
export function bindData(doc: Document, data: unknown): Document {
  return { ...doc, root: bindNode(doc.root, data) };
}
