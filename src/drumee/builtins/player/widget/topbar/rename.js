// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/player/widget/topbar/rename
//   TYPE : Behaviour
// ==================================================================== *

/**
 * Inline rename in the topbar title.
 *
 * The gear menu's Rename row used to be forwarded to the source MFS view,
 * which opens its editor on the tile in the folder grid — behind the
 * player, where the user cannot see it. This edits the title in place
 * instead: Enter or clicking away commits, Escape abandons.
 *
 * The server call is the one `media/core.js requestRename()` makes, and on
 * success the MFS view's own `afterRename` is handed the response so the
 * grid tile, its model and the parent folder update exactly as they do
 * when renaming from the grid.
 *
 * The input is a sibling of the title rather than a replacement for it:
 * the title is a Note with its own internals, and the skin hides it via
 * `data-renaming` while the input is up, so nothing has to be rebuilt.
 */

/**
 * The node this player is a view of. Players copy the media's properties
 * onto themselves, but the MFS view is authoritative while it exists.
 */
function subject(ui) {
  return ui.media && !ui.media.isDestroyed() ? ui.media : ui;
}

/**
 * @param {object} ui  the player
 */
const __player_topbar_rename = function (ui) {
  if (ui._titleRenaming) return;

  const part = ui.getPart("player-title");
  if (!part || part.isDestroyed() || !part.el) return;

  const label = part.el;
  const host = label.parentElement;
  if (!host) return;

  const node = subject(ui);
  const original = node.mget(_a.filename) || ui.mget(_a.filename) || "";

  ui._titleRenaming = 1;
  label.dataset.renaming = 1;

  const input = document.createElement("input");
  input.type = "text";
  input.className = "drumee-topbar__title-input";
  input.value = original;
  input.spellcheck = false;
  host.insertBefore(input, label.nextSibling);

  input.focus();
  // Preselect the stem, not the extension — retyping a name should not
  // silently drop the suffix.
  const dot = original.lastIndexOf(".");
  input.setSelectionRange(0, dot > 0 ? dot : original.length);

  let settled = 0;

  /** Tear the editor down. Returns false when it was already down. */
  function teardown() {
    if (settled) return false;
    settled = 1;
    input.remove();
    delete label.dataset.renaming;
    ui._titleRenaming = 0;
    return true;
  }

  function commit() {
    const value = (input.value || "").trim();
    if (!teardown()) return;
    if (!value || value === original) return;

    const data = {
      filename: value,
      nid: node.mget(_a.nodeId) || node.mget(_a.nid),
      hub_id: node.mget(_a.hub_id),
      service: SERVICE.media.rename,
    };

    ui.postService(SERVICE.media.rename, data).then((r) => {
      // Show the new name immediately; the base owns the title part.
      ui.update_name(_a.filename, value);
      ui.mset({ filename: value });
      const media = ui.media;
      if (media && !media.isDestroyed() && _.isFunction(media.afterRename)) {
        media.afterRename(r);
      }
    });
  }

  input.addEventListener("keydown", (e) => {
    // The players listen for arrow keys globally (the image player pages
    // through siblings on them), so nothing typed here may escape.
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      teardown();
    }
  });

  // Clicking away commits. Blur also fires when the window loses focus,
  // which is the same intent.
  input.addEventListener("blur", commit);

  // The identity block raises the window on click; the editor should not.
  input.addEventListener("mousedown", (e) => e.stopPropagation());
  input.addEventListener("click", (e) => e.stopPropagation());
};

module.exports = __player_topbar_rename;
