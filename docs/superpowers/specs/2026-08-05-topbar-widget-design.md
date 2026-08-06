# Reusable Topbar widget

**Date:** 2026-08-05
**Status:** approved, ready for implementation plan

## Problem

The image player owns a bespoke header
(`builtins/player/image/skeleton/topbar.js`) that hard-codes its own
identity block, its own action row, and its own gear button. The generic
`builtins/player/skeleton/topbar.js` is a second, differently-shaped
implementation of the same idea. Any future viewer — PDF, video,
document — would be a third.

Nothing in either file is player-specific except the data: an icon, a
title, and a list of buttons. Extract the layout, keep the data with the
consumer.

## Goals

- One Topbar used by any module that needs a standard header.
- Left section parameter-driven; right section fully data-driven.
- The three defaults (Folder Settings, Move & Resize, Close) injected by
  the widget, not restated by every consumer.
- Folder Settings becomes a configurable dropdown with recursively
  nested submenus, no depth limit.
- Widget contains zero business logic. Every action's meaning stays in
  the consumer's `onUiEvent`.

## Consumers

- **Image player** — all three defaults, plus save-rotation in `before`.
- **Document player** — all three defaults, `close` re-pointed at
  `_e.close`, an ext-derived file-type tile, and its conditional actions
  in `before`. Adopting the defaults meant teaching it the widget's
  vocabulary: it now answers the four `window-*` snap services through the
  same `builtins/window/snap` module the image player and folder window
  use, and its inline `doc-zoom` button was dropped as a duplicate of the
  panel's "full" preset.

## Non-goals

- Migrating `builtins/player/skeleton/topbar.js` (audio, video, text,
  vector, stream). Out of scope for this change.
- Viewport edge-flip for submenus. Not needed: the dropdown is pinned to
  the topbar's right edge, so submenus open inward (leftward) and stay on
  screen at any depth without measuring anything. See Dropdown.
- A `LetcBox` subclass. The Topbar is a skeleton factory (see
  Architecture).

## Architecture

### Placement

```
builtins/player/widget/topbar/
  index.js              Topbar(ui, config) -> skeleton
  skeleton/
    left.js             identity: filetype tile + title
    actions.js          slots -> ordered action list
    action.js           one TopbarAction -> skeleton
    menu.js             recursive dropdown
    move-resize.js      moved from image/skeleton/move-resize.js
  skin/
    index.scss          moved from image/skin/topbar.scss, re-namespaced
```

Sits beside the existing `builtins/player/widget/invitation/`, so it
follows the established widget layout and is reachable from any module
as `require('builtins/player/widget/topbar')`.

### Skeleton factory, not a class

`index.js` exports `function (ui, config) -> skeleton descriptor`. It is
composed into a parent's skeleton exactly the way `topbar.js` is
consumed today (`require('./topbar')(ui)`).

No class means no lifecycle to own, no part registry of its own, and no
event interception: services declared on the actions bubble to the
consumer's `onUiEvent` through the standard `uiHandler` chain. This is
what keeps business logic out of the widget.

### CSS namespace

The widget derives its class prefix from `config.fig || ui.fig`, so a
consumer that passes `fig: { family: 'player-image', group: 'player' }`
gets byte-identical class names to today's markup. `skin/index.scss` is
written against a `&-topbar` block nested under the family root, which
is how `image/skin/topbar.scss` is already structured.

## Public API

```js
Topbar(ui, {
  fig:   { family, group },          // optional, defaults to ui.fig
  left:  { fileTypeIcon, title },
  right: { before: [], after: [] },
  defaults: {
    "folder-settings": { icon, menu, visible, service },
    "move-resize":     { visible },
    "close":           { icon, service, visible },
  },
})
```

### Render order

```
before...
folder-settings      <- default block, fixed order
move-resize          <-
close                <-
after...
```

`before` and `after` are the only insertion points. A default is dropped
entirely with `visible: false`; it is never reordered.

The `defaults` keys are configuration names, not part names. Each default
emits a fixed `sys_pn` so existing part lookups keep resolving:

| `defaults` key | emitted `sys_pn` |
|---|---|
| `folder-settings` | `ctrl-gear` |
| `move-resize` | `snap-wrapper` (trigger: `ctrl-expand`) |
| `close` | `ctrl-close-window` |

For a custom `TopbarAction`, `sys_pn` is its `id`.

