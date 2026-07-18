# 6. Element CSS overrides

Most styling should go through **Theme tokens + semantic Style Props** so it
stays portable and themeable. When you need a one-off, every Element supports a
raw CSS escape hatch: the `_style` prop.

## The `_style` prop

`_style` is a plain object of CSS properties (camelCase or kebab-case). The
compiler wraps the Element's output in a `<div>` carrying those styles. The
canvas applies it the same way, so it previews live.

```ts
store.updateProps(node.id, {
  _style: { boxShadow: "0 8px 24px rgba(0,0,0,.12)", borderRadius: "12px" },
});
```

Compiled HTML becomes:

```html
<div style="box-shadow:0 8px 24px rgba(0,0,0,.12);border-radius:12px">
  <a href="#">Buy</a>
</div>
```

## In the Inspector

The Inspector has a collapsible **CSS override (_style)** section with a JSON
editor. Paste CSS-in-JS, blur to apply:

```json
{ "boxShadow": "0 8px 24px rgba(0,0,0,.12)", "borderRadius": "12px" }
```

Invalid JSON is ignored until it parses, so you can type freely.

## Rules and limits

- `_style` is filtered out of the Inspector's normal prop list (props starting
  with `_` are internal).
- It is applied **only where the Capability Profile permits raw CSS** — web
  targets. The email compiler (MJML) will ignore or translate it, since email
  can't take arbitrary CSS.
- Prefer Style Props + tokens for anything you'll reuse or theme. Reach for
  `_style` for genuine one-offs.

## When to add a real Style Prop instead

If you find yourself applying the same `_style` repeatedly, promote it to a
first-class prop on a [custom Element](./08-custom-elements.md) (or a variant of
a built-in) so it's themeable, agent-legible via `aiMeta`, and shows up as a
proper Inspector control.
