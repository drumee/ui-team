/**
 * Ring a single drumate (1:1 "Drumee connect" call).
 *
 * Shared by the folder/team member call list (widget_meeting) and the
 * Contacts panel's Call action.
 *
 * hub_id/nid are the caller's identity (Visitor), not the surface the call was
 * started from — a 1:1 ring originates from the caller's personal home.
 * guest_id (used by conference.invite) reads callee.drumate_id, so fall back
 * to entity_id/uid/id for callers whose rows carry the id under another name.
 *
 * @param {Object} callee  the person to ring; needs one of drumate_id,
 *                         entity_id, uid or id
 * @param {Object} opt     { video: 1|0 } — defaults to a video call
 * @returns {Boolean} whether a call window was launched
 */
function startP2PCall(callee, opt = {}) {
  if (!callee) return false;

  const guest_id = callee.drumate_id || callee.entity_id || callee.uid || callee.id;
  if (!guest_id) return false;

  const existing = Wm.getItemByKind("window_connect") || Wm.getItemByKind("window_meeting");
  if (existing) {
    Wm.alert(LOCALE.ALREADY_ANOTHER_CALL);
    return false;
  }

  const name = callee.fullname
    || callee.display
    || `${callee.firstname || ""} ${callee.lastname || ""}`.trim();

  Wm.launch({
    kind: "window_connect",
    hub_id: Visitor.id,
    nid: Visitor.get(_a.home_id) || Visitor.get(_a.nid),
    filename: name,
    display: name,
    callee: { ...callee, drumate_id: guest_id },
    video: opt.video === 0 ? 0 : 1,
    audio: 1,
  }, { explicit: 1, singleton: 1 });
  return true;
}

module.exports = { startP2PCall };