### Left section

```
Box.X  .{family}-topbar__identity          service: _e.raise
  Box.X  .{family}-topbar__filetype        kidsOpt: { active: 0 }
    Image.Svg  ico: left.fileTypeIcon
  Note   .{group}__title                   sys_pn: "player-title"
         content: left.title
```

Both fields are optional. The tile is omitted when `fileTypeIcon` is
absent; the note is omitted when `title` is absent.

`sys_pn: "player-title"` is fixed, not derived — `player/interact.js:246`
looks the part up by that exact name.

### TopbarAction

```ts
interface TopbarAction {
  id:         string;            // becomes sys_pn
  type:       "button" | "menu" | "custom";
  icon?:      string;
  label?:     string;
  className?: string;
  service?:   string;
  handler?:   Function;          // mapped to the framework's on_click
  visible?:   boolean;           // default true; false omits the node
  disabled?:  boolean;           // dataset.disabled = 1, active: 0
  dataset?:   object;            // passed through verbatim
  value?:     any;               // passed through verbatim
  menu?:      MenuItem[];        // type: "menu" only
  component?: object|Function;   // type: "custom" only

  // Straight pass-throughs to Button.Svg
  tooltips?:    object;          // hover bubble
  icons?:       string[];        // two-state icon swap, paired with `state`
  state?:       number;
  partHandler?: object;          // register the button as a part
  style?:       object;
}
```

### Rebuilding just the action row

```js
Topbar.actions(ui, config)   // -> the `commands` Box.X
```

For consumers that refresh their actions without rebuilding the header —
feed `.kids` into the `commands` part. Takes the same config object, so a
consumer keeps one source of truth and hands it to both entry points. The
document player's `updateMenu()` uses this.

| `type` | Renders |
|---|---|
| `button` | `Button.Svg({ ico: icon, sys_pn: id, service })`, or `Button.Label` when `label` is set |
| `menu` | `menu.js(ui, action)` — see below |
| `custom` | `component`, either a skeleton or `(ui) => skeleton` |

### MenuItem

```ts
interface MenuItem {
  id?:        string;
  label:      string;
  icon?:      string;
  service?:   string;
  value?:     any;               // passed through (rotate rows need it)
  type?:      string;            // passed through (info row sets type: _a.info)
  disabled?:  boolean;
  separator?: boolean;           // renders Element.separator, ignores all else
  children?:  MenuItem[];        // recursive, no depth limit
}
```

`value`, `type` and `separator` are additions beyond the original brief.
They are required to express the image player's existing catalog without
behaviour drift — the rotate rows carry `value: ±90`, the info row
carries `type: _a.info`, and the catalog uses separators between
sections.

## Dropdown

Level 0 reuses the framework primitive `KIND.menu.topic`
(`@drumee/ui-core/letc/widgets/menu`). It already implements
click-to-open, outside-click dismissal via `RADIO_CLICK`, and stable
positioning. None of that is reimplemented.

Two things about this primitive bite hard, and both did:

**The wrapper has no generic class.** Its parts are named from its own
`fig.family`, which is `menu-topic` (`figName` is the class name,
`__menu_topic`). So the panel wrapper is `menu-topic-items__wrapper` and
only the inner box carries a bare `menu-items`. There is no
`menu-items__wrapper` to style. Pass `itemsClass` and style that instead —
the widget uses `{wcn}__menu-panel`. Miss this and the panel is never
taken out of flow: it sits inside the 24px action row and lays itself
across the header.

**`display` needs three classes to stick.** Every Box is a `.drumee-box`,
and `skin/lib/container.scss` sets `.drumee-box[data-flow="y"] { display:
flex }` at (0,2,0). A one-class `display: none` loses, so submenus render
permanently open, stacked over the panel. The open/closed pair is written
at (0,3,0)/(0,4,0), which is why the shared contextmenu nests its rule
four deep.

```js
Box.X .{family}-topbar__menu
  {
    kind:        KIND.menu.topic,
    itemsClass:  `${wcn}__menu-panel`,   // the ONLY hook on the wrapper
    flow:        _a.y,
    opening:     _e.click,
    persistence: _a.once,
    sys_pn:      action.id,
    service:     action.service,
    trigger:     Button.Svg({ ico: action.icon, sys_pn: action.triggerPn,
                              className: action.className }),
    items:       Box.Y(action.menu.map(row)),
  }
```

