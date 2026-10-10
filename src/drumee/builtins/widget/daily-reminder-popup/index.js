/**
 * Daily reminder — Round 3 / Sprint 1 row 7.
 *
 * "Happy <Weekday>, <name>!" with three counts, shown ONCE on the first desk
 * load of each day. Since the 2026-09-23 redesign the hero art, confetti
 * colours, sub-line and idle animation follow the time of day (period.js,
 * images.js, motion.js). The counts come from activity.daily_digest, which
 * fans out across the desk's workspaces; the once-a-day rule is localStorage,
 * per device, which is a deliberate choice — a two-device user seeing it twice
 * is acceptable and it costs no schema.
 *
 * [Open my calendar] and the calendar row open the Personal Calendar in
 * MONTH view on the current month (Lexis, 2026-09-29 — it was DAY view from
 * 2026-09-14). It was deliberately inert until 2026-09-07 because that
 * screen did not exist yet; it does now, so the button dispatches the desk's
 * own `toggle-calendar` — the exact service the left rail, the topbar utility
 * cluster and the phone's go-to grid already fire, with the view named in the
 * args those callers omit.
 * Going through the desk rather than mounting the panel here is what keeps the
 * breadcrumb, the sidebar highlight, the mutual exclusion with Settings / Get
 * help / Billing and the reload-restore all working: `toggle-calendar` is in
 * desk `_RESTORABLE_SCREENS`, and none of that would follow a hand-rolled open.
 *
 * The three stat tiles are click targets too (Lexis, 2026-10-10): unread
 * messages → the desk's `toggle-inbox`, due tasks and meetings today → the
 * same Personal Calendar the button opens. Both go through _openDeskScreen,
 * for the same reasons.
 *
 * Maybe later and ✕ are the same action: close, write nothing. There is no
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
    this._motionGen = 0;
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
    this._startMotion();
  }

  /**
   * Entrance + per-period idle animation (motion.js). The kids are not
   * guaranteed to be in the DOM the instant feed() returns, so try on the
   * next frames until the card is there — a few frames at most; after that
   * the static card simply stands, which is always a correct rendering.
   *
   * ONE live animation at a time. The idle loops repeat forever, so a second
   * onDomRefresh that simply overwrote `_motion` would orphan the first
   * handle and leave it tweening detached nodes for the life of the tab. Each
   * start bumps a generation: a frame from an older start gives up, and a
   * new handle always kills the one before it.
   */
  _startMotion(tries = 10, gen = ++this._motionGen) {
    requestAnimationFrame(() => {
      if (gen !== this._motionGen) return;
      if (this.isDestroyed && this.isDestroyed()) return;
      const handle = require("./motion").play(this.el, this.getPeriod());
      if (handle.started) {
        this._stopMotion();
        this._motion = handle;
      } else if (tries > 1) {
        this._startMotion(tries - 1, gen);
      }
    });
  }

  _stopMotion() {
    if (this._motion) this._motion.kill();
    this._motion = null;
  }

  onBeforeDestroy() {
    this._stopMotion();
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
   * "Now" for the card, captured ONCE so the greeting, the sub-line and the
   * art can never straddle a period boundary between them.
   */
  getNow() {
    if (!this._now) this._now = new Date();
    return this._now;
  }

  /**
   * morning | noon | afternoon | evening. A `period` launch option overrides
   * the clock — QA uses it from the console to see all four; the desk never
   * passes one.
   */
  getPeriod() {
    const { PERIODS, periodOf } = require("./period");
    const forced = this.mget("period");
    return PERIODS.includes(forced) ? forced : periodOf(this.getNow());
  }

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
    // Stop the tweens BEFORE the view goes: goodbye() destroys on a timer,
    // and an idle loop left running would keep touching a detached node.
    this._stopMotion();
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

      // [My calendar], the calendar row, and the due-tasks and meetings
      // tiles → the Personal Calendar. See the header for why this delegates
      // instead of opening the panel itself.
      //
      // `calendarView: "month"` — lands on the month grid of the current
      // month (Lexis, 2026-09-29; DAY view before that). Named rather than
      // omitted so a calendar left on week/day view, or on another month,
      // still comes back to this month's grid. The desk owns the whole of
      // that: it passes the view as a launch option AND re-states it on an
      // instance that was only revealed. See desk `_openCalendar`.
      case "daily-reminder-calendar":
        return this._openDeskScreen(cmd, { service: "toggle-calendar", calendarView: "month" });

      // The unread-messages tile → the Inbox (Lexis, 2026-10-10). The desk's
      // `toggle-inbox` is open-only (togglePanel(…, true)), so an Inbox the
      // reload already restored stays open rather than toggling shut.
      case "daily-reminder-inbox":
        return this._openDeskScreen(cmd, { service: "toggle-inbox" });
    }
  }

  /**
   * Close the card, then hand `args.service` to the desk — the same service
   * the rail / topbar / phone go-to grid fire for that screen.
   */
  _openDeskScreen(cmd, args) {
    // CLOSE FIRST, then open — the same ordering the notice needed, for a
    // different reason: _portalToBody moves this card to document.body at
    // z 99998, ABOVE the settings-main-slot the calendar and the Inbox mount
    // into, so leaving it up would bury the screen the click just asked for.
    //
    // NOT `Wm.__wrapperModal`, which is what this comment used to claim.
    // Wm.launch({explicit:1}) appends to getWindowsPool(kind) — the
    // headless workspace LAYER — and that mistake is what made
    // `parent.clear()` in _close look safe. See _close.
    //
    // Not merely relying on togglePanel's own _dismissWmModal() to sweep
    // the card away: that would work today, but it makes this click's
    // behaviour a side effect of someone else's cleanup. Closing here is
    // the same explicit close Discard and ✕ already use.
    this._close();
    // `service` is passed in args, so Desk.onUiEvent never dereferences
    // `cmd` for it — which matters because _close() above may already have
    // destroyed this widget and the view inside it that was clicked.
    if (window.Desk && _.isFunction(Desk.onUiEvent)) {
      Desk.onUiEvent(cmd, args);
    }
  }
}

__daily_reminder_popup.initClass();
module.exports = __daily_reminder_popup;
