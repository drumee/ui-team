/**
 * Rect maths for the guided flows' spotlight.
 *
 * The cutout has exactly ONE hole, so a step whose surface is really two
 * elements — a popup plus whichever of its dropdowns is open — has to cut the
 * box that contains both. This is that box, kept pure and away from the DOM
 * query that finds the elements: the query belongs to whichever flow owns the
 * selectors, the arithmetic is the same everywhere and is the part worth
 * testing.
 */

/**
 * The smallest box containing `rect` and every rect in `rects`.
 *
 * Zero-width or zero-height entries are ignored rather than unioned. A closed
 * dropdown still measures — it is `visibility: hidden`, not `display: none` —
 * and some of them collapse to a zero box rather than disappearing, which would
 * otherwise drag the hole to the viewport origin.
 *
 * Returns a plain object rather than a DOMRect: callers only read the six
 * fields, and a DOMRect cannot be constructed from parts in every browser this
 * ships to.
 *
 * @param {DOMRect|{left,top,right,bottom,width,height}} rect the anchor box
 * @param {Array<DOMRect|Object>} [rects] boxes to take in
 * @returns {{left, top, right, bottom, width, height}}
 */
function unionRects(rect, rects = []) {
  let left = rect.left;
  let top = rect.top;
  let right = rect.right;
  let bottom = rect.bottom;
  for (const r of rects) {
    if (!r?.width || !r?.height) continue;
    left = Math.min(left, r.left);
    top = Math.min(top, r.top);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  }
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

module.exports = { unionRects };