Levels 1+ recurse using the pattern already established in
`contextmenu/skeleton/items.js:38-70`:

```
row(item, depth):
  if item.separator -> Element .separator

  Box.X .{family}-topbar__menu-item   data-depth={depth}
        service, value, type, uiHandler: [ui], kidsOpt: { active: 0 }
    Image.Svg(item.icon)      if icon
    Note(item.label)          .__label
    if item.children:
      Note("›")               .__chevron
      Box.Y .__submenu        item.children.map(row, depth + 1)
```

Recursion is unbounded. Submenus open on `:hover` in CSS, matching the
contextmenu behaviour users already know. A row with children still
carries its own `service` (the catalog's `rotate-menu` row is a
documented no-op), so parent rows remain addressable.

Submenus open **leftward**, unlike the shared contextmenu's. The panel is
pinned to the topbar's right edge, so its rows sit hard against the
window edge and a rightward submenu lands off-screen at any window width
— confirmed in a render harness before the direction was chosen. Opening
inward is what makes edge-flip logic unnecessary.

`persistence: _a.once` means any row click closes the menu, including a
click on a parent row. Submenus are opened by hover, so this only costs a
mis-click.

## Image player migration

`image/skeleton/topbar.js` collapses to a config block. `move-resize.js`
moves into the widget; the image player stops requiring it directly.

```js
module.exports = function (ui) {
  return Topbar(ui, {
    left: {
      fileTypeIcon: "bg-image",
      title: ui.model.get(_a.filename),
    },
    right: {
      before: [{
        id: "save-rotation-button",
        type: "button",
        icon: "checked-circle",
        className: "icon save-rotation",
        service: "save-rotation",
        dataset: { pending: 0 },
      }],
      after: [],
    },
    defaults: {
      "folder-settings": { icon: "folder-settings", menu: ui.fileMenu() },
      "close":           { icon: "cross", service: "close-player" },
    },
  });
};
```

### Preserved identifiers

These strings are load-bearing and must survive the migration byte for
byte:

| Identifier | Consumer |
|---|---|
| `topbar` | part lookup |
| `commands` | part lookup |
| `player-title` | `player/interact.js:246` |
| `save-rotation-button` | `_syncRotationPending()` via `__saveRotationButton` |
| `ctrl-gear` | gear part |
| `ctrl-expand` | snap trigger |
| `ctrl-close-window` | deliberately not `ctrl-close`; `skeleton/slider.js` owns that name on the same handler |
| `snap-wrapper`, `snap-menu`, `snap-full/left/right/center` | `_markSnapPreset()` |
| `.{group}__header` | drag handle selector, `player/interact.js:270` |

### Porting the gear catalog

`contextmenuItems()` and `_openFileMenu()` are replaced by a
`fileMenu()` method on the image player that returns `MenuItem[]`. The
permission branching is unchanged — it moves, it does not change shape:

```js
fileMenu() {
  const media    = this.media;
  const editable = !!media && !Visitor.inDmz && !!this.canUpload();
  const sections = [];

  const first = [];
  if (media && !Visitor.inDmz)              first.push(COPY);
  if (Visitor.inDmz || this.canDownload())  first.push(DOWNLOAD, PRINT);
  if (editable && media.imgCapable?.())     first.push(ROTATE);
  if (first.length) sections.push(first);
  ...
}
```

Row definitions ported from `contextmenu/skeleton/items.js`, keeping
every LOCALE constant and service string:

| Row | Label | Service | Notes |
|---|---|---|---|
| copy | `LOCALE.COPY` | `_e.copy` | |
| download | `LOCALE.DOWNLOAD` | `_e.download` | |
| print | `LOCALE.PRINT` | `print` | |
| rotate | `LOCALE.ROTATE` | `rotate-menu` | children: rotate-left `value:-90`, rotate-right `value:90`, both `_e.rotate`, ico `desktop_rotate` |
| rename | `LOCALE.RENAME` | `direct-rename` | |
| seeChatThreads | `LOCALE.CHAT_THREADS` | `chat-threads` | children: `LOCALE.VIEW_CHAT_THREADS`/`_a.chat`, `LOCALE.DOWNLOAD_CHAT_THREADS`/`download-file-chat` |
| secureShare | `LOCALE.SHARE` | `secure-share` | |
| designationLink | `LOCALE.DESIGNATION_LINK` | `designation-link` | |
| directUrl | `LOCALE.URL_ADDRESS` | `direct-url` | |
| info | `LOCALE.GET_INFO` | `_e.settings` | `type: _a.info` |
| trash | `LOCALE.MOVE_TO_TRASH` | `_e.remove` | |

