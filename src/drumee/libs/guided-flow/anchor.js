/**
 * Where a guide's coach callout goes.
 *
 * Pure geometry: a target rect and the viewport in, a viewport-space
 * {left, top} out. It writes nothing and reads no globals, which is the point
 * — this is the part of the spotlight worth testing, and it could not be
 * exercised while it lived as two methods on a LetcBox subclass.
 *
 * `left` is the coach's CENTRE: the stylesheets translate it -50% on X.
 */

// Layout constants, shared by every flow so their coaches sit alike.
const M = 12;      // viewport margin
const TOP = 64;    // keep clear of the ~52px topbar
const CH = 156;    // approx coach height (brand header + text + button)
const CW = 300;    // coach width (see each skin's __coach)

/** The viewport, with the fallbacks the callers used to carry inline. Split out
 *  so both functions read it the same way and tests can pass one in. */
function viewport({ vw, vh } = {}) {
  const win = typeof window !== "undefined" ? window : null;
  return {
    vw: vw || win?.innerWidth || 1280,
    vh: vh || win?.innerHeight || 800,
  };
}

/**
 * Centre the coach in the viewport.
 *
 * Used when nothing is spotlighted (a sub-step that dims everything and cuts
 * nothing out): with the whole screen dimmed there is no target to sit beside,
 * so the callout becomes the only thing on screen.
 *
 * @param {{vw?: Number, vh?: Number}} [size]
 * @returns {{side: String, style: {left: String, top: String}}}
 */
function coachCenter(size) {
  const { vw, vh } = viewport(size);
  return {
    side: "below",
    style: {
      left: `${vw / 2}px`,
      top: `${Math.max(TOP, (vh - CH) / 2)}px`,
    },
  };
}

/**
 * Position the coach beside `rect`, always fully on screen and clear of the
 * topbar.
 *
 * Small targets (a button, a menu item, a form) get the coach just below — or
 * above, when that is what fits or what the caller asked for.
 *
 * Tall panels (a permission panel, the secure-share dock, anything that can
 * fill most of the height) cannot be cleared vertically at all, so the coach
 * drops into the widest empty margin BESIDE the panel, sitting just outside its
 * near edge rather than centred in the gap — that reads as attached to the
 * thing it points at. A panel that is effectively full-width leaves no margin
 * to use, so the coach pins just under the topbar instead. This is what stops
 * the coach being clipped off the top edge.
 *
 * @param {DOMRect|{left,top,right,bottom,width,height}} rect the target's box
 * @param {Number} cx the target's horizontal centre
 * @param {{prefAbove?: Boolean, vw?: Number, vh?: Number}} [opt] `prefAbove`
 *   puts the coach ABOVE the target when there is room, instead of the default
 *   "below if it fits" — for a target the coach must not sit under or over,
 *   like the bottom-docked upload-progress window.
 * @returns {{side: String, style: {left: String, top: String}}}
 */
function coachAnchor(rect, cx, { prefAbove = false, vw, vh } = {}) {
  const v = viewport({ vw, vh });
  const half = CW / 2;
  const clampX = (x) => Math.min(Math.max(x, M + half), v.vw - M - half);
  const clampY = (y) => Math.min(Math.max(y, TOP), v.vh - CH - M);

  if (rect.height > v.vh * 0.6) {
    const leftGap = rect.left;
    const rightGap = v.vw - rect.right;
    const midY = clampY(rect.top + rect.height / 2 - CH / 2);
    if (leftGap >= CW + 2 * M && leftGap >= rightGap) {
      return {
        side: "left",
        style: { left: `${clampX(rect.left - M - half)}px`, top: `${midY}px` },
      };
    }
    if (rightGap >= CW + 2 * M) {
      return {
        side: "right",
        style: { left: `${clampX(rect.right + M + half)}px`, top: `${midY}px` },
      };
    }
    // Full-width: pin under the topbar, centred on the panel.
    return { side: "below", style: { left: `${clampX(cx)}px`, top: `${TOP}px` } };
  }

  // Small target: below if it fits, else above, else clamped — unless the
  // caller asked for above, which then wins whenever it fits.
  const below = rect.bottom + M;
  const above = rect.top - M - CH;
  let top;
  let side;
  if (prefAbove && above >= TOP) { top = above; side = "above"; }
  else if (below + CH + M <= v.vh) { top = below; side = "below"; }
  else if (above >= TOP) { top = above; side = "above"; }
  else { top = TOP; side = "below"; }
  return { side, style: { left: `${clampX(cx)}px`, top: `${clampY(top)}px` } };
}

module.exports = { coachAnchor, coachCenter, M, TOP, CH, CW };
