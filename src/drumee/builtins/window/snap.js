// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/window/snap
//   TYPE : Helper
// ==================================================================== *

/**
 * Window snap / tile geometry, shared by any window that offers the
 * macOS-style "Move & Resize" presets (zoom, tile left, tile right,
 * reframe).
 *
 * These were originally private methods on `window/folder`. They are
 * lifted here verbatim so a second consumer (the image player) can snap
 * with identical semantics instead of growing its own near-copy. Every
 * function takes the window view as its first argument; nothing is bound
 * to a particular class.
 *
 * Callers supply their own minimums through `opt` — the folder window
 * floors at 760×480, the image player is happy much smaller — and the
 * effective minimum is always capped to the workspace so two half-tiles
 * on a narrow screen can't each be clamped up and overlap.
 */

const DEFAULT_MIN_WIDTH = 760;
const DEFAULT_MIN_HEIGHT = 480;

/**
 * The WM canvas: right of the desk sidebar, below the top header. Falls
 * back to the viewport when the desk chrome isn't mounted (DMZ share).
 */
function workspaceRect() {
  const el =
    document.querySelector(".desk-module__wm-container") ||
    document.querySelector(".desk-module__right-side");
  const r = el ? el.getBoundingClientRect() : {};
  return {
    width: Math.round(r.width || window.innerWidth),
    height: Math.round(r.height || window.innerHeight),
  };
}

/**
 * Current geometry, parent-relative. Reads the style model first (the
 * authoritative value) and degrades through the inline style to the
 * measured box.
 */
function snapshotBounds(ui) {
  const m = (ui.style && ui.style.toJSON()) || {};
  const el = ui.el;
  const pos = ui.$el.position() || { left: 0, top: 0 };
  const px = (v, fallback) => {
    if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
    const n = parseFloat(v);
    return Number.isFinite(n) ? Math.round(n) : fallback;
  };
  return {
    left: px(m.left, px(el.style.left, Math.round(pos.left))),
    top: px(m.top, px(el.style.top, Math.round(pos.top))),
    width: px(m.width, px(el.style.width, ui.$el.outerWidth())),
    height: px(m.height, px(el.style.height, ui.$el.outerHeight())),
  };
}

/**
 * Clamp `bounds` to the workspace and animate the window there.
 *
 * `.window__ui` carries a stylesheet floor (min-width 600 / min-height 320
 * in window/skin/window.scss) and CSS min-width WINS over a smaller inline
 * width — so a half-tile narrower than that would render back up and the
 * two tiles would overlap even though the JS geometry is right. Pin the
 * inline minimum to the applied size to override the floor, and keep the
 * resizable minimum in sync so a manual drag right after tiling doesn't
 * snap the tile back up.
 */
function applyBounds(ui, bounds, opt = {}) {
  const ws = workspaceRect();
  const baseMinW = (ui.size && ui.size.minWidth) || DEFAULT_MIN_WIDTH;
  const baseMinH = (ui.size && ui.size.minHeight) || DEFAULT_MIN_HEIGHT;
  const minW = Math.min(opt.minWidth || baseMinW, ws.width);
  const minH = Math.min(opt.minHeight || baseMinH, ws.height);
  const width = Math.max(minW, Math.min(bounds.width, ws.width));
  const height = Math.max(minH, Math.min(bounds.height, ws.height));
  const next = {
    left: Math.max(0, Math.min(bounds.left, Math.max(0, ws.width - width))),
    top: Math.max(0, Math.min(bounds.top, Math.max(0, ws.height - height))),
    width,
    height,
  };
  ui.size = { ...ui.size, width: next.width, height: next.height };
  ui.style.set(next);
  ui.$el.css({ minWidth: minW, minHeight: minH });
  try {
    ui.$el.resizable(_a.option, "minWidth", minW);
    ui.$el.resizable(_a.option, "minHeight", minH);
  } catch (e) {}
  ui.$el.stop(true, false).animate(next, {
    duration: 220,
    queue: false,
    complete: () => {
      ui.$el.css(next);
      if (ui.syncBounds) ui.syncBounds(true);
    },
  });
}

/**
 * Apply bounds, but if the window is in browser fullscreen, exit first and
 * defer to `fullscreenchange`. Resizing while still fullscreen animates
 * against the fullscreen overlay — the browser ignores inline geometry
 * until exit, so the animation is invisible and the final geometry can be
 * wrong.
 */
function applyBoundsAfterFs(ui, bounds, opt) {
  if (document.fullscreenElement === ui.el) {
    ui._preFsBounds = null;
    const onChange = () => {
      if (document.fullscreenElement === ui.el) return;
      document.removeEventListener("fullscreenchange", onChange);
      _.delay(() => applyBounds(ui, bounds, opt), 50);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.exitFullscreen();
    return;
  }
  applyBounds(ui, bounds, opt);
}

/**
 * Fill the workspace, or restore the pre-zoom geometry on a second call.
 *
 * While the window is in browser fullscreen the WM's resize handler has
 * already overwritten `ui.style` with viewport-sized values, so a fresh
 * snapshot would cache the viewport as the restore target — fall back to
 * `_preFsBounds`, captured before fullscreen entry.
 */
function toggleZoom(ui, opt) {
  const inFs = document.fullscreenElement === ui.el;
  const preFsSafe = inFs ? ui._preFsBounds : null;

  let target;
  if (ui._zoomed && ui._preZoomBounds) {
    target = ui._preZoomBounds;
    ui._zoomed = false;
    ui._preZoomBounds = null;
  } else {
    ui._preZoomBounds = preFsSafe || snapshotBounds(ui);
    const ws = workspaceRect();
    target = { left: 0, top: 0, width: ws.width, height: ws.height };
    ui._zoomed = true;
  }
  ui.el.dataset.zoomed = ui._zoomed ? 1 : 0;
  applyBoundsAfterFs(ui, target, opt);
}

/**
 * Tile to the left or right half. Left gets the floored half and right the
 * remainder, so an odd workspace width splits with no overlap and no gap.
 */
function tileToSide(ui, side, opt = {}) {
  const ws = workspaceRect();
  const halfW = Math.floor(ws.width / 2);
  const leftW = halfW;
  const rightW = ws.width - halfW;
  const bounds =
    side === "right"
      ? { left: halfW, top: 0, width: rightW, height: ws.height }
      : { left: 0, top: 0, width: leftW, height: ws.height };
  ui._zoomed = false;
  ui._preZoomBounds = null;
  ui.el.dataset.zoomed = 0;
  // A half-tile is narrower than any sane window minimum on a workspace
  // under 2× that minimum; pass the tile's own width so it can shrink to
  // exactly half the screen.
  applyBoundsAfterFs(ui, bounds, {
    ...opt,
    minWidth: side === "right" ? rightW : leftW,
  });
}

/**
 * Restore to `bounds` — the caller's notion of its default geometry.
 */
function reframe(ui, bounds, opt) {
  ui._zoomed = false;
  ui._preZoomBounds = null;
  ui.el.dataset.zoomed = 0;
  applyBoundsAfterFs(
    ui,
    {
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
    },
    opt,
  );
}

module.exports = {
  workspaceRect,
  snapshotBounds,
  applyBounds,
  applyBoundsAfterFs,
  toggleZoom,
  tileToSide,
  reframe,
};
