import { useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Load the repo's markdown as raw strings (no Vue, pure Vite + React).
const builderFiles = import.meta.glob("../../../docs/builder/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const adrFiles = import.meta.glob("../../../docs/adr/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const refFiles = import.meta.glob("../../../{CONTEXT,README}.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

interface Doc {
  key: string;       // basename, e.g. "01-builder-structure.md"
  title: string;
  content: string;
}

function base(path: string): string {
  return path.split("/").pop()!;
}
function titleOf(content: string, fallback: string): string {
  const m = content.match(/^#\s+(.+)$/m);
  return m ? m[1] : fallback;
}
function toDocs(files: Record<string, string>): Doc[] {
  return Object.entries(files).map(([path, content]) => ({
    key: base(path),
    title: titleOf(content, base(path)),
    content,
  }));
}
function orderBuilder(a: Doc, b: Doc): number {
  const rank = (k: string) => (k.toLowerCase().startsWith("readme") ? -1 : parseInt(k, 10) || 99);
  return rank(a.key) - rank(b.key);
}
function orderAdr(a: Doc, b: Doc): number {
  return (parseInt(a.key, 10) || 0) - (parseInt(b.key, 10) || 0);
}

export function App() {
  const groups = useMemo(
    () => [
      { label: "Builder Guide", docs: toDocs(builderFiles).sort(orderBuilder) },
      { label: "Architecture Decisions", docs: toDocs(adrFiles).sort(orderAdr) },
      { label: "Reference", docs: toDocs(refFiles).sort((a, b) => a.key.localeCompare(b.key)) },
    ],
    [],
  );
  const all = groups.flatMap((g) => g.docs);
  const [activeKey, setActiveKey] = useState<string>(all[0]?.key ?? "");
  const active = all.find((d) => d.key === activeKey) ?? all[0];

  function openByHref(href: string): boolean {
    const target = base(href.split("#")[0]);
    const found = all.find((d) => d.key === target);
    if (found) {
      setActiveKey(found.key);
      return true;
    }
    return false;
  }

  return (
    <div className="docs">
      <aside className="side">
        <div className="brand">AI Builder <span className="muted">docs</span></div>
        {groups.map((g) => (
          <div key={g.label} className="group">
            <div className="group-label">{g.label}</div>
            {g.docs.map((d) => (
              <a
                key={d.key}
                className={d.key === active?.key ? "navlink on" : "navlink"}
                onClick={() => setActiveKey(d.key)}
              >
                {d.title}
              </a>
            ))}
          </div>
        ))}
      </aside>
      <main className="content">
        <article className="md">
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              a({ href, children }) {
                const isInternalMd = href?.endsWith(".md") || href?.includes(".md#");
                return (
                  <a
                    href={href}
                    onClick={(e) => {
                      if (isInternalMd && href && openByHref(href)) e.preventDefault();
                    }}
                  >
                    {children}
                  </a>
                );
              },
            }}
          >
            {active?.content ?? ""}
          </Markdown>
        </article>
      </main>
    </div>
  );
}
