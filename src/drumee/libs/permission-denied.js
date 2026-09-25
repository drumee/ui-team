/**
 * The "you lack the right for that" popup, in words that say WHAT was refused
 * and WHY (Lexis, 2026-09-24):
 *
 *   You can’t <action> because your current permission level is <role>.
 *   Please ask an admin to grant you a higher access level to perform this action.
 *
 * <role> is the same label every role selector shows (View / Chat / Edit /
 * Admin), resolved by roleFromPrivilege so the popup can never name a level the
 * member panel does not.
 *
 * When the level is not known (no privilege on hand), or the level already
 * holds the right that was needed (a shortcut link refuses a drop even to an
 * editor), the old generic LOCALE.WEAK_PRIVILEGE is returned instead: a
 * sentence naming a level that is not the reason is worse than one naming none.
 */

/**
 * Role label for a stored privilege mask, or "" when there is none to read.
 * @param {number} privilege
 */
function levelLabel(privilege) {
  const p = ~~privilege;
  if (!p) return "";
  const { roleFromPrivilege } = require("builtins/skeleton/toolkit/permission");
  const role = roleFromPrivilege(p);
  return (role && role.label) || "";
}

/**
 * @param {string} action  already-localized verb phrase (LOCALE.PERMISSION_ACTION_*)
 * @param {number} privilege  the viewer's stored privilege where it was refused
 * @param {number} [needed]  the _K.permission bit the action asks for
 * @returns {string}
 */
function weakPrivilegeMessage(action, privilege, needed) {
  try {
    const tpl = LOCALE.PERMISSION_DENIED_ACTION;
    const level = levelLabel(privilege);
    if (!tpl || !action || !level) return LOCALE.WEAK_PRIVILEGE;
    if (needed && (~~privilege & needed)) return LOCALE.WEAK_PRIVILEGE;
    return tpl.format(action, level);
  } catch (e) {
    return LOCALE.WEAK_PRIVILEGE;
  }
}

/**
 * The viewer's privilege in a workspace — the one open in the given hub, or the
 * current one. Same resolution as desk's _curWorkspaceCanWrite; 0 when unknown.
 * @param {string} [hub_id]
 */
function workspacePrivilege(hub_id) {
  try {
    const id = hub_id || (Wm._curWorkspace && Wm._curWorkspace.hub_id);
    const win = id && Wm._findWorkspaceWindow && Wm._findWorkspaceWindow(id);
    return (win && win.mget && win.mget(_a.privilege)) || 0;
  } catch (e) {
    return 0;
  }
}

module.exports = {
  weakPrivilegeMessage,
  workspacePrivilege,
};
