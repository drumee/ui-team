// Personal Calendar — the aggregated read view over every Task and Meeting the
// user can see, plus their personal-only items. Mounted full-canvas in the
// desk's settings-main-slot (the same slot Settings / Get help / Billing use).
//
// ── The one rule this widget exists to keep ──────────────────────────────────
// The Calendar is a RENDERER, never a source of truth for a folder-owned item.
// Reads come from calendar.list (server-authoritative aggregation — see
// skeleton/helpers.js for the row contract). Writes go straight back to the
// service that owns the record, addressed with the ROW'S OWN hub_id, so ACL and
// audit stay identical to editing from the folder. Nothing is merged client-side
// and nothing is cached beyond the visible window.
//
// Personal items live in the user's personal hub — hub_id: Visitor.id,
// nid: Visitor.get(_a.home_id) — which is the same pair the desk already uses
// for its own personal-scope launches. A personal task carries no assignee: the
// field is omitted here, and refused server-side, which is the half that counts.
const { copyToClipboard } = require("@drumee/ui-essentials");
const { overMeetingCap } = require("libs/billing");
const {
  normalizeRow,
  expandRecurrence,
  passesFilter,
  viewRange,
  day,
  ymd,
} = require("./skeleton/helpers");

const VIEW_KEYS = ["month", "week", "day"];
const FILTER_KEYS = ["all", "task", "meeting"];

class __calendar_main extends LetcBox {
  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();

    this._view = "month";
    this._cursor = ymd(Dayjs());
    // Not persisted, by spec: the filter resets to All every session.
    this._filter = "all";
    this._items = [];
    this._form = null;
    this._viewMenuOpen = false;
    this._newMenuOpen = false;
    // The range label carries a caret in Figma 43:31159, so it is a control
    // rather than a caption: it opens a month jump list for the cursor's year.
    this._rangeMenuOpen = false;
    this._loading = false;

    // Personal scope for every write this screen originates.
    this._personalHub = Visitor.id;
    this._personalNid = Visitor.get(_a.home_id);

