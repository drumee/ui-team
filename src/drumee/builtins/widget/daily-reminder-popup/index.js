/**
 * Daily reminder — Round 3 / Sprint 1 row 7.
 *
 * "Hi <name>, Today you have ...." with three counts, shown ONCE on the first
 * desk load of each day. The counts come from activity.daily_digest, which
 * fans out across the desk's workspaces; the once-a-day rule is localStorage,
 * per device, which is a deliberate choice — a two-device user seeing it twice
 * is acceptable and it costs no schema.
 *
 * 🚨 [My calendar] IS DELIBERATELY NOT WIRED. There is no personal Calendar
 * to open yet. It is drawn exactly as designed and says so when clicked,
 * rather than being quietly omitted or silently doing nothing — a button that
 * looks live and is dead is how the Phase 2 Mute button sat shipped-but-inert
 * for a whole phase. A test pins this so it cannot reach a PR by accident;
 * when the Calendar exists, wire this ONE case and delete that test.
 *
 * Discard and ✕ are the same action: close, write nothing. There is no
 * server-side "seen" state at all.
 */
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

  _close() {
    if (this.parent && _.isFunction(this.parent.clear)) this.parent.clear();
    else this.softDestroy();
  }

  // ───────── event routing ─────────

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    switch (service) {
      // Discard and ✕ are the same action, by design: close, write nothing.
      case "daily-reminder-discard":
      case "daily-reminder-close":
        return this._close();

      // 🚨 DELIBERATELY NOT WIRED — see the header. Do not "fix" this by
      // routing it somewhere plausible; there is no personal Calendar yet and
      // a wrong destination is worse than an honest notice.
      case "daily-reminder-calendar": {
        // CLOSE FIRST, then raise the notice. Butler renders BEHIND this card,
        // so saying it while the card is still up hides the message until the
        // user dismisses the card — which reads as the button doing nothing.
        // The message is captured before _close() because this widget may be
        // destroyed by it.
        const msg = LOCALE.DAILY_REMINDER_NO_CALENDAR;
        this._close();
        if (typeof Butler !== "undefined" && Butler.say) Butler.say(msg);
        return;
      }
    }
  }
}

__daily_reminder_popup.initClass();
module.exports = __daily_reminder_popup;
