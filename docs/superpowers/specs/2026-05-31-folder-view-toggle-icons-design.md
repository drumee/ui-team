# Folder window — List/Grid view-toggle icons

**Date:** 2026-05-31
**Status:** Approved (design)
**Scope:** UI only (`ui-team`), folder window topbar

## Problem

The folder window topbar has a single button that switches the file browser
between **list** (row) and **grid** (icon) view. Today it uses one icon
(`square-split-horizontal`) that merely **rotates 90°** via `data-state` — the
same glyph for both modes, so it does not visually communicate which view is
active or available.

The user supplied two reference glyphs (from Google Drive's view switcher):

- **List** — three rounded horizontal bars
- **Grid** — a 2×2 set of rounded squares

Goal: replace the rotating split icon with these two distinct glyphs.

## Decision

**Single toggle button that shows the CURRENT view's icon** (chosen over
Google-Drive-style "target view" and over a two-button segmented control).

- In **list** view → show the **list** glyph (3 bars).
- In **grid** view → show the **grid** glyph (2×2).
- Clicking toggles the view (unchanged behavior).

This keeps the existing single-button architecture; only the displayed glyph
changes.

## Scope boundaries

- **In scope:** the `splitBtn` in `folder/skeleton/topbar.js` (the file
  view-toggle), its CSS, and two new sprite icons.
- **Out of scope:** the two other `square-split-horizontal` usages in
  `window/skeleton/toolkit/index.js` (window tile-left / tile-right menu) —
  unrelated to file views, leave untouched.
- No change to `toggleFilesLayout`, `getViewMode`, `setViewMode`, or any
  toggle behavior. This is a display-layer change only.

## Current state (reference)

`src/drumee/builtins/window/folder/skeleton/topbar.js` (~L111):

```js
const splitBtn = Skeletons.Button.Svg({
  className: `${cnFolder}__control-icon`,
  ico: "square-split-horizontal",
  service: "toggle-files-layout",
  sys_pn: "view-ctrl",
  state: ui.getViewMode && ui.getViewMode() === _a.row ? 1 : 0, // 1 = list/row
  uiHandler: [ui],
});
```

`src/drumee/builtins/window/folder/index.js` `toggleFilesLayout(cmd)` (~L586)
already flips the button state when the view changes:

- switch to **row/list** → `cmd.changeState(1)`
- switch to **icon/grid** → `cmd.changeState(0)`

So `data-state` on the button already tracks the live view. The icon swap can
ride on it with **no JS change**.

CSS today (`folder/skin/index.scss` ~L474): `&__control-icon[data-state="1"] svg
{ transform: rotate(90deg); }` (duplicated ~L483). These rotate rules are
removed for this button.

## Implementation approach

**CSS dual-icon swap** (recommended; same idiom as the toolkit fullscreen
"two CSS-swapped labels"):

1. **Two sprite icons** in `icons/src/normalized/`:
   - `view-list.svg` — three rounded bars (source path below)
   - `view-grid.svg` — 2×2 rounded squares (source path below)
   - Normalize both to a **consistent square viewBox `0 0 20 20`**, `fill="currentColor"`,
     with the source path centered via a `<g transform>` (scale + translate),
     matching the inset style of the existing `square-split-horizontal.svg`
     (which wraps a 13.75-unit glyph in a 20×20 box). This keeps the two new
     glyphs at equal optical weight at the 20×20 control size.
   - Run `npm run build:icons` to regenerate `icons/sprites/`.

2. **Skeleton** — replace the single `Button.Svg` with a clickable container
   (`Box.X`, same `${cnFolder}__control-icon` class) carrying the same
   `service: "toggle-files-layout"`, `sys_pn: "view-ctrl"`, `uiHandler: [ui]`,
   and `state` expression. It holds **both** icons as children:
   - `Image.Svg({ ico: "view-list", className: "...--list" })`
   - `Image.Svg({ ico: "view-grid", className: "...--grid" })`
   - `changeState(1/0)` continues to set `data-state`, so CSS selects the glyph.

3. **CSS** (`folder/skin/index.scss`):
   - Remove the two `rotate(90deg)` rules for `&__control-icon[data-state="1"] svg`.
   - Default-hide both child icons; show only the one matching the button's
     `data-state`:
     - `data-state="1"` (list active) → show `--list`, hide `--grid`
     - `data-state="0"` (grid active) → show `--grid`, hide `--list`
   - Keep existing 20×20 sizing and hover/cursor styles.

### Source glyph paths (from user; checkmark excluded)

The user's list snippet also contained a checkmark path
(`M3 9.23529L6.84 13L15 5`) — that is Google Drive's "selected" marker in a
dropdown, **not** part of the icon; exclude it.

**List** (viewBox `0 0 14 12`):
```
M1 0C0.447715 0 0 0.447715 0 1C0 1.55228 0.447715 2 1 2H13C13.5523 2 14 1.55228 14 1C14 0.447715 13.5523 0 13 0H1ZM0 6C0 5.44772 0.447715 5 1 5H13C13.5523 5 14 5.44772 14 6C14 6.55228 13.5523 7 13 7H1C0.447715 7 0 6.55228 0 6ZM1 10C0.447715 10 0 10.4477 0 11C0 11.5523 0.447715 12 1 12H13C13.5523 12 14 11.5523 14 11C14 10.4477 13.5523 10 13 10H1Z
```

**Grid** (viewBox `0 0 14 14`):
```
M0 1C0 0.447715 0.447715 0 1 0H5C5.55228 0 6 0.447715 6 1V5C6 5.55228 5.55228 6 5 6H1C0.447715 6 0 5.55228 0 5V1ZM2 2H4V4H2V2ZM0 9C0 8.44772 0.447715 8 1 8H5C5.55228 8 6 8.44772 6 9V13C6 13.5523 5.55228 14 5 14H1C0.447715 14 0 13.5523 0 13V9ZM2 10H4V12H2V10ZM9 0C8.44772 0 8 0.447715 8 1V5C8 5.55228 8.44772 6 9 6H13C13.5523 6 14 5.55228 14 5V1C14 0.447715 13.5523 0 13 0H9ZM12 2H10V4H12V2ZM8 9C8 8.44772 8.44772 8 9 8H13C13.5523 8 14 8.44772 14 9V13C14 13.5523 13.5523 14 13 14H9C8.44772 14 8 13.5523 8 13V9ZM10 10H12V12H10V10Z
```

## Testing / verification

No automated test runner in this repo. Manual verification after
`npm run build:icons` + dev deploy (`npm run dev`, then `pm2 restart vudangnt`
on the endpoint so the new sprite/bundle is served):

1. Open a folder window in grid view → topbar shows the **grid** glyph.
2. Click → switches to list view → glyph becomes the **list** glyph.
3. Click again → back to grid + grid glyph. No 90° rotation artifact.
4. Confirm hover/color states match the other control icons.
5. Confirm the window tile-left/right menu icons are unchanged.

## Risks

- **viewBox aspect**: list source is 14×12 (non-square). Normalizing into a
  20×20 box (centered) avoids vertical stretch; verify optical balance vs the
  square grid glyph after build.
- **Box vs Button.Svg click parity**: confirm the `Box.X` container fires
  `toggle-files-layout` and receives `changeState` exactly as the prior
  `Button.Svg` did (same `sys_pn`/`service`/`uiHandler`).
