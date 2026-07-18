import { useMemo, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { BREAKPOINTS, resolveProps, walk, type Breakpoint, type ElementDefinition, type ElementState } from "@neo-builder/core";
import { compileHtml } from "@neo-builder/compiler-html";
import { compileMjml } from "@neo-builder/compiler-mjml";
import { compileForm } from "@neo-builder/compiler-form";
import type { ThemeTokens } from "@neo-builder/theme";
import { useEditor, useEditorState, isAvailable } from "@neo-builder/editor-react";
import {
  Badge,
  Button,
  ButtonGroup,
  Field,
  IconButton,
  Input,
  Label,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  Text,
  Textarea,
} from "@marmoui/ui";
import {
  ArrowUUpLeft,
  ArrowUUpRight,
  Desktop,
  DeviceMobile,
  DeviceTablet,
  Export,
  Laptop,
  MagnifyingGlass,
  Plus,
} from "@phosphor-icons/react";

/**
 * The playground's own editor chrome, composed from @marmoui/ui over the
 * headless EditorStore — the same public API any host app would use. The
 * library components (Canvas/NodeView) stay unstyled-by-Marmo on purpose:
 * they render the user's document, not the app chrome.
 */

const BP_ICON: Record<Breakpoint, React.ReactNode> = {
  base: <DeviceMobile />,
  sm: <DeviceTablet />,
  md: <Laptop />,
  lg: <Desktop />,
};

export function PlaygroundToolbar({ mjmlToHtml }: { mjmlToHtml?: (mjml: string) => string }) {
  const store = useEditor();
  const { breakpoint, preview, canUndo, canRedo } = useEditorState();
  const builder = store.builder;

  function openWindow(content: string, asText: boolean) {
    const w = window.open("", "_blank");
    if (!w) return;
    if (asText) {
      const esc = content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      w.document.write(`<pre style="white-space:pre-wrap;font:13px monospace;padding:20px">${esc}</pre>`);
    } else {
      w.document.write(content);
    }
    w.document.close();
  }

  function exportOutput() {
    const doc = store.getState().doc;
    const opts = { registry: store.registry, theme: store.theme };
    if (store.target === "html") return openWindow(compileHtml(doc, { ...opts, title: "Export" }), false);
    if (store.target === "form") return openWindow(JSON.stringify(compileForm(doc, opts), null, 2), true);
    const mjml = compileMjml(doc, opts);
    if (mjmlToHtml) return openWindow(mjmlToHtml(mjml), false);
    openWindow(mjml, true);
  }

  return (
    <div className="mx-toolbar">
      <Badge variant="info" size="sm">
        {builder.label} builder
      </Badge>
      <ButtonGroup size="sm" attached>
        <IconButton
          variant="secondary"
          icon={<ArrowUUpLeft />}
          aria-label="Undo (⌘/Ctrl+Z)"
          disabled={!canUndo}
          onClick={() => store.undo()}
        />
        <IconButton
          variant="secondary"
          icon={<ArrowUUpRight />}
          aria-label="Redo (⌘/Ctrl+Shift+Z)"
          disabled={!canRedo}
          onClick={() => store.redo()}
        />
      </ButtonGroup>
      <Tabs value={breakpoint} onValueChange={(v: string) => store.setBreakpoint(v as Breakpoint)} variant="pill">
        <TabsList>
          {BREAKPOINTS.map((bp) => (
            <TabsTrigger key={bp} value={bp} aria-label={`Breakpoint ${bp}`}>
              <span className="mx-bp">
                {BP_ICON[bp]} {bp}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <span className="mx-spacer" />
      <div className="mx-preview">
        <Switch id="mx-preview" checked={preview} onCheckedChange={() => store.togglePreview()} />
        <Label htmlFor="mx-preview" className="font-normal">
          Preview
        </Label>
      </div>
      <Button variant="secondary" size="sm" leftIcon={<Export />} onClick={exportOutput}>
        {builder.exportLabel}
      </Button>
    </div>
  );
}

const CATEGORY_ORDER = ["Layout", "Content", "Media", "Interactive"];

export function PlaygroundPalette() {
  const store = useEditor();
  const { builderType } = useEditorState();
  const [query, setQuery] = useState("");
  const target = store.builder.target;

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const defs = store.registry
      .list()
      .filter((d) => isAvailable(d, target))
      .filter(
        (d) =>
          !q ||
          (d.label ?? d.type).toLowerCase().includes(q) ||
          d.aiMeta.description.toLowerCase().includes(q),
      );
    const byCat = new Map<string, ElementDefinition[]>();
    for (const d of defs) {
      const c = d.category ?? "Other";
      byCat.set(c, [...(byCat.get(c) ?? []), d]);
    }
    return [...byCat.entries()].sort(
      ([a], [b]) => (CATEGORY_ORDER.indexOf(a) + 1 || 99) - (CATEGORY_ORDER.indexOf(b) + 1 || 99),
    );
  }, [store, target, query]);

  return (
    <div className="mx-palette" key={builderType}>
      <Input
        placeholder="Search elements…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        startAdornment={<MagnifyingGlass size={16} />}
      />
      {groups.map(([category, defs]) => (
        <div key={category} className="mx-palette-group">
          <Text variant="label-sm" className="text-ink-light mx-cat">
            {category}
          </Text>
          <div className="mx-palette-grid">
            {defs.map((d) => (
              <PaletteItem key={d.type} type={d.type} />
            ))}
          </div>
        </div>
      ))}
      {groups.length === 0 && (
        <Text variant="body-sm" className="text-ink-light">
          No matches
        </Text>
      )}
    </div>
  );
}

function PaletteItem({ type }: { type: string }) {
  const store = useEditor();
  const { doc, selectedId } = useEditorState();
  const def = store.registry.get(type)!;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `new:${type}`,
    data: { kind: "new", type },
  });

  function firstSectionId(): string | null {
    for (const n of walk(doc)) if (n.type === "section") return n.id;
    return null;
  }
  function add() {
    if (type === "section") return void store.addElement("section", doc.root.id);
    const selected = selectedId ? store.get(selectedId) : undefined;
    const parentId =
      selected?.type === "section"
        ? selected.id
        : (firstSectionId() ?? store.addElement("section", doc.root.id).id);
    store.addElement(type, parentId);
  }

  return (
    <button
      ref={setNodeRef}
      className="mx-palette-item"
      style={{ opacity: isDragging ? 0.5 : 1 }}
      title={`${def.aiMeta.description}\n(drag onto canvas or click to add)`}
      onClick={add}
      {...listeners}
      {...attributes}
    >
      <span className="mx-pi-icon">{def.icon ?? "▢"}</span>
      <span className="mx-pi-label">{def.label ?? type}</span>
    </button>
  );
}

