---
paths:
  - "**/skeleton/**/*.js"
  - "**/skeleton/**/*.coffee"
  - "**/skeleton/**/*.js.tpl"
---

# Skeleton & Event Wiring

Component reference: CLAUDE.md → "Skeletons Component Reference".

**Source of truth for the components themselves:** the `Skeletons.*` builders are defined in `node_modules/@drumee/ui-core/letc/toolkit/skeleton/` — one file/dir per type (`box-y.js`, `box-x.js`, `box-g.js`, `box-z.js`, `button/`, `entry/`, `list/`, `image/`, `note.js`, `avatar.js`, `profile.js`, `messenger.js`, `rich-text.js`, `progress.js`, `file-selector.js`, `wrapper-x.js`/`wrapper-y.js`, plus `menu.js`, `switch.js`, `switcher.js`), wired up in `factory.js`. When you need a component's exact props/defaults/behavior — or a type not listed in CLAUDE.md — read that dir; it's canonical. It's vendored in `node_modules`, so it changes by upgrading `@drumee/ui-core`, not by editing in place.

## Structure

- A **skeleton factory** exports a function `(ui, ...) => Skeletons.*` tree (`module.exports = function(...)` or `.default`). **Exception:** helper/aggregate modules that happen to live under a `skeleton/` dir export named utilities instead (e.g. `upload-progress/skeleton/helpers.js` → `{ getFileIcon, formatSpeed }`, or `invite-popup/skeleton/index.js` exporting the factory **plus** named utils). Keep their existing export shape — don't force them into a single factory.
- `const pfx = ui.fig.family;` then use as BEM root: `` className: `${pfx}__container` ``.
- ❌ never hardcode **this widget's own** family string — derive it from `ui.fig.family`. **Exception:** when a skeleton renders a *child* component's placeholder, it may hardcode that child's BEM root so the markup matches the child's `skin/` (e.g. `const memberListItemFig = 'widget-members-listItem'` matching `members-list-item/skin`). Use the child's real family, not `ui.fig.family`, in that case.

## Build with Skeletons only

- ✅ `Skeletons.Box.Y/X/G/Z`, `Button.Svg/Label`, `Entry`, `EntryBox`, `Textarea`, `Messenger`, `RichText`, `List.Smart/Scroll/Table`, `Avatar`, `Menu`, `Image.Smart`, `Progress`, `Note`.
- ❌ raw HTML strings, `$('<div>')`, `innerHTML`, hand-written markup templates.
- **Exception:** a few legacy skeleton modules return a composed HTML **string** instead of a Skeletons tree (e.g. `media/minifyer/skeleton` → `<div>…</div>`, stored as `innerContent` by the caller). Maintain those in place; the ban is for **new** skeletons.

## Event wiring — two channels

- **Action → logic**: `service: 'send', uiHandler: [ui]` → fires `ui.onUiEvent(cmd, args)`. `uiHandler` MUST be an array. Handler signature is `onUiEvent(cmd, args)` — `cmd` is the triggering command object (has `.get`/`.mget`), and the service is read inside via `args.service || cmd.get(_a.service)`. The first arg is **not** the service string.
- **Lifecycle → part**: `sys_pn: _a.list, partHandler: ui` → fires `ui.onPartReady(child, _a.list)`.

## Emit upward — `triggerHandlers`, never a direct `onUiEvent` call

- To raise an event from a widget to its handler(s), call `this.triggerHandlers({ service: '...' , ... })`. ❌ don't call `someHandler.onUiEvent(...)` (or any cached widget ref's `onUiEvent`) directly.
- **Why:** `triggerHandlers` resolves the *current* handler list at fire time via `getHandlers(_a.ui)` (walks the `uiHandler` list / parent chain) and honors `active`/`bubble`/signal routing. A direct call targets one fixed reference, which may be a **volatile** handler — menus, popups, flyovers auto-remove on click-outside/anywhere (`volatility` 1/2/4) — so the ref can be stale or destroyed, sending the event to the wrong/dead widget. `triggerHandlers` always reaches the right live handler(s).

## Forms

- Bind inputs with `formItem: 'fieldName'`; read all values back via `ui.getData()`.

## Text

- **Static** copy / labels via `LOCALE.*` — never hardcoded literals. Runtime/model data is the exception: `content: ui.mget(_a.filename)`, `content: name.withoutTag()` etc. render dynamic values, not locale keys.
