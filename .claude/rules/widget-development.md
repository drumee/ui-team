---
paths:
  - "src/drumee/**/*.js"
---

# Widget Development

Base classes + full method list: CLAUDE.md → "Widget base classes" / "Widget model helpers".

## Base class

For a **new standard widget**:
- Plain widget → extend **`LetcBox`**.
- Media/filesystem node (file, folder, hub) → extend **`DrumeeMFS`**.
- Lightweight/leaf widget (no model lifecycle) → may extend `Marionette.View`.

**Source of truth for filesystem methods/properties:** the `DrumeeMFS` global is `class __core_mfs extends LetcBox`, defined in `node_modules/@drumee/ui-core/letc/mfs.js`. All MFS-node behavior lives there — type flags (`initData()` → `isMfs`/`isHub`/`isFolder`/`isHubOrFolder`), permission helpers (`isGranted`, `canUpload`, `canManageAccess`, `canRemove`, …), identity (`getCurrentNid`, `isRegularFile`, `getHostId`), links (`url`, `viewerLink`, `directUrl`), download (`download`, `fetchFile`), `metadata()`, `fullname()`, `markAsSeen()`, `unselect()`. When you need exact semantics — or a method not in CLAUDE.md's "MFS (Media File System)" section — read that file; it's canonical. Vendored in `node_modules`, so it changes by upgrading `@drumee/ui-core`, not by editing in place.

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