const SPACING_KEYS = ["padding", "gap", "width"];

export function PlaygroundInspector() {
  const store = useEditor();
  const { selectedId, breakpoint } = useEditorState();
  const node = selectedId ? store.get(selectedId) : undefined;
  const [state, setState] = useState<"default" | ElementState>("default");
  if (!node)
    return (
      <Text variant="body-sm" className="text-ink-light">
        Select an element on the canvas to edit it.
      </Text>
    );

  const def = store.registry.require(node.type);
  const resolved = resolveProps(node, breakpoint);
  const accepts = def.schema.allowedChildren;
  const acceptsLabel = accepts === undefined ? "nothing (leaf)" : accepts === "*" ? "any element" : accepts.join(", ");

  function setProp(key: string, value: unknown) {
    store.setResponsive(node!.id, breakpoint, { [key]: value });
  }

  const styleObj =
    state === "default"
      ? ((node.props._style as Record<string, unknown> | undefined) ?? {})
      : (node.states?.[state] ?? {});

  function setStyle(text: string) {
    try {
      const parsed = text.trim() ? (JSON.parse(text) as Record<string, unknown>) : {};
      if (state === "default") store.updateProps(node!.id, { _style: parsed });
      else store.setState(node!.id, state as ElementState, parsed);
    } catch {
      /* ignore until valid JSON */
    }
  }

  return (
    <div className="mx-inspector">
      <div className="mx-el-head">
        <span className="mx-el-icon">{def.icon ?? "▢"}</span>
        <div>
          <Text variant="label-sm">{def.label ?? node.type}</Text>
          <Text variant="body-sm" className="text-ink-light">
            {def.aiMeta.description}
          </Text>
        </div>
      </div>
      <div className="mx-el-meta">
        <Text variant="body-sm" className="text-ink-light">
          accepts: {acceptsLabel} · id {node.id.slice(0, 8)}
        </Text>
        {breakpoint !== "base" && (
          <Badge size="sm" variant="info">
            {breakpoint}
          </Badge>
        )}
      </div>

      {Object.entries(def.schema.props)
        .filter(([k]) => !k.startsWith("_") && !SPACING_KEYS.includes(k))
        .map(([key, hint]) => (
          <Field key={key} label={key} helperText={hint}>
            <Input value={String(resolved[key] ?? "")} onChange={(e) => setProp(key, e.target.value)} />
          </Field>
        ))}

      {SPACING_KEYS.some((k) => k in def.schema.props) && (
        <div className="mx-spacing">
          {(["padding", "gap"] as const)
            .filter((k) => k in def.schema.props)
            .map((k) => (
              <div className="mx-step" key={k}>
                <Label className="font-normal">{k}</Label>
                <ButtonGroup size="xs" attached>
                  <Button variant="secondary" onClick={() => setProp(k, Math.max(0, Number(resolved[k] ?? 0) - 1))}>
                    −
                  </Button>
                  <Button variant="secondary" disabled>
                    {Number(resolved[k] ?? 0)}
                  </Button>
                  <Button variant="secondary" onClick={() => setProp(k, Math.min(8, Number(resolved[k] ?? 0) + 1))}>
                    +
                  </Button>
                </ButtonGroup>
              </div>
            ))}
          {"width" in def.schema.props && (
            <Field label="width" helperText="drag the canvas corner handle, or set a CSS width">
              <Input value={String(resolved.width ?? "")} onChange={(e) => setProp("width", e.target.value)} />
            </Field>
          )}
        </div>
      )}

      <div className="mx-states">
        <Text variant="label-sm" className="text-ink-light">
          Style state
        </Text>
        <Tabs value={state} onValueChange={(v: string) => setState(v as "default" | ElementState)} variant="pill">
          <TabsList>
            {(["default", ...(def.states ?? [])] as const).map((s) => (
              <TabsTrigger key={s} value={s}>
                {s}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Textarea
          key={node.id + state}
          rows={4}
          defaultValue={JSON.stringify(styleObj, null, 2)}
          placeholder={state === "default" ? '{ "borderRadius": "12px" }' : '{ "backgroundColor": "#3730a3" }'}
          onBlur={(e) => setStyle(e.target.value)}
        />
        <Text variant="body-sm" className="text-ink-light">
          {state === "default" ? "Base CSS override (_style)." : `CSS applied on :${state}.`}
        </Text>
      </div>
    </div>
  );
}

export function PlaygroundThemePanel() {
  const store = useEditor();
  useEditorState();
  const theme = store.theme;
  const t = theme.tokens as unknown as ThemeTokens;

  function setColor(key: keyof ThemeTokens["colors"], value: string) {
    store.setTheme({ id: theme.id, tokens: { ...t, colors: { ...t.colors, [key]: value } } });
  }
  function setFont(key: keyof ThemeTokens["fonts"], value: string) {
    store.setTheme({ id: theme.id, tokens: { ...t, fonts: { ...t.fonts, [key]: value } } });
  }
  function addTheme() {
    const id = prompt("New theme id", theme.id + "-copy");
    if (id) store.setTheme({ id, tokens: { ...t } });
  }

  const colorKeys: (keyof ThemeTokens["colors"])[] = ["bg", "surface", "text", "primary", "primaryText", "border"];

  return (
    <div className="mx-theme">
      <Badge size="sm" variant="normal">
        {theme.id}
      </Badge>
      <div className="mx-swatches">
        {colorKeys.map((k) => (
          <label key={k} className="mx-color">
            <input type="color" value={toHex(t.colors[k])} onChange={(e) => setColor(k, e.target.value)} />
            <Text variant="body-sm" className="text-ink-light">
              {k}
            </Text>
          </label>
        ))}
      </div>
      <Field label="Body font">
        <Input value={t.fonts.body} onChange={(e) => setFont("body", e.target.value)} />
      </Field>
      <Field label="Heading font">
        <Input value={t.fonts.heading} onChange={(e) => setFont("heading", e.target.value)} />
      </Field>
      <Button variant="secondary" size="sm" leftIcon={<Plus />} onClick={addTheme}>
        Add theme
      </Button>
    </div>
  );
}

function toHex(c: string): string {
  return /^#[0-9a-f]{6}$/i.test(c) ? c : "#000000";
}
