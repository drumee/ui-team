/**
 * Daily reminder — Round 3 / Sprint 1 row 7.
 *
 * "Hi <name>, Today you have ...." with three counts, shown ONCE on the first
 * desk load of each day. The counts come from activity.daily_digest, which
 * fans out across the desk's workspaces; the once-a-day rule is localStorage,
 * per device, which is a deliberate choice — a two-device user seeing it twice
 * is acceptable and it costs no schema.
 *
 * [My calendar] opens the Personal Calendar on TODAY, in DAY view — the card
 * reports on today, so the screen it opens shows today rather than the month
 * grid the rail opens. It was deliberately inert until 2026-09-07 because that
 * screen did not exist yet; it does now, so the button dispatches the desk's
 * own `toggle-calendar` — the exact service the left rail, the topbar utility
 * cluster and the phone's go-to grid already fire, with the view named in the
 * args those callers omit.
 * Going through the desk rather than mounting the panel here is what keeps the
 * breadcrumb, the sidebar highlight, the mutual exclusion with Settings / Get
 * help / Billing and the reload-restore all working: `toggle-calendar` is in
 * desk `_RESTORABLE_SCREENS`, and none of that would follow a hand-rolled open.
 *
 * Discard and ✕ are the same action: close, write nothing. There is no
 * server-side "seen" state at all.
 */
const { closeWmPopup } = require("libs/wm-popup");

const STORAGE_KEY = "drumee_daily_reminder_shown";

class __daily_reminder_popup extends LetcBox {
  static initClass() {
    require("./skin");
  }

  /**
   * The day key this card is keyed on — the viewer's LOCAL date, not UTC.
   * "Today" is whatever the person in front of the screen calls today, and a
   * UTC key would flip the card mid-afternoon for anyone far enough east.
   * Exposed statically so the desk can ask "is it due?" without constructing
   * the widget, and so the test can drive it.
   */
  static dayKey(d) {
    const now = d || new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
  }

  /**
   * Has today's card already been shown on this device?
   *
   * Every localStorage access is wrapped: it throws outright in some privacy
   * modes, and a reminder card must never be the thing that breaks a desk
   * load. Unreadable storage is treated as "not shown yet" — showing the card
   * twice is a far smaller failure than a broken desk.
   */
  static alreadyShownToday(key) {
    try {
      return localStorage.getItem(STORAGE_KEY) === (key || this.dayKey());
    } catch (e) {
      return false;
    }
  }

  static markShownToday(key) {
    try {
      localStorage.setItem(STORAGE_KEY, key || this.dayKey());
    } catch (e) {
      /* private mode / quota — the card simply shows again next load */
    }
  }

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    this._counts = this.mget("counts") || { unread_messages: 0, due_tasks: 0, meetings: 0 };
  }

  /**
   * Wm.launch({singleton:1}) reuses the instance and calls .raise() on a
   * second trigger — LetcBox has none, so this stub is mandatory. Same reason
   * as rating-survey-popup.
   */
  raise() {
    if (this.el) {
      this.el.style.display = "";
      this.el.style.zIndex = 99998;
    }
    return this;
  }

  onDomRefresh() {
    this._portalToBody();
    this.feed(require("./skeleton")(this));
  }

  /**
   * Wm renders inside window-manager (z-auto) while overlays sit at z 1500+,
   * so a fixed, centred card only wins from document.body. Copied from
   * rating-survey-popup, which learned it the hard way.
   */
  _portalToBody() {
    if (!this.el) return;
    if (this.el.parentElement !== document.body) {
      document.body.appendChild(this.el);
    }
  }

  // ───────── skeleton accessors ─────────
  getCounts() { return this._counts; }

  /**
   * First name for the greeting. Falls back to the full name, then to a
   * name-less greeting — never to the literal "[User name]" of the mockup.
   */
  getFirstName() {
    const first = String(Visitor.get(_a.firstname) || "").trim();
    if (first) return first;
    return String(Visitor.get(_a.fullname) || "").trim();
  }

  /**
   * WHEN WE SHARE THE PARENT WITH ANYONE ELSE, REMOVE ONLY OURSELVES.
   *
   * This card is where the rule was worked out — `parent.clear()` here wiped
   * the shared Wm pool and took the WORKSPACE PANE down with the card, which
   * reached production as "blank workspace after closing the daily reminder".
   * The reasoning, the measurements and the top-bar symptom now live in ONE
   * place, libs/wm-popup, because three separate widgets have each been
   * diagnosed from scratch for the same defect.
   */
  _close() {
    closeWmPopup(this);
  }

  // ───────── event routing ─────────

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    switch (service) {
      // Discard and ✕ are the same action, by design: close, write nothing.
      case "daily-reminder-discard":
      case "daily-reminder-close":
        return this._close();

      // [My calendar] → the Personal Calendar. See the header for why this
      // delegates instead of opening the panel itself.
      case "daily-reminder-calendar": {
        // CLOSE FIRST, then open — the same ordering the notice needed, for a
        // different reason: _portalToBody moves this card to document.body at
        // z 99998, ABOVE the settings-main-slot the calendar mounts into, so
        // leaving it up would bury the screen the click just asked for.
        //
        // NOT `Wm.__wrapperModal`, which is what this comment used to claim.
        // Wm.launch({explicit:1}) appends to getWindowsPool(kind) — the
        // headless workspace LAYER — and that mistake is what made
        // `parent.clear()` in _close look safe. See _close.
        //
        // Not merely relying on togglePanel's own _dismissWmModal() to sweep
        // the card away: that would work today, but it makes this button's
        // behaviour a side effect of someone else's cleanup. Closing here is
        // the same explicit close Discard and ✕ already use.
        this._close();
        // `service` is passed in args, so Desk.onUiEvent never dereferences
        // `cmd` — which matters because _close() above may already have
        // destroyed this widget and the button inside it.
        //
        // `calendarView: "day"` — the card is a report on TODAY, so its button
        // lands on today in DAY view rather than on the month grid the rail
        // opens (Lexis, 2026-09-14). The desk owns the whole of that: it
        // passes the view as a launch option AND re-states it on an instance
        // that was only revealed. See desk `_openCalendar`.
        if (window.Desk && _.isFunction(Desk.onUiEvent)) {
          Desk.onUiEvent(cmd, { service: "toggle-calendar", calendarView: "day" });
        }
        return;
      }
    }
  }
}

__daily_reminder_popup.initClass();
module.exports = __daily_reminder_popup;
