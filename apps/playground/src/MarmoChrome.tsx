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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  Text,
  Textarea,
} from "@marmoui/ui";
import {
  ArrowLineDown,
  ArrowLineLeft,
  ArrowLineRight,
  ArrowLineUp,
  ArrowUUpLeft,
  ArrowUUpRight,
  CopySimple,
  CornersOut,
  Desktop,
  DeviceMobile,
  DeviceTablet,
  Export,
  Laptop,
  MagnifyingGlass,
  Plus,
  Square,
  Trash,
  X,
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

/** Props rendered by dedicated widgets below, excluded from the generic list. */
const HANDLED_KEYS = ["padding", "gap", "columns", "background", "bg"];
const SCALE_MAX = 8;

/** Parse an enum out of a prop hint like "'narrow' | 'normal' | 'wide'". */
function enumOptions(hint: string): string[] | null {
  const head = hint.split("—")[0];
  if (!head.includes("|")) return null;
  const opts = [...head.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  return opts.length >= 2 && opts.every((o) => !o.includes("<")) ? opts : null;
}

function isNumericHint(hint: string): boolean {
  return /\bnumber\b|px number|\(\d-\d\)|0-1\b/.test(hint);
}

/** label + control on one row — the inspector's basic rhythm. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mx-row">
      <Label className="font-normal mx-row-label">{label}</Label>
      <div className="mx-row-ctl">{children}</div>
    </div>
  );
}

function StepRow({ label, value, onChange, max = SCALE_MAX }: { label: string; value: number; onChange: (n: number) => void; max?: number }) {
  return (
    <Row label={label}>
      <ButtonGroup size="xs" attached>
        <Button variant="secondary" aria-label={`decrease ${label}`} onClick={() => onChange(Math.max(0, value - 1))}>
          −
        </Button>
        <Button variant="secondary" disabled>
          {value}
        </Button>
        <Button variant="secondary" aria-label={`increase ${label}`} onClick={() => onChange(Math.min(max, value + 1))}>
          +
        </Button>
      </ButtonGroup>
    </Row>
  );
}

/** Two numeric inputs with side glyphs — X/Y padding, border pairs. */
function PairRow({
  label,
  icons,
  values,
  onChange,
}: {
  label: string;
  icons: [React.ReactNode, React.ReactNode];
  values: [number, number];
  onChange: (side: 0 | 1, v: number) => void;
}) {
  return (
    <Row label={label}>
      <div className="mx-pair">
        {([0, 1] as const).map((i) => (
          <Input
            key={i}
            type="number"
            min={0}
            value={String(values[i])}
            startAdornment={icons[i]}
            aria-label={`${label} ${i === 0 ? "start" : "end"}`}
            onChange={(e) => onChange(i, Math.max(0, Number(e.target.value) || 0))}
          />
        ))}
      </div>
    </Row>
  );
}

/** "+ Color" affordance: unset shows a dashed add chip; set shows swatch + clear. */
function ColorRow({ label, value, onChange }: { label: string; value: string | undefined; onChange: (v: string | undefined) => void }) {
  return (
    <Row label={label}>
      <div className="mx-colorctl">
        <label className={`mx-color-chip${value ? "" : " is-empty"}`} title={value ?? "Add color"}>
          <input type="color" value={toHex(value ?? "")} onChange={(e) => onChange(e.target.value)} />
          {value ? <span className="mx-color-dot" style={{ background: value }} /> : <Plus size={12} />}
          <span>{value ?? "Color"}</span>
        </label>
        {value && (
          <IconButton variant="ghost" size="sm" icon={<X />} aria-label={`clear ${label}`} onClick={() => onChange(undefined)} />
        )}
      </div>
    </Row>
  );
}

const BACKGROUND_TOKENS = ["bg", "surface", "primary", "gradient:hero", "gradient:accent", "gradient:subtle"];

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
  const props = def.schema.props;

  function setProp(key: string, value: unknown) {
    store.setResponsive(node!.id, breakpoint, { [key]: value });
  }

  const style = (node.props._style as Record<string, unknown> | undefined) ?? {};
  function setStyleKeys(patch: Record<string, unknown>) {
    const next = { ...style, ...patch };
    for (const k of Object.keys(next)) if (next[k] === undefined || next[k] === "") delete next[k];
    store.updateProps(node!.id, { _style: next });
  }
  const px = (k: string) => Number(String(style[k] ?? "0").replace("px", "")) || 0;
  const setPx = (k: string) => (v: number) => setStyleKeys({ [k]: v > 0 ? `${v}px` : undefined });

  const generic = Object.entries(props).filter(([k]) => !k.startsWith("_") && !HANDLED_KEYS.includes(k));

  const stateObj = state === "default" ? style : (node.states?.[state] ?? {});
  function setStateJson(text: string) {
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
      <div className="mx-group">
        <div className="mx-group-head">
          <span className="mx-el-icon">{def.icon ?? "▢"}</span>
          <Text variant="label-sm" className="mx-group-title">
            {def.label ?? node.type}
          </Text>
          {breakpoint !== "base" && (
            <Badge size="sm" variant="info">
              {breakpoint}
            </Badge>
          )}
          <span className="mx-spacer" />
          <IconButton
            variant="ghost"
            size="sm"
            icon={<CopySimple />}
            aria-label="Duplicate element"
            onClick={() => store.duplicate(node.id)}
          />
          <IconButton
            variant="ghost"
            size="sm"
            icon={<Trash />}
            aria-label="Delete element"
            onClick={() => store.removeElement(node.id)}
          />
        </div>
        <Text variant="body-sm" className="text-ink-light">
          {def.aiMeta.description}
        </Text>
      </div>

      {("columns" in props || "padding" in props || "gap" in props) && (
        <div className="mx-group">
          <Text variant="label-sm" className="text-ink-light mx-cat">
            Layout
          </Text>
          {"columns" in props && (
            <Row label="Columns">
              <Tabs value={String(resolved.columns ?? 1)} onValueChange={(v: string) => setProp("columns", Number(v))} variant="pill">
                <TabsList>
                  {["1", "2", "3", "4"].map((n) => (
                    <TabsTrigger key={n} value={n}>
                      {n}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </Row>
          )}
          {(["padding", "gap"] as const)
            .filter((k) => k in props)
            .map((k) => (
              <StepRow key={k} label={k} value={Number(resolved[k] ?? 0)} onChange={(n) => setProp(k, n)} />
            ))}
        </div>
      )}

      <div className="mx-group">
        <Text variant="label-sm" className="text-ink-light mx-cat">
          Style
        </Text>
        {"background" in props && (
          <Row label="Background">
            <div className="mx-chips">
              {BACKGROUND_TOKENS.map((t) => (
                <button
                  key={t}
                  className={`mx-chip${resolved.background === t ? " is-on" : ""}`}
                  onClick={() => setProp("background", resolved.background === t ? undefined : t)}
                >
                  {t.replace("gradient:", "◆ ")}
                </button>
              ))}
            </div>
          </Row>
        )}
        {!("background" in props) && (
          <ColorRow
            label="Background"
            value={style.backgroundColor as string | undefined}
            onChange={(v) => setStyleKeys({ backgroundColor: v })}
          />
        )}
        <PairRow
          label="Border"
          icons={[<Square key="w" size={13} />, <CornersOut key="r" size={13} />]}
          values={[px("borderWidth"), px("borderRadius")]}
          onChange={(side, v) =>
            side === 0
              ? setStyleKeys({
                  borderWidth: v > 0 ? `${v}px` : undefined,
                  borderStyle: v > 0 ? "solid" : undefined,
                })
              : setPx("borderRadius")(v)
          }
        />
        <ColorRow
          label="Border"
          value={style.borderColor as string | undefined}
          onChange={(v) => setStyleKeys({ borderColor: v })}
        />
        <PairRow
          label="X Padding"
          icons={[<ArrowLineLeft key="l" size={13} />, <ArrowLineRight key="r" size={13} />]}
          values={[px("paddingLeft"), px("paddingRight")]}
          onChange={(side, v) => setPx(side === 0 ? "paddingLeft" : "paddingRight")(v)}
        />
        <PairRow
          label="Y Padding"
          icons={[<ArrowLineUp key="t" size={13} />, <ArrowLineDown key="b" size={13} />]}
          values={[px("paddingTop"), px("paddingBottom")]}
          onChange={(side, v) => setPx(side === 0 ? "paddingTop" : "paddingBottom")(v)}
        />
      </div>

      {generic.length > 0 && (
        <div className="mx-group">
          <Text variant="label-sm" className="text-ink-light mx-cat">
            {def.label ?? node.type} props
          </Text>
          {generic.map(([key, hint]) => {
            const opts = enumOptions(hint);
            if (opts && opts.length <= 4)
              return (
                <Row key={key} label={key}>
                  <Tabs value={String(resolved[key] ?? opts[0])} onValueChange={(v: string) => setProp(key, v)} variant="pill">
                    <TabsList>
                      {opts.map((o) => (
                        <TabsTrigger key={o} value={o}>
                          {o}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </Row>
              );
            if (opts)
              return (
                <Row key={key} label={key}>
                  <Select value={String(resolved[key] ?? "")} onValueChange={(v: string) => setProp(key, v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={opts[0]} />
                    </SelectTrigger>
                    <SelectContent>
                      {opts.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Row>
              );
            if (hint.includes("boolean"))
              return (
                <Row key={key} label={key}>
                  <Switch checked={Boolean(resolved[key])} onCheckedChange={(c: boolean) => setProp(key, c)} />
                </Row>
              );
            if (isNumericHint(hint))
              return (
                <Row key={key} label={key}>
                  <Input
                    type="number"
                    value={String(resolved[key] ?? "")}
                    onChange={(e) => setProp(key, e.target.value === "" ? undefined : Number(e.target.value))}
                  />
                </Row>
              );
            const long = key === "content" || key === "items" || hint.includes("per line");
            return (
              <Field key={key} label={key} helperText={hint.split("—")[0].trim()}>
                {long ? (
                  <Textarea rows={3} value={String(resolved[key] ?? "")} onChange={(e) => setProp(key, e.target.value)} />
                ) : (
                  <Input value={String(resolved[key] ?? "")} onChange={(e) => setProp(key, e.target.value)} />
                )}
              </Field>
            );
          })}
        </div>
      )}

      <details className="mx-adv">
        <summary>
          <Text variant="label-sm" className="text-ink-light">
            Advanced · states
          </Text>
        </summary>
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
          defaultValue={JSON.stringify(stateObj, null, 2)}
          placeholder={state === "default" ? '{ "borderRadius": "12px" }' : '{ "backgroundColor": "#3730a3" }'}
          onBlur={(e) => setStateJson(e.target.value)}
        />
        <Text variant="body-sm" className="text-ink-light">
          {state === "default" ? "Base CSS override (_style)." : `CSS applied on :${state}.`}
        </Text>
      </details>
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
