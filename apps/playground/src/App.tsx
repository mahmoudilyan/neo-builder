import { useEffect, useMemo, useState } from "react";
import mjml2html from "mjml-browser";
import { createDocument, createElement, insertElement as insert, type Document, type Registry } from "@neo-builder/core";
import { registryFor } from "@neo-builder/elements";
import { defaultTheme } from "@neo-builder/theme";
import {
  useBuilder,
  BuilderProvider,
  Canvas,
  type BuilderType,
} from "@neo-builder/editor-react";
import {
  PlaygroundToolbar,
  PlaygroundPalette,
  PlaygroundInspector,
  PlaygroundThemePanel,
} from "./MarmoChrome.js";
import "@neo-builder/editor-react/styles.css";
import { Tabs, TabsList, TabsTrigger, Text } from "@marmoui/ui";
import { TiptapText } from "@neo-builder/editor-tiptap";
import { AiPanel } from "./AiPanel.js";
import { CommandsDemo } from "./CommandsDemo.js";
import { AgentPanel } from "./AgentPanel.js";

const ROUTES: { kind: BuilderType; label: string }[] = [
  { kind: "page", label: "Page" },
  { kind: "email", label: "Email" },
  { kind: "form", label: "Form" },
];

function currentKind(): BuilderType {
  const k = window.location.pathname.replace("/", "");
  return (ROUTES.find((r) => r.kind === k)?.kind ?? "page") as BuilderType;
}

function seedFor(kind: BuilderType, reg: Registry): Document {
  let doc = createDocument(defaultTheme.id);
  const hero = createElement(reg, "section", { columns: 1, bg: "surface", padding: 7 });
  doc = insert(doc, doc.root.id, hero);
  if (kind === "form") {
    doc = insert(doc, hero.id, createElement(reg, "text", { content: "Join the waitlist", as: "h2", align: "center" }));
    doc = insert(doc, hero.id, createElement(reg, "input", { name: "email", label: "Email", inputType: "email", required: true }));
    doc = insert(doc, hero.id, createElement(reg, "button", { label: "Join" }));
  } else {
    doc = insert(doc, hero.id, createElement(reg, "text", { content: kind === "email" ? "Your weekly update" : "Build pages your AI keeps improving", as: "h1", align: "center" }));
    doc = insert(doc, hero.id, createElement(reg, "text", { content: "One universal model. Every channel.", as: "p", align: "center" }));
    doc = insert(doc, hero.id, createElement(reg, "button", { label: kind === "email" ? "Read more" : "Start free", href: "#" }));
  }
  return doc;
}

function emailHtml(mjml: string): string {
  try {
    return mjml2html(mjml).html;
  } catch {
    return mjml;
  }
}

/**
 * Composed by hand from the editor's own components (useBuilder + BuilderProvider
 * + Toolbar/Palette/Canvas/Inspector). TipTap rich text is opt-in via textEditor.
 */
function BuilderApp({ kind, go }: { kind: BuilderType; go: (k: BuilderType) => void }) {
  const { registry, doc } = useMemo(() => {
    const r = registryFor(kind);
    return { registry: r, doc: seedFor(kind, r) };
  }, [kind]);
  const builder = useBuilder({ registry, doc, theme: defaultTheme, builderType: kind }, [kind]);
  const [rail, setRail] = useState<"agent" | "inspect">("agent");

  return (
    <div className="page">
      <header className="topbar">
        <span className="brand">
          <span className="brand-mark">◇</span> AI Builder
        </span>
        <nav className="routes">
          <Tabs value={kind} onValueChange={(v) => go(v as BuilderType)} variant="pill">
            <TabsList>
              {ROUTES.map((r) => (
                <TabsTrigger key={r.kind} value={r.kind}>
                  {r.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </nav>
        <span style={{ flex: 1 }} />
        <Text variant="body-sm" className="text-ink-light">
          press “/” on a block to insert · chat with the agent →
        </Text>
      </header>

      <div className="editor-host">
        <BuilderProvider builder={builder} textEditor={TiptapText}>
          <div className="abx">
            <PlaygroundToolbar mjmlToHtml={kind === "email" ? emailHtml : undefined} />
            <div className="abx-cols">
              <aside className="abx-left">
                <Text variant="label-sm" className="text-ink-light">
                  Elements
                </Text>
                <PlaygroundPalette />
              </aside>
              <Canvas />
              <aside className="abx-right rail">
                <div className="rail-tabs">
                  <Tabs value={rail} onValueChange={(v) => setRail(v as "agent" | "inspect")}>
                    <TabsList variant="line">
                      <TabsTrigger value="agent">Agent</TabsTrigger>
                      <TabsTrigger value="inspect">Inspect</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                {rail === "agent" ? (
                  <AgentPanel />
                ) : (
                  <div className="rail-inspect">
                    <PlaygroundInspector />
                    <details className="theme-acc">
                      <summary>Theme</summary>
                      <PlaygroundThemePanel />
                    </details>
                    <AiPanel />
                    <CommandsDemo />
                  </div>
                )}
              </aside>
            </div>
          </div>
        </BuilderProvider>
      </div>
    </div>
  );
}

export function App() {
  const [kind, setKind] = useState<BuilderType>(currentKind());
  useEffect(() => {
    const onPop = () => setKind(currentKind());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  function go(k: BuilderType) {
    window.history.pushState({}, "", "/" + k);
    setKind(k);
  }
  return <BuilderApp key={kind} kind={kind} go={go} />;
}
