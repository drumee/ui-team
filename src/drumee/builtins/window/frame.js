// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/window/frame
//   TYPE : Helper
// ==================================================================== *

/**
 * Dock a file viewer into the FOLDER WINDOW it was opened from.
 *
 * A viewer (image, PDF, office editor, note…) is not a child of the folder
 * window — `Wm._launchApp` appends it to the same WM layer as a free-floating
 * sibling — so by default it sizes and centers itself against the whole desk
 * workspace and lands wherever the cascade puts it. Inside a workspace the
 * expected behaviour is different:
 *
 *   working files (docx/xlsx/pptx…, notes and the other editors)
 *       → fill the folder's BODY: the whole frame under the folder's own top
 *         bar and tab bar (so both stay reachable — the desk top bar is not
 *         the reference).
 *   read-only files (PDF, images, text, vectors, video…)
 *       → fill the FILES panel only: the file display area next to the chat.
 *         That column is `--files-w` wide (2/3 by default) and the user can
 *         re-split it, so the viewer follows whatever width the chat leaves.
 *
 * Everything is measured from the live DOM and re-applied whenever the folder
 * body resizes, the splitter moves or the folder switches tab, so there is no
 * geometry to keep in sync by hand.
 *
 * Scope guard: this only ever engages for a file opened from inside a
 * `window_folder`. Files opened from the desk home, the search window, the
 * dock or a DMZ share resolve no host frame and keep their historical
 * free-floating geometry, untouched.
 */

// Office extensions — the same list the document player uses to decide whether
// a file goes to the editor, so "working file" means one thing in both places.
const OFFICE = require("player/document/editable");

// The folder window's body. `window-folder__*` — the family class — and not the
// shared `window__split-body` group class on purpose: the same `splitBody()`
// toolkit also builds the website and sharebox windows, which this docking is
// not specified for.
const HOST_SELECTOR = ".window-folder__split-body";
const FILES_SELECTOR = ":scope > .window__files-panel";

// `.window__ui` carries a stylesheet floor (min-width 600 / min-height 320 in
// window/skin/window.scss) and a CSS minimum WINS over a smaller inline width —
// a viewer docked into a narrow files column would render back up and spill
// over the chat. Pin the inline minimum to the size we apply, exactly as
// snap.applyBounds does for the tile presets.
function _pinMinimums(view, bounds) {
  view.$el.css({ minWidth: bounds.width, minHeight: bounds.height });
  try {
    view.$el.resizable(_a.option, "minWidth", bounds.width);
    view.$el.resizable(_a.option, "minHeight", bounds.height);
  } catch (e) {}
}

/**
 * The folder body element this viewer was opened from, or null.
 *
 * Resolved from the source MFS view's element rather than the widget tree: the
 * grid tile is physically inside the folder body whatever the parent chain
 * looks like, and a viewer opened without a tile (notification reveal, "open
 * created file" fallback) correctly resolves nothing.
 *
 * Cached on first call — by then the tile is still mounted, and re-querying on
 * every resize frame would be wasted work.
 */
function hostEl(view) {
  if (view._frameHost !== undefined) return view._frameHost;
  const media = view.media;
  const el =
    media && media.el && _.isFunction(media.el.closest)
      ? media.el.closest(HOST_SELECTOR)
      : null;
  view._frameHost = el || null;
  return view._frameHost;
}

/**
 * Working file (fills the folder body) vs read-only file (fills the files
 * column). Note the deliberate absence of a `mode === edit` test: EVERY file
 * opened from a grid tile carries `mode: edit` (media/interact.js forwards it
 * with the open-node service), so it says nothing about the file itself.
 */
function isWorkingFile(view) {
  const kind = `${view.mget(_a.kind) || ""}`;
  // Notes, markdown, diagrams, JSON — the editors are working files.
  if (/^editor_/.test(kind)) return true;
  const ext = `${view.mget(_a.ext) || view.mget(_a.extension) || ""}`
    .toString()
    .toLowerCase();
  return OFFICE.includes(ext);
}

/**
 * The element the viewer has to cover: the folder body for a working file, the
 * files panel for a read-only one.
 *
 * Answers null when the folder is not on the Files tab. The Chat, Tasks and
 * Meeting tabs hand that same area to another panel — Tasks and Meeting even
 * re-feed the body, removing the files panel outright — so there is no frame to
 * dock into and the viewer hides until Files comes back.
 */
function targetEl(view) {
  const host = hostEl(view);
  if (!host || !host.isConnected) return null;
  if (host.dataset.view !== "files") return null;
  if (isWorkingFile(view)) return host;
  return host.querySelector(FILES_SELECTOR);
}

/**
 * Target bounds in the viewer's own coordinate space (its offset parent is the
 * WM layer, whose origin is not the viewport origin), or null when there is no
 * frame to dock into.
 */
function bounds(view) {
  const el = targetEl(view);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  // A frame that measures zero is mid-layout (or display:none) — nothing
  // meaningful to apply.
  if (!r.width || !r.height) return null;
  const parent = view.el.offsetParent || view.el.parentElement || document.body;
  const pr = parent.getBoundingClientRect();
  return {
    left: Math.round(r.left - pr.left),
    top: Math.round(r.top - pr.top),
    width: Math.round(r.width),
    height: Math.round(r.height),
  };
}

/**
 * True once this viewer is docked — i.e. it was opened from a folder window,
 * whether or not its frame is visible right now.
 */
