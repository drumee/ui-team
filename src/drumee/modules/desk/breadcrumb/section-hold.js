/**
 * HOLD A SECTION LABEL AGAINST LATE PATH PAINTS.
 *
 * The track is "self-clearing" (desk_breadcrumb._setSectionMode): the next path
 * paint replaces a section label. That assumes no path request is still in
 * flight when a section opens — true when the user clicks Trash, false on a
 * reload, where the desk puts the saved screen back while the workspace's own
 * get_path is still out. Its answer (desk_breadcrumb._updatePath) and the
 * pane's mirror of it (window_folder.refreshBreadcrumbsUI) then landed a moment
 * after the label and painted the workspace icon and name over "Trash". A
 * topbar re-feed did the same through a remounted breadcrumb
 * (_restoreCurrentPath), which only knew how to paint the path.
 *
 * NOT A REQUEST TICKET. The pane's mirror is a NEW request started after the
 * label, with exactly the payload a deliberate exit sends — no ordering of
 * requests can tell the two apart. What can is the SCREEN: while it is opening
 * or still up, a path paint is an echo; once the user leaves, it is not.
 *
 *  - OPENING: for OPENING_MS after the label, refuse outright. The screen is a
 *    lazy chunk, and the slide-outs report themselves up only after their own
 *    loads (Contacts stamps data-anim="in" after four fetches), so asking the
 *    desk during this window would answer "not up" and let the echo through.
 *  - AFTER: refuse only while the desk reports a screen up. A screen that closed
 *    itself (its ✕, an outside click) releases the bar to the next path paint,
 *    exactly as before.
 *  - EXITS release it at once: every deliberate way out of a section closes the
 *    main panels (Desk.closeMainPanels → desk_breadcrumb.leaveSection) or asks
 *    for the path by name (_restoreCurrentPath), before its path paint.
 *
 * FAILS OPEN: a probe that throws reads as "no screen up", i.e. today's
 * behaviour. Module state rather than widget state, because the widget is
 * rebuilt on every topbar re-feed and the label has to survive that.
 *
 * Pure: time and the screen probe are injected (tests/breadcrumb-section-hold).
 */
const OPENING_MS = 5000;

/**
 * @param {Object} o
 * @param {Function} [o.now=Date.now]
 * @param {Function} o.screenUp  () => truthy while a section screen is up
 */
function createSectionHold({ now = Date.now, screenUp }) {
  let held = null;
  return {
    /** A section label was painted. */
    enter(data, opt) {
      held = { data, opt, at: now() };
    },
    /** A path (or nothing) was painted, or the section was deliberately left. */
    leave() {
      held = null;
    },
    /** @returns {{data, opt}|null} the label being held */
    current() {
      return held ? { data: held.data, opt: held.opt } : null;
    },
    /** @returns {Boolean} should a path paint be refused right now? */
    holds() {
      if (!held) return false;
      if (now() - held.at < OPENING_MS) return true;
      try {
        return !!screenUp();
      } catch (e) {
        return false;
      }
    },
  };
}

module.exports = { createSectionHold, OPENING_MS };
