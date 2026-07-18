# 19 — The Grab Layer (element-anchored agent edits)

The grab layer is the react-grab interaction applied to the Document Model:
point at an element, and either **ask the agent to change it** or **copy its
exact context** for an external agent (Claude Code, Cursor, any MCP client).

Where react-grab must fiber-walk a React app to recover source locations, the
builder already owns the structure — so grabbed context is the node itself plus
its registry contract (`aiMeta`, prop hints), which is strictly more precise
than a `file:line`.

## In-canvas UX

With an element selected (and not typing):

- **⌘K / Ctrl+K** — opens the anchored prompt bubble ("What should change
  here?"). Submitting emits `agent:intent`; whoever hosts the planner executes.
  The blockbar `✦` button does the same.
- **⌘C / Ctrl+C** — copies the element's context block to the clipboard (only
  when no real text selection exists). The blockbar `⧈` button does the same.

## Store API

```ts
store.askAgent(intent, id?)      // emit agent:intent { id, intent } (id defaults to selection)
store.grabContext(id)            // paste-ready context string | null
await store.copyContext(id)      // grab + clipboard + emit grab:copy

store.on("agent:intent", ({ id, intent }) => { /* run the planner */ });
store.on("grab:copy", ({ id, context }) => { /* toast, log, … */ });
```

`buildNodeContext({ doc, registry, id })` and `nodePath(doc, id)` are exported
for headless use (MCP server, tests).

## The context block

```
<grabbed-element id="b2" type="button">
path: root#r1 > section#s1 > button#b2
props: {"label":"Buy now"}
element: Button — call to action
prop hints:
  label: short imperative text
document outline (id: type):
  r1: root
  s1: section
  b2: button
</grabbed-element>
```

## Planner integration

`planCommands` accepts an optional `focus` string. When present, the system
prompt instructs the model to target that element unless the intent clearly
says otherwise. The registry remains the hard boundary — a grabbed element
widens *precision*, never the command surface.

```ts
const plan = await planCommands(provider, {
  commands: store.listCommands(),
  docOutline: outline,
  intent,
  focus: store.grabContext(selectedId) ?? undefined,
});
store.applyPlan(plan); // one undo step, logged
```

The playground's AgentPanel subscribes to `agent:intent` and shows anchored
asks in the chat with a `✦ type#id` chip; `grab:copy` gets a confirmation
message. With no API key, the mock planner targets the grabbed element so the
flow is demoable offline.