function isDocked(view) {
  const host = hostEl(view);
  return !!(host && host.isConnected);
}

/**
 * Whether this viewer should dock AT ALL — asked once, when it opens.
 *
 * Stricter than `isDocked`: it also requires a frame to be on screen right now.
 * A file opened from the Tasks tab (the tasks panel lives in the same folder
 * body) has a host but no files view, and must keep the free-floating geometry
 * rather than dock into a frame that isn't showing and vanish.
 */
function canDock(view) {
  return !!bounds(view);
}

/**
 * Show/hide the viewer along with its frame. Driven straight off the element:
 * the window keeps its geometry and its place in the z-order, so switching back
 * to Files brings it back exactly where it was.
 */
function _setVisible(view, visible) {
  if (view._frameHidden === !visible) return;
  view._frameHidden = !visible;
  view.el.dataset.framed = visible ? "docked" : "hidden";
  view.el.style.display = visible ? "" : "none";
}

/**
 * Apply the frame bounds to the viewer now.
 *
 * Players own how their CONTENT re-fits (the document player re-rasterizes its
 * pages, the image player re-letterboxes), so the geometry is written here and
 * the content is asked to catch up through the same hooks a manual resize uses.
 * A player that needs more than that implements `_onFrameDock`.
 */
function dock(view, opt = {}) {
  if (!view || view.isDestroyed()) return false;
  let b = bounds(view);
  if (!b) {
    // Docked but frame not showing → hide. Not docked at all (folder window
    // closed, file opened from the desk) → leave the window alone.
    if (isDocked(view)) _setVisible(view, false);
    return false;
  }
  // Reveal BEFORE the final measurement: a `display:none` element has no
  // offsetParent, so bounds() had to fall back to `parentElement` — which is
  // only the same box when the layer is the positioned ancestor. Measured once
  // visible, the reference is always the real containing block.
  const hidden = view._frameHidden;
  _setVisible(view, true);
  if (hidden) b = bounds(view) || b;
  if (_.isFunction(view._onFrameDock)) {
    view._onFrameDock(b, opt);
    return true;
  }
  // `initial` is the first dock, straight out of display(): the content has not
  // rendered yet and lays itself out from the box we are about to set, so the
  // re-fit hooks (which assume an already-sized content) are skipped.
  const refit = !opt.initial && view.__content;
  if (refit && _.isFunction(view._prepareChange)) view._prepareChange(b);
  view.size = {
    ...view.size,
    width: b.width,
    height: b.height - (view.topbarHeight || 0),
  };
  _pinMinimums(view, b);
  view.style.set(b);
  view.$el.stop(true, false).css(b);
  if (refit && _.isFunction(view.setContentSize)) {
    try {
      view.setContentSize();
    } catch (e) {
      view.warn && view.warn("[frame] setContentSize failed", e);
    }
  }
  view.trigger(_e.resize);
  return true;
}

/**
 * Keep the viewer glued to its frame.
 *
 * Three things move it: the folder body resizing (window resize, sidebar
 * collapse, the folder's own resize handles), the splitter changing
 * `--files-w`, and a tab switch swapping what lives in the body. The first is a
 * size change on the body, the second a size change on the files panel only —
 * the body does NOT change — and the third an attribute/children change on the
 * body, so all three are watched. The files panel is re-created on tab switch,
 * so the observed target is refreshed on every notification.
 */
function track(view, opt = {}) {
  if (!view || view._frameTracking) return;
  const host = hostEl(view);
  if (!host) return;
  view._frameTracking = 1;

  const refit = (o = {}) => {
    if (!view || view.isDestroyed()) return untrack(view);
    // Re-observe: the files panel is a different element after a tab switch.
    // The host itself is never released — it is observed for the whole life of
    // the viewer, and for a full-frame viewer it IS the target, so dropping it
    // would take the body-resize signal with it.
    const el = targetEl(view);
    if (el !== view._frameObserved) {
      if (view._frameObserved && view._frameObserved !== host) {
        view._frameRo.unobserve(view._frameObserved);
      }
      view._frameObserved = el || null;
      if (el) view._frameRo.observe(el);
    }
    dock(view, o);
  };

  // Coalesce to one frame: a splitter drag and a window resize both fire in
  // bursts, and each dock() re-rasterizes the content.
  const schedule = () => {
    if (view._frameRaf) return;
    view._frameRaf = requestAnimationFrame(() => {
      view._frameRaf = 0;
      refit();
    });
  };

  view._frameRo = new ResizeObserver(schedule);
  view._frameRo.observe(host);
  view._frameMo = new MutationObserver(schedule);
  view._frameMo.observe(host, {
    attributes: true,
    attributeFilter: ["data-view", "style"],
    childList: true,
  });
  refit(opt);
}

function untrack(view) {
  if (!view || !view._frameTracking) return;
  view._frameTracking = 0;
  if (view._frameRaf) cancelAnimationFrame(view._frameRaf);
  view._frameRaf = 0;
  if (view._frameRo) view._frameRo.disconnect();
  if (view._frameMo) view._frameMo.disconnect();
  view._frameRo = null;
  view._frameMo = null;
  view._frameObserved = null;
}

module.exports = {
  bounds,
  canDock,
  dock,
  hostEl,
  isDocked,
  isWorkingFile,
  targetEl,
  track,
  untrack,
};
