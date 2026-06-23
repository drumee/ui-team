# Folder window — responsive to browser-window resize

**Date:** 2026-06-22
**Area:** `src/drumee/builtins/window/folder/`, `src/drumee/builtins/window/manager.js`
**Status:** Approved (Approach A)

## Goal

When the **browser window** (the website viewport) is resized, an open folder
window should adapt:

- The **headless workspace pane** (the full-area folder view) re-fits the new
  workspace size — it both **grows** and **shrinks** to track the viewport.
- **Popup** folder windows ("Open in Window") keep the size/position the user
  gave them, and are **only clamped inward** when the viewport shrinks so they
  never end up off-screen. They are never auto-grown.
- The folder's **inner content** reflows responsively (grid columns, topbar
  collapse, breadcrumb truncation, split-body → single column).

## What already works — no work required

Content reflow is already fully implemented in `folder/skin/index.scss`:

- `.window-folder__ui` declares `container-type: inline-size` /
  `container-name: window-folder-w`, so the folder is a **size container**.
- `@container window-folder-w (max-width: 700px)` provides the compact layout
  (topbar collapses to 32×32 chips, breadcrumb shows only the parent crumb,
  split-body collapses to one column).
- The file grid uses `grid-template-columns: repeat(auto-fill, var(--grid-cell-w))`,
  so columns reflow automatically.

These respond to the **window's own width**, not the viewport. They therefore
fire automatically once the window's geometry tracks the viewport — **no SCSS
changes are needed.** The only requirement is that the window width actually
changes on browser resize, which is exactly what the geometry work below
delivers.

## The two gaps

1. **Headless pane never re-fills on browser GROW.**
   `manager.js` `responsive()` only ever *shrinks* a window
   (`if (cw > area.width)`), so when the browser enlarges, the workspace pane
   keeps its old (smaller) size and leaves a gap against the work area.

2. **Popups aren't reliably clamped.**
   - `getWindowsPool()` returns **only one layer** — `headlessLayer` when it is
     non-empty, otherwise `windowsLayer` (`manager.js:1015`). So while a
     workspace pane is open, popup windows in `windowsLayer` are **not swept**
     by `responsive()` at all.
   - `responsive()` early-returns entirely when `getViewMode() === _a.row`
     (`manager.js:402`), skipping all window clamping in that state.

## Design (Approach A)

Two coordinated changes.

### 1. Folder-owned headless refill — `folder/index.js`

Add a debounced viewport-resize responder owned by the folder window:

- **Bind** in `initialize` (or alongside the existing headless wiring), guarded
  so it only does work for a **headless** folder. Skip entirely on mobile
  (`Visitor.isMobile()`), consistent with `applyDefaultBounds`.
- **Handler:** recompute `_defaultBounds()` (which for a headless folder returns
  the full work area) and apply it via the existing `_applyBoundsAfterFs(...)`.
  Because `_applyBounds` clamps to `_workspaceRect()` and animates, the pane
  grows *and* shrinks to exactly fill the new area. No new geometry math.
- **Debounce:** ~150ms `setTimeout`, matching the WM's own resize debounce, to
  coalesce rapid resize events.
- **Teardown:** remove the `window` resize listener and clear the pending timer
  in `onBeforeDestroy` (the folder already has one).
- **Popups:** the responder is a no-op for non-headless folders — popup clamping
  is owned by the WM (change 2). This avoids two animations fighting over the
  same element.

### 2. WM clamp fix — `manager.js` `responsive()`

Make popup clamp-only reliable in every state:

- **Sweep both layers.** Instead of iterating only `getWindowsPool()`, iterate
  the children of **both** `this.headlessLayer` and `this.windowsLayer` (when
  present). Popups are then clamped even while a workspace pane is open.
- **Don't bail clamping in `row` mode.** Restructure the
  `getViewMode() === _a.row` / `!this.iconsList` early-return so it only
  short-circuits the **icon-list grid** block (the `this.iconsList` /
  `_K.docViewer` / `syncGeometry` portion). The **window-clamp sweep** must run
  regardless of view mode.
- Keep the existing clamp behavior unchanged otherwise: shrink-only +
  reposition-inward, with the `audio_player` special case intact. Headless
  folders are refilled by change 1, so the WM sweep simply clamps them inward
  when needed (idempotent with change 1, since both target the work area).

## Out of scope

- No SCSS / content-layout changes (already handled by container queries).
- No change to popup proportional resizing (explicitly *clamp-only*).
- No change to manual edge-drag resize (`_resizeStart/_resize/_resizeStop`).

## Risks / verification

- **Double animation on the headless pane** (folder refill + WM clamp). Both
  target the same work-area geometry, so they converge rather than oscillate;
  verify no visible jitter on rapid resize.
- **Listener leak.** Verify the `window` resize listener and timer are removed
  on folder destroy / workspace switch.
- **Manual verification:**
  1. Open a workspace (headless pane) → shrink the browser → pane shrinks,
     content reflows to compact at ≤700px; grow the browser → pane re-fills, no
     gap.
  2. Open a popup folder, resize/move it, then shrink the browser → popup
     clamps fully on-screen; grow the browser → popup unchanged.
  3. Repeat (2) **while a workspace pane is open** → popup still clamps.
  4. Switch the WM into `row` view mode → windows still clamp on resize.
