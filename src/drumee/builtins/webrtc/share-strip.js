// Which participant tiles the screen-share strip shows, and in what order
// (Figma "Meeting — Avatar on Share", 775:152829).
//
// While someone shares their screen the shared screen owns the stage and the
// participants sit in a strip beside it (a column on the right) or under it (a
// row, when the side panel is open). Google-Meet style, the strip always keeps
// people visible: up to SLOTS tiles, and when there are more than that, the
// last slot becomes a "+N" tile so at least SLOTS - 1 faces stay on screen.
//
// The spotlighted tile (data-focused: raised hand > presenter > dominant
// speaker > self, chosen by window_meeting._updateFloatFocus) always takes the
// first slot; everyone else keeps their join order.
//
// No DOM and no `this`: everything here runs under plain node in a test.

const SLOTS = 4;

/**
 * @param {Array<{focused?: boolean}>} tiles  in DOM (join) order
 * @param {number} [slots]
 * @returns {{ rank: number[], visible: boolean[], more: number }}
 *   rank[i]    visual position of tiles[i] (CSS `order`)
 *   visible[i] whether tiles[i] gets a slot
 *   more       how many are folded into the "+N" tile (0 = no such tile)
 */
function planShareStrip(tiles, slots = SLOTS) {
  const list = Array.isArray(tiles) ? tiles : [];
  const n = list.length;
  const order = list.map((_, i) => i);
  const f = list.findIndex((t) => t && t.focused);
  if (f > 0) {
    order.splice(f, 1);
    order.unshift(f);
  }
  const shown = n > slots ? slots - 1 : n;
  const rank = new Array(n);
  const visible = new Array(n);
  order.forEach((idx, pos) => {
    rank[idx] = pos;
    visible[idx] = pos < shown;
  });
  return { rank, visible, more: n - shown };
}

module.exports = { planShareStrip, SLOTS };
