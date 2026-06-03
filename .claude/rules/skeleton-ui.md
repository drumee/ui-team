---
paths:
  - "**/skeleton/**/*.js"
---

# Skeleton & Event Wiring

Component reference: CLAUDE.md → "Skeletons Component Reference".

## Structure

- Export a function `(ui, ...) => Skeletons.*` tree (`module.exports = function(...)` or `.default`).
- `const pfx = ui.fig.family;` then use as BEM root: `` className: `${pfx}__container` ``.
- ❌ never hardcode the family string — always derive from `ui.fig.family`.

## Build with Skeletons only

- ✅ `Skeletons.Box.Y/X/G/Z`, `Button.Svg/Label`, `Entry`, `EntryBox`, `Textarea`, `Messenger`, `RichText`, `List.Smart/Scroll/Table`, `Avatar`, `Image.Smart`, `Progress`, `Note`.
- ❌ raw HTML strings, `$('<div>')`, `innerHTML`, hand-written markup templates.

## Event wiring — two channels

- **Action → logic**: `service: 'send', uiHandler: [ui]` → fires `ui.onUiEvent(cmd, args)`. `uiHandler` MUST be an array. Handler signature is `onUiEvent(cmd, args)` — `cmd` is the triggering command object (has `.get`/`.mget`), and the service is read inside via `args.service || cmd.get(_a.service)`. The first arg is **not** the service string.
- **Lifecycle → part**: `sys_pn: _a.list, partHandler: ui` → fires `ui.onPartReady(child, _a.list)`.

## Forms

- Bind inputs with `formItem: 'fieldName'`; read all values back via `ui.getData()`.

## Text

- **Static** copy / labels via `LOCALE.*` — never hardcoded literals. Runtime/model data is the exception: `content: ui.mget(_a.filename)`, `content: name.withoutTag()` etc. render dynamic values, not locale keys.
