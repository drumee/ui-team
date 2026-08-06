// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/player/widget/topbar/flip
//   TYPE : Behaviour
// ==================================================================== *

/**
 * Keep submenus inside the viewport.
 *
 * Submenus open outward (to the right), matching every other menu in the
 * app. The dropdown they hang off is pinned to the topbar's RIGHT edge,
 * though, so outward is towards the window edge and a submenu clips
 * whenever there is not ~230px to spare — which is most of the time.
 *
 * On hover, a row that owns a submenu is measured and the submenu is
 * marked `data-flip="left"` when it would not fit; the skin then opens it
 * inward instead. Cleared each time, so a window dragged left reverts to
 * opening outward.
 *
 * The measurement is of the ROW, which is already laid out — not of the
 * submenu, which is `display: none` until the hover it is reacting to and
 * would need a frame to measure. That keeps the decision synchronous, so
 * the submenu never paints on the wrong side first.
 *
 * One delegated listener for the whole app: menus are rebuilt on every
 * re-feed and nest arbitrarily deep, so per-row binding would have to be
 * redone constantly.
 */

// The skin caps a submenu at 220px; add the 8px gap it is offset by and a
// little air so the flip happens before the edge, not on it.
const NEEDED = 220 + 8 + 8;

let installed = 0;

/**
 * The right edge the submenu must stay inside.
 *
 * NOT simply the viewport: a player window may clip its own contents —
 * `.player-video__ui` sets `overflow: hidden` to keep the video inside the
 * window's rounded corners — and then the submenu disappears at the
 * player's edge, well short of the screen. Walk up to the nearest ancestor
 * that actually clips and use its box; fall back to the viewport when
 * nothing does.
 */
function boundary(el) {
  for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
    const o = getComputedStyle(n);
    if (o.overflowX !== "visible" && o.overflowX !== "clip") {
      return n.getBoundingClientRect().right;
    }
  }
  return window.innerWidth;
}

function onPointerOver(e) {
  const target = e.target;
  if (!target || !target.closest) return;

  const row = target.closest(".drumee-topbar__menu-item");
  if (!row) return;

  const sub = row.querySelector(":scope > .drumee-topbar__submenu");
  if (!sub) return;

  const r = row.getBoundingClientRect();
  if (!r.width) return;

  if (r.right + NEEDED > boundary(row)) {
    sub.dataset.flip = "left";
  } else {
    delete sub.dataset.flip;
  }
}

/** Idempotent — every menu build calls it, only the first one binds. */
module.exports = function () {
  if (installed || typeof document === "undefined") return;
  installed = 1;
  document.addEventListener("pointerover", onPointerOver, true);
};
