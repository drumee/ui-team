/**
 * Drop-zone table for the task panel.
 *
 * Pure: no DOM writes, no panel state, no globals — the caller supplies both
 * the hit element and a small context, so this resolves identically for a
 * native file drag, a jQuery-UI node drag, and the positionless window-manager
 * route. That is the whole point: the three entry points used to reason about
 * where a file lands in three slightly different ways.
 *
 * Refusal is the default. A pointer that matches no zone returns null, and the
 * caller turns that into WRONG_DROP_AREA rather than quietly attaching the file
 * to whatever surface happens to be open.
 */

// Ordered most-specific first. `closest` runs per entry, so an inner zone wins
// over an outer one regardless of DOM nesting depth. __comment-row and
// __attachments are SIBLING subtrees in __modal-main, so they never contend —
// the ordering matters only for __comment-replybox, which sits beside rows in a
// thread group.
const ZONES = [
  { sel: "__comment-replybox", scope: "comment-reply" },
  { sel: "__comment-row[data-comment-id]", scope: "comment-row" },
  { sel: "__comment-composer", scope: "comment" },
  { sel: "__attachments", scope: "detail" },
  { sel: "__create-files", scope: "create" },
];

/**
 * Resolve a pointer's element to a drop-zone descriptor, or null to refuse.
 *
 * Returns the matched zone ELEMENT alongside the scope so the caller never has
 * to look it up again — that second lookup is how the lit overlay and the
 * resolved scope drift apart.
 *
 * @param {string} pfx    the panel's BEM family, e.g. "tasks-panel"
 * @param {Element} el    the element under the pointer (see _dropPointEl)
 * @param {Object} ctx    { contains(node), isOwnComment(id) }
 * @returns {{scope: string, key: string, el: Element, commentId?: string}|null}
 */
function resolveZone(pfx, el, ctx) {
  if (!el || !el.closest) return null;
  for (const z of ZONES) {
    const n = el.closest(`.${pfx}${z.sel}`);
    if (!n || !ctx.contains(n)) continue;
    if (z.scope === "comment-row") {
      const id = n.getAttribute("data-comment-id");
      // Author-only server-side (_ownComment). Refuse rather than fall through
      // to the enclosing surface: a silent task attach is the bug class this
      // rework removes.
      if (!id || !ctx.isOwnComment(id)) return null;
      return {
        scope: "comment-row",
        key: `comment-row:${id}`,
        el: n,
        commentId: id,
      };
    }
    return { scope: z.scope, key: z.scope, el: n };
  }
  return null;
}

module.exports = { ZONES, resolveZone };
