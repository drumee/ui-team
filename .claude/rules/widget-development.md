---
paths:
  - "src/drumee/builtins/widget/**/*.js"
  - "src/drumee/builtins/panel/**/*.js"
  - "src/drumee/builtins/editor/**/*.js"
  - "src/drumee/builtins/messenger/**/*.js"
---

# Widget Development

Base classes + full method list: CLAUDE.md → "Widget base classes" / "Widget model helpers".

## Base class

- Standard widget → extend **`LetcBox`**.
- Media/filesystem node (file, folder, hub) → extend **`DrumeeMFS`**.
- Nothing else.

## Lifecycle — respect the order

- `constructor` — method binding only (`_.bindAll`). No DOM, no fetch.
- `initialize(opt)` — `super.initialize(opt)`, `require('./skin')`, `declareHandlers()` (if it handles child events), `bindEvent(_a.live)` (if it needs WS).
- `onDomRefresh()` — fetch data, then `this.feed(require('./skeleton').default(this))`.
- `onPartReady(child, pn)` — wire named parts (the `sys_pn` parts).
- `onBeforeDestroy()` — `unbindEvent(_a.live)`, clear timers/intervals.

## DO

- Model access via `mget` / `mset` / `getAttr`; collect form values via `getData()`.
- Emit upward via `triggerHandlers({ service })` — never reach into a parent directly.
- Self-remove via `goodbye()`.

## DON'T

- ❌ `bindEvent(_a.live)` in `initialize` without `unbindEvent` in `onBeforeDestroy` → WS leak.
- ❌ touch the DOM before `onDomRefresh` / `onPartReady`.
- ❌ build markup inline — use a `skeleton/` (see `skeleton-ui.md`).

## WS message handler shape

```js
onWsMessage(svc, data, opts = {}) {
  const { service } = opts || svc;
  switch (service) {
    case SERVICE.channel.post: /* ... */ break;
    default: if (super.onWsMessage) super.onWsMessage(svc, data, opts);
  }
}
```
