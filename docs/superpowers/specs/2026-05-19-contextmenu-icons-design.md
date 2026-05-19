# Right-click Context Menu Icons — Design

**Date:** 2026-05-19
**Status:** Approved (pending spec review)

## Goal

Add icons to the right-click (context) menu items. Today every menu item
renders as text only. Download the 6 icons designed in Figma node
`4096:92111`, add them to `icons/src/normalized/`, and restructure every menu
item into a `Box.X` of `icon + label`.

## Background — current state

The right-click menu is rendered by `src/drumee/builtins/contextmenu/skeleton/`.
It is the active context menu: `src/drumee/builtins/media/core.js:106` assigns
`this.contextmenuSkeleton = require("builtins/contextmenu/skeleton")`, and
`@drumee/ui-core/letc/addons/letc.js` binds `el.oncontextmenu` →
`__handleContextmenu` → renders that skeleton.

- `skeleton/items.js` — `__button(ui, trigger, k)` builds each item. Each item is
  a `Skeletons.Note({ content, service })`. The rendered DOM is
  `<div class="media__contextmenu-item contextmenu-item [cn[k]] ... drumee-text">`
  wrapping an inner `<div class="note-content">TEXT</div>`.
- The icon code is **commented out**: `// const icon = require('./icons')(ui)`
  and `// r.chartId = icon[k]`. So the menu currently shows **zero icons**.
- `skeleton/icons.js` — `__icon(ui)` returns a `key → icon-name` map (unused).
- `skeleton/classes.js` — `__classname(ui)` returns a `key → css-class` map
  (`download → "download"`, `trash → "trash"`, etc.). Already applied.
- `skeleton/index.js` — iterates the per-widget `contextmenuItems` array and
  calls `__button` for each key.
- `skin/index.scss` — `.contextmenu-item` is already
  `display:flex; flex-direction:row; align-items:center; gap:4px; padding:4px`,
  and already defines `&__label { flex:1 }`. `.contextmenu-item.trash` is
  already `color: var(--red-500)`.

The item lists come from `media/core.js`: `contextmenuItemsForHub()`,
`contextmenuItemsForFolder()`, `contextmenuItemsForFiles()`. The "Delete" row in
those menus uses the key **`trash`** (`LOCALE.MOVE_TO_TRASH`, service
`_e.remove`) — not the key `delete`.

## Figma source

Node `4096:92111` (file `c9XlK4pYe1vF17s40ypCD8`) — a folder-action context
menu with 6 rows, each a 16×16 Phosphor-style line icon:

| Figma icon node | Figma name        | Menu key (codebase) |
|-----------------|-------------------|---------------------|
| `4096:92113`    | DownloadSimple    | `download`          |
| `4096:92116`    | PencilSimpleLine  | `rename`            |
| `4096:92119`    | ReplitLogo        | `organize`          |
| `4096:92122`    | Copy              | `makeACopy`         |
| `4096:92125`    | Hash              | `seeChatThreads`    |
| `4096:92128`    | Trash             | `trash`             |

## Scope decisions (confirmed with user)

1. **Whole menu** — icon rendering is enabled for every menu item, not only the
   6 from Figma. Items become `Box.X` of `icon + label`.
2. **New files, own names** — the 6 Figma icons are saved as new SVG files
   prefixed `ctxmenu-`. Existing icons (`file-download.svg`, `drumee-trash.svg`,
   …) are NOT overwritten — `drumee-trash` alone is used in 7 other places.
3. **14 unmapped keys stay blank** — keys with no `icons.js` entry
   (`deleteMeeting, deletePermanently, edit, info, linkToTaskTracker,
   manageAccess, meetingLink, move, openInWindow, qrcode, restoreToDesk, share,
   startMeeting, pricing`) render as a `Box.X` with the label only (no icon).
   They get icons later when designs are available.

## Design

### 1. Icon assets

Download the 6 icon nodes from Figma as SVG (16×16 viewBox), save to
`icons/src/normalized/`:

| File                       | From Figma node |
|----------------------------|-----------------|
| `ctxmenu-download.svg`     | `4096:92113`    |
| `ctxmenu-rename.svg`       | `4096:92116`    |
| `ctxmenu-organize.svg`     | `4096:92119`    |
| `ctxmenu-copy.svg`         | `4096:92122`    |
| `ctxmenu-chat-thread.svg`  | `4096:92125`    |
| `ctxmenu-delete.svg`       | `4096:92128`    |