    // Live sync (requirement §3). Deliberately unfiltered by hub_id: the tasks
    // board filters workspace pushes out as noise, but for an aggregated
    // calendar a peer's edit in ANY workspace is exactly the signal we want.
    this.bindEvent(_a.live);
  }

  onBeforeDestroy() {
    this.unbindEvent(_a.live);
    if (this._reloadTimer) {
      clearTimeout(this._reloadTimer);
      this._reloadTimer = null;
    }
  }

  /**
   * Paint first, load second.
   *
   * This used to await _loadItems() before the first feed(), which meant the
   * whole screen hung on one network round-trip — and rendered NOTHING AT ALL
   * whenever that request did not resolve cleanly, which is the normal case
   * while calendar.list is still unimplemented. Every sibling screen in this
   * slot (help_main, settings_main) renders synchronously and fills in after;
   * an aggregated read view has even less excuse to block on its data.
   */
  onDomRefresh() {
    this._render();
    this._loadItems().then(() => {
      if (this.isDestroyed && this.isDestroyed()) return;
      this._render();
    });
  }

  // ── state readers used by the skeletons ────────────────────────────────────

  getView() {
    return this._view;
  }

  getCursor() {
    return this._cursor;
  }

  getFilter() {
    return this._filter;
  }

  getForm() {
    return this._form;
  }

  isViewMenuOpen() {
    return !!this._viewMenuOpen;
  }

  isNewMenuOpen() {
    return !!this._newMenuOpen;
  }

  isRangeMenuOpen() {
    return !!this._rangeMenuOpen;
  }

  /** Is the calendar empty because nothing is scheduled, or because the read failed? */
  hasLoadFailed() {
    return !!this._loadFailed;
  }

  isLoading() {
    return !!this._loading;
  }

  /**
   * The rows the current view should draw: recurrence expanded into the visible
   * window, then the All / Task / Meeting filter applied.
   *
   * Expansion is client-side by the server's own stated contract (room.js: "the
   * calendar expands occurrences client-side").
   */
  getVisibleItems() {
    const { from, to } = viewRange(this._view, this._cursor);
    const out = [];
    this._items.forEach((row) => {
      if (!passesFilter(row, this._filter)) return;
      expandRecurrence(row, from, to).forEach((r) => out.push(r));
    });
    return out;
  }

  // ── data ───────────────────────────────────────────────────────────────────

  /**
   * One read per visible window.
   *
   * fetchService never rejects — doRequest swallows failures via
   * onServerComplain and resolves undefined — so a non-list IS the error path.
   * Keep the rows already on screen rather than blanking a loaded calendar over
   * a transient failure, exactly as the tasks board does.
   */
  async _loadItems() {
    const { from, to } = viewRange(this._view, this._cursor);
    this._loading = true;

    const service =
      (SERVICE.calendar && SERVICE.calendar.list) || "calendar.list";
    let rows;
    try {
      rows = await this.fetchService({
        service,
        // calendar.list is declared scope:"hub", so it needs a hub context even
        // though it reads across every workspace. Visitor.id is the caller's own
        // entity — the same pair activity.list_task_assignments passes for a
        // user-scoped read.
        hub_id: Visitor.id,
        from: ymd(from),
        to: ymd(to),
        // `kinds` is deliberately NOT sent: the server defaults to both, and an
        // array in a GET query string is a serialization risk for no gain —
        // the All / Task / Meeting filter is applied client-side over the
        // fetched window anyway (see getVisibleItems).
      });
    } catch (e) {
      this.warn && this.warn("[calendar] calendar.list failed", e);
      rows = null;
    }
    this._loading = false;

    // Single-row collapse: a result set holding exactly one row answers `{...}`
    // where every other count answers `[...]`. This has already emptied a
    // calendar once in this product (room.list), so normalise every shape.
    const list = Array.isArray(rows) ? rows : rows && rows.id ? [rows] : null;
    if (!list) {
      this._loadFailed = 1;
      // DEV ONLY: ?calfixture=1 renders sample rows so the grids, chips,
      // filters and forms can be reviewed while calendar.list is still
      // unimplemented (it currently answers MODULE_NOT_FOUND). Required lazily
      // so a normal session never loads it. Remove the flag and ./fixture.js
      // together once the service lands.
      if (this._useFixture()) {
        this._items = require("./fixture")()
          .map((r) => normalizeRow(r))
          .filter(Boolean);
        this._loadFailed = 0;
      }
      return;
    }
    this._loadFailed = 0;
    this._items = list.map((r) => normalizeRow(r)).filter(Boolean);
  }

  /** DEV ONLY — see _loadItems. */
  _useFixture() {
    try {
      return !!Visitor.parseModuleArgs().calfixture;
    } catch {
      return false;
    }
  }

  /**
   * True once a first load has completed (either way). Until then the grid is
   * drawn but deliberately says nothing about being empty — an empty month and
   * an unfetched month look identical, and claiming "Nothing scheduled" before
   * the answer arrives is the wrong claim to make.
   */
  hasLoaded() {
    return this._loadFailed != null;
  }

  _render() {
    this.feed(require("./skeleton")(this));
  }

  async _reload() {
    await this._loadItems();
    this._render();
  }

  /**
   * Coalesce a burst of websocket pushes into one reload.
   *
   * A single folder edit can emit task.update AND task.update_status; a booking
   * emits room.scheduled per invitee socket. Reloading per frame would refetch
   * the window several times for one user action.
   */
  _scheduleReload() {
    if (this._reloadTimer) return;
    this._reloadTimer = setTimeout(() => {
      this._reloadTimer = null;
      if (this.isDestroyed && this.isDestroyed()) return;
      this._reload();
    }, 250);
  }

  onWsMessage(svc, data, options = {}) {
    // Server pushes built with payload(data, {service}) arrive as a
    // `live.update` envelope whose FIRST arg is that envelope name — the real
    // service travels in options.service. Switching on the first arg alone
    // matches nothing (the tasks board documents this at length).
    const service = (options && options.service) || svc;
    switch (service) {
      case (SERVICE.task && SERVICE.task.create) || "task.create":
      case (SERVICE.task && SERVICE.task.update) || "task.update":
      case (SERVICE.task && SERVICE.task.update_status) || "task.update_status":
      case (SERVICE.task && SERVICE.task.update_assignee) || "task.update_assignee":
      case (SERVICE.task && SERVICE.task.delete) || "task.delete":
      // Meetings push on room.scheduled (room.js _notify_invitees). Note it
      // targets INVITEES, so a hub meeting the viewer is not invited to still
      // only appears on the next view change.
      case "room.scheduled":
        this._scheduleReload();
        return;
      default:
        if (super.onWsMessage) super.onWsMessage(svc, data, options);
    }
  }

  // ── navigation ─────────────────────────────────────────────────────────────

  _step(direction) {
    const unit = this._view === "day" ? "day" : this._view === "week" ? "week" : "month";
    const anchor = day(this._cursor) || Dayjs();
    this._cursor = ymd(anchor.add(direction, unit));
    this._closeMenus();
    this._reload();
  }

  _closeMenus() {
    this._viewMenuOpen = false;
    this._newMenuOpen = false;
    this._rangeMenuOpen = false;
  }

  // ── forms ──────────────────────────────────────────────────────────────────

  _openTaskForm(row) {
    this._closeMenus();
    if (row) {
      this._form = {
        kind: "task",
        mode: "edit",
        row,
        draft: {
          title: row.title || "",
          description: row.description || "",
          due_date: row.due_date || "",
          status: row.status || "todo",
          priority: row.priority || "medium",
        },
      };
    } else {
      this._form = {
        kind: "task",
        mode: "create",
        draft: {
          title: "",
          description: "",
          due_date: this._pendingDay || "",
          status: "todo",
          priority: "medium",
        },
      };
    }
    this._pendingDay = null;
    this._render();
  }

  _openMeetingForm() {
    this._closeMenus();
    const base = day(this._pendingDay) || day(this._cursor) || Dayjs();
    this._form = {
      kind: "meeting",
      mode: "create",
      draft: {
        title: "",
        date: ymd(base),
        start: { hour: 11, minute: "00", meridiem: "AM" },
        end: { hour: 12, minute: "00", meridiem: "PM" },
        require_email: false,
        restrict: false,
        recipients: [],
        password_on: false,
      },
    };
    this._pendingDay = null;
    this._render();
  }

  _closeForm() {
    this._form = null;
    this._render();
  }

  /**
   * Merge every formItem-bound input into the draft before a commit.
   *
   * The pill rows and the AM/PM toggle already write to the draft on click, but
   * the free-text fields only live in the DOM until this runs — including the
   * four time boxes. Absorbing those matters: without it a typed hour would be
   * silently dropped and every meeting would book at the draft's default time.
   */
  _absorbFormText() {
    if (!this._form) return {};
    let data = {};
    try {
      data = this.getData() || {};
    } catch {
      data = {};
    }
    const draft = this._form.draft || {};

    ["title", "description", "password"].forEach((k) => {
      if (data[k] != null) draft[k] = data[k];
    });

    // start_hour / start_minute / end_hour / end_minute → draft.start / .end,
    // leaving the meridiem the toggle already set.
    ["start", "end"].forEach((which) => {
      const part = draft[which] || {};
      const hour = data[`${which}_hour`];
      const minute = data[`${which}_minute`];
      if (hour != null && `${hour}`.trim() !== "") part.hour = `${hour}`.trim();
      if (minute != null && `${minute}`.trim() !== "") {
        part.minute = `${minute}`.trim();
      }
      draft[which] = part;
    });

    this._form.draft = draft;
    return draft;
  }

  /**
   * 12-hour form parts → UNIX-epoch seconds.
   *
   * Epoch is the server's canonical meeting time (room.js names stime/etime the
   * source of truth for range queries); the human `date` string it also stores
   * is display-only and must never be parsed back.
   */
  _epochFor(dateStr, part) {
    const base = day(dateStr);
    if (!base || !part) return 0;
    let hour = parseInt(part.hour, 10);
    if (!isFinite(hour)) return 0;
    hour = Math.max(1, Math.min(12, hour)) % 12;
    if (part.meridiem === "PM") hour += 12;
    let minute = parseInt(part.minute, 10);
    if (!isFinite(minute)) minute = 0;
    minute = Math.max(0, Math.min(59, minute));
    return base.startOf("day").add(hour, "hour").add(minute, "minute").unix();
  }

  // ── writes ─────────────────────────────────────────────────────────────────

  async _submitTask() {
    const draft = this._absorbFormText();
    const title = String(draft.title || "").trim();
    if (!title) return;

    const form = this._form;
    const editing = form.mode === "edit";
    const svcCreate = (SERVICE.task && SERVICE.task.create) || "task.create";
    const svcUpdate = (SERVICE.task && SERVICE.task.update) || "task.update";
    const svcStatus =
      (SERVICE.task && SERVICE.task.update_status) || "task.update_status";

    if (!editing) {
      // Personal task: personal-hub scope, and no assignee_uids at all —
      // requirement §4 wants assignment refused, not hidden, and the server
      // rejects it for a personal hub. Sending an empty array would still be
      // sending the field.
      await this.postService({
        service: svcCreate,
        hub_id: this._personalHub,
        nid: this._personalNid,
        title,
        description: draft.description || null,
        status: draft.status || "todo",
        priority: draft.priority || "medium",
        due_date: draft.due_date || null,
      });
    } else {
      const row = form.row || {};
      // Addressed with the ROW's hub — never the personal hub. This is the
      // line that keeps ACL and audit consistent with the folder view.
      const hub_id = row.hub_id || this._personalHub;
      await this.postService({
        service: svcUpdate,
        hub_id,
        id: row.id,
        title,
        description: draft.description || null,
        priority: draft.priority || "medium",
        due_date: draft.due_date || null,
      });
      if ((draft.status || "todo") !== (row.status || "todo")) {
        await this.postService({
          service: svcStatus,
          hub_id,
          id: row.id,
          status: draft.status || "todo",
        });
      }
    }

    this._form = null;
    await this._reload();
  }

  async _deleteTask() {
    const row = (this._form && this._form.row) || null;
    if (!row) return;
    const svc = (SERVICE.task && SERVICE.task.delete) || "task.delete";
    await this.postService({
      service: svc,
      hub_id: row.hub_id || this._personalHub,
      id: row.id,
    });
    this._form = null;
    await this._reload();
  }

  async _submitMeeting() {
    const draft = this._absorbFormText();
    const title = String(draft.title || "").trim();
    if (!title || !draft.date) return;

    const stime = this._epochFor(draft.date, draft.start);
    const etime = this._epochFor(draft.date, draft.end);
    if (!stime) return;

    // The end the meeting will actually be booked with, resolved BEFORE the
    // plan check rather than inline in the payload: an end that is missing or
    // not after the start falls back to half an hour, and the cap has to be
    // measured against the duration that is really going to be stored.
    const end = etime > stime ? etime : stime + 30 * 60;

    // Plan cap on meeting length. This calendar books into the viewer's own
    // personal hub (`_personalHub = Visitor.id`), so the room will run on the
    // viewer's own plan and their entitlement is the right one to read — no
    // ownership test needed here, unlike the workspace calendar in
    // window/folder where the hub may belong to somebody else.
    //
    // Refused rather than trimmed: silently shortening someone's 90-minute
    // meeting to 45 would be a decision made on their behalf, and they would
    // find out from the calendar afterwards rather than from us now.
    const capMins = overMeetingCap(end - stime);
    if (capMins) {
      // Required here, not at module scope: the card pulls its own skin in,
      // and a folder window / calendar that never hits the cap should not be
      // paying for the upsell's CSS. Same reason Wm.openFeatureLock defers it.
      const { promptFeatureLock } = require("builtins/widget/feature-lock");
      promptFeatureLock("meeting_schedule", [capMins]);
      return;
    }

    const bookSvc = (SERVICE.room && SERVICE.room.book) || "room.book";
    const linkSvc =
      (SERVICE.room && SERVICE.room.public_link) || "room.public_link";

    const base = day(draft.date);
    const payload = {
      hub_id: this._personalHub,
      title,
      message: draft.description || "",
      // Human display string the server stores alongside the epochs for
      // back-compat with player/schedule. The epochs are the real value.
      date: base ? base.format("LLLL") : "",
      stime,
      etime: end,
    };

    // Invitees. The server ALREADY implements per-email invitation — a
    // 'no_traversal' dmz grant plus real mail from the butler/external-meeting
    // template (room.js _commit_invitation) — but that method currently has no
    // caller, so `recipients` is inert until room.book (or a room.invite) is
    // wired to it. Sent regardless: when the server side lands, this form needs
    // no change, and until then the meeting is still created and still gets a
    // shareable link.
    if (draft.require_email && draft.restrict && draft.recipients.length) {
      payload.recipients = draft.recipients.map((email) => ({ email, name: email }));
    }

    const node = await this.postService({ service: bookSvc, ...payload });
    const nid = node && (node.id || node.nid);
    if (!nid) {
      Wm.alert(LOCALE.ERROR_NETWORK);
      return;
    }

    // Link + optional password. public_link accepts `password` today.
    const linkPayload = { service: linkSvc, hub_id: this._personalHub, nid };
    if (draft.password_on && draft.password) linkPayload.password = draft.password;
    const answer = await this.postService(linkPayload);
    const link = answer && answer.link;

    if (link) copyToClipboard(link);
    this._form = { kind: "invite-link", link: link || "" };
    await this._loadItems();
    this._render();
  }

  async _removeItem(cmd) {
    const kind = cmd.mget("itemKind");
    const id = cmd.mget("itemId");
    const hub_id = cmd.mget("itemHub") || this._personalHub;
    if (id == null) return;

    if (kind === "meeting") {
      const svc = (SERVICE.room && SERVICE.room.remove) || "room.remove";
      await this.postService({ service: svc, hub_id, nid: cmd.mget("itemNid") || id });
    } else {
      const svc = (SERVICE.task && SERVICE.task.delete) || "task.delete";
      await this.postService({ service: svc, hub_id, id });
    }
    await this._reload();
  }

  /**
   * Clicking an item.
   *
   * Personal + writable → the editable modal. Anything folder-owned is
   * READ-ONLY from here (decision C-10): the requirement permits write-back but
   * the prototype spec's preview is explicitly read-only, and meeting edits are
   * creator-only server-side anyway. Until the quick-preview frames land, a
   * folder-owned chip opens nothing rather than pretending to be editable.
   */
  _openItem(cmd) {
    // An occurrence is not its own record; editing one instance of a series is
    // a separate feature, so it opens nothing rather than the whole series.
    if (Number(cmd.mget("itemOccurrence"))) return;
    const id = cmd.mget("itemId");
    const kind = cmd.mget("itemKind");
    const row = this._items.find(
      (r) => `${r.id}` === `${id}` && r.kind === kind,
    );
    if (!row) return;
    if (row.scope === "personal" && row.can_write && row.kind === "task") {
      this._openTaskForm(row);
      return;
    }
    // TODO(C-05): folder-owned quick-preview — 400px read-only card with a
    // single "Open in folder →" CTA. Blocked on frames from Lexis; the deep
    // link needs an `open_task` option on window_folder, whose tasks panel
    // already exposes an `open-detail` service and a _detailId to target.
  }


  // ── events ─────────────────────────────────────────────────────────────────

  async onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    switch (service) {
      case "cal-prev":
        return this._step(-1);
      case "cal-next":
        return this._step(1);
      case "cal-today":
        this._cursor = ymd(Dayjs());
        this._closeMenus();
        return this._reload();

      case "cal-toggle-view-menu":
        this._viewMenuOpen = !this._viewMenuOpen;
        this._newMenuOpen = false;
        this._rangeMenuOpen = false;
        return this._render();

      case "cal-toggle-range-menu":
        this._rangeMenuOpen = !this._rangeMenuOpen;
        this._viewMenuOpen = false;
        this._newMenuOpen = false;
        return this._render();

      // Jump the cursor to a month of the year it is already in, keeping the
      // day-of-month so week/day views land somewhere meaningful rather than
      // snapping to the 1st. Clamped by Dayjs itself (Jan 31 → Feb 28).
      case "cal-set-month": {
        const m = Number(cmd.mget("calMonth"));
        if (Number.isInteger(m) && m >= 0 && m <= 11) {
          const anchor = day(this._cursor) || Dayjs();
          this._cursor = ymd(anchor.month(m));
        }
        this._closeMenus();
        // The fetch window moves with the cursor, so this is a refetch.
        return this._reload();
      }

      // Year step either side of the month list.
      case "cal-set-year": {
        const delta = Number(cmd.mget("calYear"));
        if (delta === 1 || delta === -1) {
          const anchor = day(this._cursor) || Dayjs();
          this._cursor = ymd(anchor.add(delta, "year"));
        }
        // Stays open: stepping the year is how the user browses to the month
        // they want, so closing after each step would make it unusable.
        return this._reload();
      }

      case "cal-set-view": {
        const next = cmd.mget("calView");
        if (VIEW_KEYS.includes(next)) this._view = next;
        this._closeMenus();
        // The window changes with the view, so this needs a refetch, not just
        // a re-render.
        return this._reload();
      }

      case "cal-set-filter": {
        const next = cmd.mget("calFilter");
        if (FILTER_KEYS.includes(next)) this._filter = next;
        this._closeMenus();
        // Filtering is client-side over an already-fetched window — no refetch.
        return this._render();
      }

      case "cal-toggle-new-menu":
        this._newMenuOpen = !this._newMenuOpen;
        this._viewMenuOpen = false;
        return this._render();

      case "cal-new-task":
        return this._openTaskForm(null);
      case "cal-new-meeting":
        return this._openMeetingForm();

      case "cal-day-add":
        this._pendingDay = cmd.mget("calDay");
        return this._openTaskForm(null);

      case "cal-day-more": {
        const target = cmd.mget("calDay");
        if (target) {
          this._cursor = target;
          this._view = "day";
        }
        this._closeMenus();
        return this._reload();
      }

      case "cal-open-item":
        return this._openItem(cmd);
      case "cal-remove-item":
        return this._removeItem(cmd);

      case "cal-close-form":
        return this._closeForm();

      case "cal-form-date": {
        if (!this._form) return;
        // The value arrives on ARGS, not on the command — and flatpickr's
        // altInput is nameless, so a date picker reports through the trigger
        // model instead. Both paths, in that order (the board's
        // _onTaskInputChanged documents why).
        let value = args && args.value != null ? String(args.value) : null;
        if (value == null) {
          const v = cmd.mget(_a.value);
          value = v != null ? String(v) : "";
        }
        const key = this._form.kind === "meeting" ? "date" : "due_date";
        this._form.draft[key] = value;
        return;
      }

      case "cal-form-status":
        if (!this._form) return;
        this._form.draft.status = cmd.mget("calStatus") || "todo";
        return this._render();

      case "cal-form-priority":
        if (!this._form) return;
        this._form.draft.priority = cmd.mget("calPriority") || "medium";
        return this._render();

      case "cal-form-time":
        // Absorbed at commit from getData(); nothing to do per keystroke.
        return;

      case "cal-form-meridiem": {
        if (!this._form) return;
        const which = cmd.mget("calWhich") === "end" ? "end" : "start";
        const part = this._form.draft[which] || {};
        part.meridiem = cmd.mget("calMeridiem") === "PM" ? "PM" : "AM";
        this._form.draft[which] = part;
        return this._render();
      }

      case "cal-toggle-require-email": {
        if (!this._form) return;
        const d = this._form.draft;
        d.require_email = !d.require_email;
        // Turning the requirement off makes the restriction meaningless.
        if (!d.require_email) {
          d.restrict = false;
        }
        return this._render();
      }

      case "cal-toggle-restrict":
        if (!this._form) return;
        this._form.draft.restrict = !this._form.draft.restrict;
        return this._render();

      case "cal-toggle-password":
        if (!this._form) return;
        this._form.draft.password_on = !this._form.draft.password_on;
        return this._render();

      case "cal-add-recipient": {
        if (!this._form) return;
        const part = await this.ensurePart("form-recipient");
        const input = part && part.el && part.el.querySelector("input");
        const value = input ? String(input.value || "").trim() : "";
        if (!value) return;
        const list = this._form.draft.recipients || [];
        if (!list.includes(value)) list.push(value);
        this._form.draft.recipients = list;
        if (input) input.value = "";
        return this._render();
      }

      case "cal-remove-recipient": {
        if (!this._form) return;
        const email = cmd.mget("calEmail");
        this._form.draft.recipients = (this._form.draft.recipients || []).filter(
          (e) => e !== email,
        );
        return this._render();
      }

      case "cal-submit-task":
        return this._submitTask();
      case "cal-delete-task":
        return this._deleteTask();
      case "cal-submit-meeting":
        return this._submitMeeting();

      case "cal-copy-link": {
        const link = this._form && this._form.link;
        if (link) {
          copyToClipboard(link);
          Wm.acknowledge && Wm.acknowledge(LOCALE.URL_COPIED);
        }
        return;
      }

      default:
        if (super.onUiEvent) return super.onUiEvent(cmd, args);
    }
  }

  // Wrapper.Y derives its part name from `name` as `wrapper-{name}`, so the
  // modal slot arrives as "wrapper-cal-modal". Nothing needs wiring on arrival —
  // the wrapper's kids are declared by the skeleton — so this only exists to
  // keep unhandled parts flowing to the base class.
  onPartReady(child, pn) {
    if (super.onPartReady) super.onPartReady(child, pn);
  }
}

module.exports = __calendar_main;