Because every service string is preserved, the existing `onUiEvent`
switch and the `DELEGATED_SERVICES` forwarding in `image/index.js` keep
working with no edits.

### Bug fixed on the way through

`_syncRotationPending()` reads `this.__saveRotationButton`, but nothing
ever assigned it — so the save-rotation button's `data-pending` was never
flipped and the button stayed hidden however much you rotated. The part is
now captured in `onPartReady` and synced immediately, so it also survives
the re-feed the rotate path triggers.

### CSS specificity

The bar's geometry is written as
`.drumee-topbar .drumee-topbar__bar.drumee-topbar__bar` — (0,3,0).

Consumers style their header group by name; the players do it as
`.player__header.main` (builtins/player/skin/header.scss), which sets its
own padding at (0,2,0) on this exact element. A plain `.drumee-topbar__bar`
at (0,1,0) loses that, and the image player's padding regresses. The
widget cannot know consumer selectors, so it wins on weight. The old
`.player-image .player__header.main` rule was (0,3,0) too, so this is the
weight the markup already relied on.

### Dead code removed

- `image/skeleton/topbar.js` body (replaced by config)
- `image/skeleton/move-resize.js` (moved into the widget)
- `image/index.js`: `_openFileMenu()`, `contextmenuItems()`, the
  `contextmenuSkeleton` require, and `case 'open-file-menu'`
- `image/skin/topbar.scss` (moved into the widget's skin)

The right-click contextmenu path is unaffected — players park `"a"` in
`contextmenuSkeleton` to suppress it, and this change does not touch
that.

## Risks

**Menu drift.** The ported catalog is a hand-copy of eleven rows. A
label or service typo silently produces a dead row. Mitigation: the
table above is the checklist; verify each row's service against
`items.js` during implementation.

**Positioning regression.** `_openFileMenu` hand-clamped the menu to the
viewport; `KIND.menu.topic` does its own placement. The gear menu may
land differently near a screen edge. Accepted — the primitive's
behaviour is the house standard.

**Hover submenus in the dialog layer.** The old gear menu lived in
`drumeeDialog` and so escaped any parent `overflow: hidden`. The new one
is inline in the topbar, so the skin asserts `overflow: visible` from the
wrapper down through `.menu-topic`, `.menu-items__wrapper` and
`.menu-items`. Confirmed rendering correctly in a static harness; still
worth a look in the live player, where the window chrome adds ancestors
the harness does not have.

## Verification

No test harness covers players in this repo. What was verified
mechanically:

- `node --check` on all eight changed JS files.
- Both skins compile standalone (`sass --load-path=src/drumee
  --load-path=src/drumee/skin`).
- A stub-globals harness builds the topbar and dumps the skeleton tree:
  slot order, all preserved `sys_pn` values, four-level submenu
  recursion, separators, `disabled` -> `data-state="disable"`, and
  `value` passthrough all check out.
- A chromium screenshot of the real compiled skin, in the light theme,
  for the resting header, the closed and hovered gear menu, and the
  Move & Resize panel.

  The first version of this harness hand-wrote the dropdown markup and
  guessed the framework's class names, so it rendered a page that could
  not occur and passed both bugs above. A harness that asserts your own
  assumptions is worse than none. It now reproduces the real DOM —
  `menu-topic-items__wrapper`, `menu-topic-items menu-items`,
  `.drumee-box[data-flow]` — with `skin/lib/container.scss` and
  `skin/lib/menu.scss` compiled in, and both bugs reproduce in it before
  the fix and disappear after.

The rest is manual, in the live player:

1. Open an image from a workspace. Header renders: tile, filename, gear,
   expand, close. Save-rotation hidden.
2. Rotate via the gear menu. Save-rotation appears
   (`data-pending="1"`), commits, disappears.
3. Gear menu: every row present per permissions; Rotate and Chat Threads
   submenus expand on hover.
4. Expand: click zooms; hover opens the four presets; each snaps and
   marks `data-active`.
5. Close dismisses the player.
6. Repeat in a DMZ share link (no `media`) — the menu must degrade to
   the download/print/info subset without throwing.
