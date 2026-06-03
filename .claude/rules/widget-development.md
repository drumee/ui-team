---
paths:
  - "src/drumee/builtins/widget/**/*.js"
  - "src/drumee/builtins/panel/**/*.js"
  - "src/drumee/builtins/editor/**/*.js"
  - "src/drumee/builtins/messenger/**/*.js"
  - "src/drumee/builtins/media/**/*.js"
  - "src/drumee/builtins/window/**/widget/**/*.js"
  - "src/drumee/builtins/permission/**/*.js"
  - "src/drumee/builtins/player/**/widget/**/*.js"
  - "src/drumee/builtins/webrtc/**/*.js"
  - "src/drumee/api/lib/**/*.js"
  - "src/drumee/modules/**/*.js"
  - "letc/template/index.js.tpl"
---

# Widget Development

Base classes + full method list: CLAUDE.md → "Widget base classes" / "Widget model helpers".

## Base class

For a **new standard widget**:
- Plain widget → extend **`LetcBox`**.
- Media/filesystem node (file, folder, hub) → extend **`DrumeeMFS`**.
- Lightweight/leaf widget (no model lifecycle) → may extend `Marionette.View`.

**Don't change an existing widget's base class.** Several intentionally extend other bases and the rule above does NOT override them:
- editors extend their player base (`__editor_diagram extends __player`),
- MFS-node panels extend `mfsInteract` (`__panel_trash`),
- simple widgets extend `Marionette.View`.

Match the sibling/parent pattern of the file you're editing, not a blanket rule.

## Lifecycle — respect the order

- `constructor` — method binding only (`_.bindAll`). No DOM, no fetch.
- `initialize(opt)` — `super.initialize(opt)`, `require('./skin')` *only if the widget has a `skin/` module* (several media widgets — uploader, paste, flag — don't), `declareHandlers()` (if it handles child events), `bindEvent(_a.live)` (if it needs WS).
- `onDomRefresh()` — fetch data, then feed the skeleton. Match the skeleton's export shape: CommonJS (`module.exports = fn`) → `this.feed(require('./skeleton')(this))`; ESM default → `this.feed(require('./skeleton').default(this))`. Both shapes exist in this repo (see `skeleton-ui.md`).
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

The WS dispatcher calls `onWsMessage(service, model, options)` — the **first arg is the service string**. Switch on it directly; don't read `service` out of `options` (it's usually `{}`, so `opts || svc` would silently skip every case).

```js
onWsMessage(service, data, opts = {}) {
  switch (service) {
    case SERVICE.channel.post: /* ... */ break;
    default: if (super.onWsMessage) super.onWsMessage(service, data, opts);
  }
}
```
