/**
 * Editing a file inside a secure share (DMZ) goes through the share's own gate
 * (modules/dmz/sharebox `_gateInteraction`): an anonymous visitor meets the
 * sign-up overlay, a signed-in recipient without the edit grant the Request
 * Access popup, the creator or a granted recipient proceeds. The server's
 * read-only ceiling refuses the others' writes anyway — without the gate they
 * would type, see nothing saved, and get no word why.
 *
 * Shared by the editors that edit in a share: editor/markdow and
 * editor/blocknote.
 */

// Keys that mean "I am trying to change this text". Deliberately narrow:
// arrows / Home / End / PageUp / PageDown / Tab / Escape / F-keys / bare
// modifiers, and Ctrl-C / Ctrl-A / Ctrl-F, are all things a view-only
// recipient legitimately does while READING, so they must never pop a dialog.
// Ctrl/Cmd-V and Ctrl/Cmd-X are edit intent even though the key itself is not
// printable; every other Ctrl/Cmd combo is not.
const EDIT_INTENT_KEYS = new Set(["Enter", "Backspace", "Delete"]);

/**
 * A character typed through Alt / Option or AltGr (which browsers report as
 * Ctrl+Alt): "@", "€", "{"… on many layouts. A plain letter or digit with Alt
 * is a shortcut (Alt+F, Alt+1), not text, so it never counts.
 * @param {KeyboardEvent} e
 * @returns {Boolean}
 */
function isAltCharacter(e) {
  if (!e.altKey || e.metaKey) return false;
  return typeof e.key === "string" && e.key.length === 1 && !/^[a-z0-9]$/i.test(e.key);
}

/**
 * @param {KeyboardEvent} e
 * @returns {Boolean}
 */
function isEditIntentKey(e) {
  if (!e) return false;
  if (isAltCharacter(e)) return true;
  if (e.ctrlKey || e.metaKey) return /^[vx]$/i.test(e.key || "");
  if (e.altKey) return false;
  // A one-character key is a printable insert (letter, digit, punctuation, space).
  if (typeof e.key === "string" && e.key.length === 1) return true;
  return EDIT_INTENT_KEYS.has(e.key);
}

/**
 * The sharebox of the share these windows belong to — the DMZ window manager
 * keeps it on its model as `desk`. Null outside a share.
 * @param {...Object} views candidates, e.g. the editor's target and window.Wm
 * @returns {Object|null}
 */
function shareDesk(...views) {
  for (const v of views) {
    if (!v || !v.isDmz || typeof v.mget !== "function") continue;
    const desk = v.mget("desk");
    if (desk && typeof desk._gateInteraction === "function") return desk;
  }
  return null;
}

/**
 * Whether the share grants writing, as every edit action in the sharebox asks.
 * @param {Object} desk the sharebox
 * @returns {Boolean}
 */
function hasWriteGrant(desk) {
  return !!desk.havePermission(_K.permission.write, desk.mget(_a.privilege));
}

/**
 * Whether an edit by this visitor would be gated — asked without showing the
 * gate. False when the sharebox cannot tell (an older one): the caller then
 * behaves as it did before.
 * @param {Object} desk the sharebox
 * @returns {Boolean}
 */
function editWouldBeGated(desk) {
  if (!desk || typeof desk._gateFor !== "function") return false;
  return desk._gateFor(hasWriteGrant(desk)) != null;
}

/**
 * Run the gate for an edit attempt. Re-arms every time — the visitor must get
 * the same answer whenever they try — but never re-fires while the gate is
 * already on screen (a burst of keys, or a held key, would re-feed the
 * overlay), with an 800 ms backstop for when the overlay cannot be inspected.
 *
 * @param {Object} desk the sharebox
 * @param {Object} holder where the last gating time is kept (the editor)
 * @returns {Boolean} true when the attempt must be stopped
 */
function gateEdit(desk, holder) {
  // Compared against _a.open (what the sharebox writes) plus the literal,
  // since dataset values are always strings and _a resolves keys at runtime.
  const ov = desk.__signupOverlay;
  const ovMode = ov && ov.el && ov.el.dataset ? ov.el.dataset.mode : null;
  if (ovMode && (ovMode === _a.open || ovMode === "open")) return true;
  const now = Date.now();
  if (holder._dmzEditGatedAt && now - holder._dmzEditGatedAt < 800) return true;
  // "can_edit": the level a Request Access popup asks for, where the
  // sharebox takes one (it is ignored where it does not).
  if (!desk._gateInteraction(hasWriteGrant(desk), "can_edit")) return false;
  holder._dmzEditGatedAt = now;
  return true;
}

module.exports = { isEditIntentKey, shareDesk, editWouldBeGated, gateEdit };
