# Image player chrome → Figma 3228-280002 / 3228-280861

Date: 2026-08-01
Target: `src/drumee/builtins/player/image`

## Goal

Bring the image player window's chrome in line with the Figma frames
[3228-280002](https://www.figma.com/design/g5V3PjhNMf5bHlsHMvV17w/Drumee?node-id=3228-280002)
(header + gear dropdown) and
[3228-280861](https://www.figma.com/design/g5V3PjhNMf5bHlsHMvV17w/Drumee?node-id=3228-280861)
(Move & Resize popover).

## Current state

`skeleton/topbar.js` renders: filename, then a flat icon row of
download / rotate-left / rotate-right / save-rotation, then the shared
`player/skeleton/control` close button. There is no file-type icon, no
dropdown, and no window-snap presets.

## Design

### 1. Header

56px tall, `--normal-bg-80` (`#e5e5ea` — exact token match for the Figma
fill), `0 22px` padding, 8px radius on the top corners only.

**Left cluster** — 32px tile, radius 6, `--overlay-bg-05` background,
holding the `image` sprite at 25.6px; then the filename at 16px/24px,
weight 600, `--normal-fg-10`. Keeps `service: _e.raise` so clicking the
title still raises the window, and stays inside the drag handle.

**Right cluster** — 12px gap, 24px hit boxes:

| Control | Action |
| --- | --- |
| Gear | opens the contextmenu dropdown (below) |
| Expand | fires `window-zoom`; hover reveals the Move & Resize panel |
| Close | `close-player` |

The download and rotate buttons move into the gear menu. The
**save-rotation** button stays in the header but is rendered only while a
rotation is pending (`dataset.pending`), so the resting header matches
Figma while the explicit-save behaviour is preserved.

### 2. Gear dropdown

Reuses the real contextmenu rather than a bespoke panel: the image player
declares `contextmenuItems()`, and the gear click feeds
`buildContextmenu`-shaped markup into the global `drumeeDialog`, anchored
to the gear button's rect and clamped to the viewport. Same DOM, classes,
skin and submenu behaviour as right-click — which already matches this
Figma frame (white surface, 4px radius, `0 1px 11px rgba(0,0,0,.13)`,
12px/600 rows, 16px icons). Right-clicking the player gets the same menu
for free.

Item order, per Figma:

```
copy · download · print · rotate ▸ · ─ · rename · seeChatThreads ▸ · ─ ·
secureShare · info · designationLink · ─ · trash
```

Two additions to `builtins/contextmenu/skeleton/{items,icons}.js`:

- **`print`** — sprite `print`, `LOCALE.PRINT` (already present in all
  locale files).
- **`rotate`** — a parent row with a Rotate left / Rotate right submenu,
  following the existing `organize` / `seeChatThreads` pattern. Needs a
  new `ROTATE` locale key.

**Service routing.** The player owns `_e.rotate`, `print` and `info`.
Everything else delegates to `this.media.onUiEvent(cmd)` — the source MFS
item already implements `copy`, `direct-rename`, `secure-share`,
`designation-link`, `chat-threads` and `remove`. When there is no
`this.media` (DMZ share, standalone open) those rows are omitted. Download
and print keep going through `_dmzGateDownload()`.

`printPdf()` — called by the inherited `case "print"` — does not exist
anywhere in the tree, so that path currently throws. The image player
implements `_printImage()`: a hidden iframe holding the slide URL, printed
on load and torn down afterwards.

### 3. Move & Resize

Mirrors `zoomMenu()` from `builtins/window/skeleton/toolkit/index.js`: the
expand icon fires `window-zoom` on click, and a CSS-hover panel exposes
the four presets. Panel styling per Figma — `--normal-bg-90`, radius 8,
padding `8px 12px 12px`, centered 12px label, four 32×32 radius-4 buttons,
the active one on `--overlay-bg-05`. The preset glyphs are the Figma's own
shapes (1.5px outline rect + inner block) drawn in CSS; no new sprites.

Services reuse the folder window's vocabulary:

| Button | Service | Result |
| --- | --- | --- |
| Full | `window-zoom` | fills the workspace |
| Left | `window-tile-left` | left half |
| Right | `window-tile-right` | right half |
| Center | `window-reframe` | restores the centered default |

The geometry helpers (`_workspaceRect`, `_snapshotBounds`, `_applyBounds`)
currently live only in `builtins/window/folder/index.js`. They move to a
shared `builtins/window/snap.js` exposing `workspaceRect(ui)`,
`snapshotBounds(ui)`, `applyBounds(ui, bounds, opt)` and the four preset
operations. The image player consumes it; the folder window is left
untouched so nothing working regresses.

### 4. Body

The header takes the top radius, so the image area keeps only its bottom
radius and the two meet flush.

## Non-goals

- No change to slide navigation, the load failsafe, or the rotation
  animation itself.
- No refactor of the folder window onto the shared snap module.
- No new sprites.

## Risks

- `rename` and `trash` invoked from inside the player act on the node the
  player is showing. Rename re-titles the window via the existing
  `updateContent` path; delete closes it (`goodbye()` on the media item's
  removal), so the player never orphans a deleted node.
- `this.media` is optional. Every delegated row is gated on its presence.