Then run `npm run build:icons` to regenerate the sprite sheets in
`icons/sprites/`.

### 2. `skeleton/icons.js`

Repoint the 6 affected keys (and add `trash`, currently missing):

```js
download:       "ctxmenu-download",
rename:         "ctxmenu-rename",
organize:       "ctxmenu-organize",
makeACopy:      "ctxmenu-copy",
seeChatThreads: "ctxmenu-chat-thread",
delete:         "ctxmenu-delete",
remove:         "ctxmenu-delete",
trash:          "ctxmenu-delete",   // NEW — was unmapped
```

All other existing entries are unchanged. The ~31 already-mapped keys keep
their current sprite icons.

### 3. `skeleton/items.js` — render icon + label

- Re-enable `const icon = require('./icons')(ui);`.
- After resolving `r = a[k]`, set `className` (`pfx` + `cn[k]`) and `uiHandler`
  as today, then convert the item to a `Box.X`:

  **Regular item** (currently a `Note`): return
  ```js
  Skeletons.Box.X({
    className: baseCls,                       // "...contextmenu-item [cn[k]]"
    service: r.service, mode: r.mode, type: r.type,
    value: r.value, dataset: r.dataset,       // transfer interaction props
    uiHandler: [ui],
    kidsOpt: { active: 0 },                   // clicks bubble to the Box.X
    kids: [
      icon[k] ? Skeletons.Image.Svg({ ico: icon[k], className: "contextmenu-item__icon" }) : null,
      Skeletons.Note({ content: r.content, className: "contextmenu-item__label" }),
    ],
  })
  ```
  Falsy `kids` entries are filtered by the framework, so an unmapped key
  yields a `Box.X` with the label only.

- **`organize`** — already a `Box.X` whose first kid is a `__label` Note. Keep
  it; just `unshift` an `Skeletons.Image.Svg({ ico: icon.organize,
  className: "contextmenu-item__icon" })` into its `kids`.

- **`separator`** — `Skeletons.Element({ className: "separator" })`. Not a menu
  row; left unchanged (no `Box.X`, no icon).

Interaction props that must move from the old `Note` onto the `Box.X` wrapper
(so `onUiEvent` can read them off the clicked element): `service`, `mode`
(`edit`), `type` (`info`, `export*`, `import*`), `value` (`rotateLeft`,
`rotateRight`), `dataset` (`paste`, `exportHidden`, `importHidden`).

### 4. `skin/index.scss`

Add icon sizing under `.contextmenu-item`:

```scss
&__icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
```

`.contextmenu-item` is already a flex row with `gap:4px`; `&__label{flex:1}`
already exists; `.contextmenu-item.trash` is already red, so the trash icon
inherits red via `currentColor`.

## Files changed

- `icons/src/normalized/ctxmenu-{download,rename,organize,copy,chat-thread,delete}.svg` — new
- `icons/sprites/*` — regenerated by `npm run build:icons`
- `src/drumee/builtins/contextmenu/skeleton/icons.js` — repoint 6 keys, add `trash`
- `src/drumee/builtins/contextmenu/skeleton/items.js` — re-enable icons, wrap items in `Box.X`
- `src/drumee/builtins/contextmenu/skin/index.scss` — add `&__icon`

## Verification (manual — no test runner)

1. `npm run build:icons` succeeds; the 6 `ctxmenu-*` symbols appear in
   `icons/sprites/normalized.sprite.txt`.
2. Build/deploy, then right-click in the desk:
   - On a **folder** — Download / Rename / Organize / Make a copy / Delete each
     show the new Phosphor icon; Delete icon is red.
   - On a **file** and a **hub** — mapped items (Download, Rename, Copy, …) show
     icons; the 14 unmapped items (Get info, Show QR code, Share, …) show label
     only, no icon, no layout break.
   - Clicking any item still triggers its action (service reaches `onUiEvent`).
3. Confirm no regression in screens that use `drumee-trash` / `file-*` icons —
   those sprite icons were not modified.

## Out of scope

- Changing which items appear in each menu (`media/core.js` `contextmenuItems*`).
  Note: the Figma node shows a "See chat threads" row that
  `contextmenuItemsForFolder()` does not currently render — not addressed here.
- Icons for the 14 unmapped keys (await Figma designs).
- Restyling submenu rows beyond inheriting the new structure.
