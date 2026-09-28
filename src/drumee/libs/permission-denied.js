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

let _lastSaidAt = 0;

/**
 * Show the refusal: Butler first, Wm.alert as the fallback, never throwing into
 * the caller's own path.
 * @param {string} action
 * @param {number} privilege
 * @param {number} [needed]
 */
function sayWeakPrivilege(action, privilege, needed) {
  try {
    const msg = weakPrivilegeMessage(action, privilege, needed);
    _lastSaidAt = Date.now();
    if (typeof Butler !== "undefined" && Butler.say) Butler.say(msg);
    else if (typeof Wm !== "undefined" && Wm.alert) Wm.alert(msg);
  } catch (e) {
    /* a popup must never break the caller's own path */
  }
}

/**
 * Was a refusal shown just now? Lets a caller whose request resolved empty skip
 * its own generic error, which would otherwise stack on top of this one.
 * @param {number} [ms]
 */
function saidRecently(ms = 3000) {
  return Date.now() - _lastSaidAt < ms;
}

const TASK_WRITES = [
  "create", "update", "update_status", "update_assignee", "delete",
  "link_file", "unlink_file", "link_label", "unlink_label",
  "comment_create", "comment_update", "comment_delete", "comment_react",
  "comment_link_file", "comment_unlink_file",
  "column_create", "column_update", "column_set_done", "column_delete", "column_reorder",
];

/**
 * Services a member triggers ON PURPOSE, and the words for refusing each.
 *
 * An allowlist, not "every POST that answers 403": plenty of `src: write/admin`
 * services are quiet calls the UI makes on its own (secure_share.list,
 * access_list, mark_open_seen, channel.enter, hub.get_statistics…), and a popup
 * for their refusal would appear out of nowhere, again and again.
 */
const SERVICE_ACTIONS = {
  "media.copy": "PERMISSION_ACTION_COPY",
  "media.move": "PERMISSION_ACTION_MOVE",
  "media.move_all": "PERMISSION_ACTION_MOVE",
  "media.move_cross_hub": "PERMISSION_ACTION_MOVE",
  "media.workspace_move": "PERMISSION_ACTION_MOVE",
  "media.relocate": "PERMISSION_ACTION_MOVE",
  "media.trash": "PERMISSION_ACTION_DELETE",
  "media.rename": "PERMISSION_ACTION_RENAME",
  "media.make_dir": "PERMISSION_ACTION_CREATE_FOLDER",
  "media.save": "PERMISSION_ACTION_SAVE",
  "hub.invite": "PERMISSION_ACTION_INVITE",
  "hub.invite_with_roles": "PERMISSION_ACTION_INVITE",
  "hub.add_contributors": "PERMISSION_ACTION_INVITE",
  "hub.delete_contributor": "PERMISSION_ACTION_MANAGE_MEMBERS",
  "hub.set_privilege": "PERMISSION_ACTION_MANAGE_MEMBERS",
  "hub.set_member_privilege": "PERMISSION_ACTION_MANAGE_MEMBERS",
  "hub.update_name": "PERMISSION_ACTION_RENAME_WORKSPACE",
  "hub.delete_hub": "PERMISSION_ACTION_DELETE_WORKSPACE",
  "secure_share.create": "PERMISSION_ACTION_SHARE",
  "secure_share.revoke": "PERMISSION_ACTION_MANAGE_SHARE",
  "secure_share.revoke_recipient": "PERMISSION_ACTION_MANAGE_SHARE",
  "secure_share.revoke_email": "PERMISSION_ACTION_MANAGE_SHARE",
  "secure_share.delete": "PERMISSION_ACTION_MANAGE_SHARE",
  ...Object.fromEntries(TASK_WRITES.map((m) => [`task.${m}`, "PERMISSION_ACTION_EDIT_TASKS"])),
};

/**
 * The service a refused POST was for, from its URL. postService calls
 * `${svc}${service}`; fetchService always appends `?`, so a `?` means a GET —
 * a read, never answered with a popup.
 * @param {*} err  the Response doRequest hands to onServerComplain
 */
function refusedService(err) {
  const url = err && typeof err.url === "string" ? err.url : "";
  if (!url || url.includes("?")) return "";
  const svc = url.slice(url.lastIndexOf("/") + 1);
  // The document editor's namespace is per endpoint (euroffice, onlyoffice…).
  if (/\.new_doc$/.test(svc)) return "*.new_doc";
  return svc;
}

/**
 * onServerComplain's hook: a 403 on a service the member triggered on purpose
 * becomes the same popup as the client-side guards. Returns true when it was
 * handled (shown, or folded into one shown a moment ago).
 *
 * The level is the viewer's role in the workspace the request aimed at. The
 * admin bit is passed as `needed`, so an admin refused an owner-only action
 * gets the plain sentence rather than "ask an admin".
 * @param {*} view  the widget whose request was refused
 * @param {*} err
 */
function notifyServerDenied(view, err) {
  try {
    if (!err || err.status != 403) return false;
    const svc = refusedService(err);
    const key = svc === "*.new_doc"
      ? "PERMISSION_ACTION_CREATE_DOCUMENT"
      : SERVICE_ACTIONS[svc];
    if (!key) return false;
    // A multi-file paste or move refuses once per file; say it once.
    if (saidRecently()) return true;
    const dest = view && view.mget && view.mget(_a.destination);
    const hub_id = (dest && dest.hub_id) || (view && view.mget && view.mget(_a.hub_id));
    const privilege =
      workspacePrivilege(hub_id) || (view && view.mget && view.mget(_a.privilege));
    sayWeakPrivilege(LOCALE[key], privilege, _K.permission.admin);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  weakPrivilegeMessage,
  workspacePrivilege,
  sayWeakPrivilege,
  saidRecently,
  notifyServerDenied,
};
