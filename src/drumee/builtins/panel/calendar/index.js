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
  rowStart,
  fromEpoch,
  day,
  ymd,
  DAY_START_HOUR,
} = require("./skeleton/helpers");
const { armItemsReady, markItemsReady } = require("libs/items-ready");
const { modalKids } = require("./skeleton");
const { recipientChips } = require("./skeleton/meeting-form");
const A = require("./attachments");
const { rowOf } = require("../../window/tasks/live-sync");
const { fileChips } = require("./skeleton/attachments");

const VIEW_KEYS = ["month", "week", "day"];
const FILTER_KEYS = ["all", "task", "meeting"];
// A parked calendar (desk keep-alive) revealed after this long re-reads its
// window even if no push arrived meanwhile — a missed push is plausible by then.
const PARKED_REFRESH_MS = 60 * 1000;

class __calendar_main extends LetcBox {
  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    armItemsReady(this);
    this.declareHandlers();

    // Month, unless the entry point NAMED a view: the Daily Reminder card's
    // [My calendar] asks for today in `day` view. Validated against VIEW_KEYS,
    // so a malformed or stale option can only ever fall back to the default —
    // an unknown string would otherwise reach GRIDS[view] in the skeleton and
    // silently render the month grid under a toolbar claiming something else.
    const startView = this.mget("startView");
    this._view = VIEW_KEYS.includes(startView) ? startView : "month";
    this._cursor = ymd(Dayjs());
    // Not persisted, by spec: the filter resets to All every session.
    this._filter = "all";
    this._items = [];
    this._form = null;
    this._viewMenuOpen = false;
    this._newMenuOpen = false;
    // The range label is a control rather than a caption: it opens a month
    // jump list for the cursor's year. It shows no caret of its own (Lexis,
    // 2026-09-08) — the label itself is the affordance.
    this._rangeMenuOpen = false;
    this._loading = false;
    // One in-flight write per open modal — see _submitTask.
    this._submitting = false;

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
    // The dropdown dismisser lives on `document`, so it outlives this widget
    // unless it is taken down here.
    this._unbindMenuDismiss();
    this._cancelFormUploads(this._form);
    if (this._dropHandlers && this.el) {
      for (const [type, fn] of this._dropHandlers) this.el.removeEventListener(type, fn);
      this._dropHandlers = null;
    }
    if (this._pasteHandler) {
      document.removeEventListener("paste", this._pasteHandler);
      this._pasteHandler = null;
    }
    if (this._reloadTimer) {
      clearTimeout(this._reloadTimer);
      this._reloadTimer = null;
    }
    if (this._toastTimer) {
      clearTimeout(this._toastTimer);
      this._toastTimer = null;
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
    this._installFileDrop();
    this._render();
    this._loadItems().then(() => {
      if (this.isDestroyed && this.isDestroyed()) return;
      this._render();
      // First window painted — events, the empty grid, or "Try again" after a
      // failed calendar.list (_loadItems resolves either way). A reload's
      // screen restore waits on this (libs/items-ready).
      markItemsReady(this);
    });
  }

  /**
   * The desk keeps this screen mounted when the user navigates away and
   * reveals it again on the next Calendar press (desk/index.js
   * _slotKeepsChild), so coming back is instant. What was on screen is then
   * the last window this instance loaded: live pushes kept it current while
   * hidden, and this re-read closes any gap they left. Same shape as
   * onDomRefresh minus the first paint, which is already up.
   */
  onPanelShown() {
    this._parked = false;
    // Only when something happened while parked (a push was deferred) or the
    // window on screen is old enough that a missed push is plausible.
    const stale = Date.now() - (this._loadedAt || 0) > PARKED_REFRESH_MS;
    // A modal still open from before the screen was parked keeps its draft:
    // the re-read waits for it to close (_closeForm), like a live push does.
    if (this._form) {
      this._dirty = this._dirty || stale;
      return;
    }
    if (!this._dirty && !stale) return;
    this._dirty = false;
    this._loadItems().then(() => {
      if (this.isDestroyed && this.isDestroyed()) return;
      this._render();
    });
  }

  /**
   * Parked by the desk. The live subscription stays bound (it is what makes
   * the reveal cheap), but a push must not fetch and rebuild a display:none
   * page — note it and let onPanelShown do one reload.
   */
  onPanelHidden() {
    this._parked = true;
  }

  /**
   * Point the screen at `view`, on TODAY — for an entry point that names one
   * rather than taking the screen as the user left it. The Daily Reminder
   * card's [My calendar] is the only such caller today: it opens the month
   * view on the current month.
   *
   * A FRESH mount reads the same thing from its `startView` option, and that
   * is the path that matters most, because the kind may still be lazy-loading
   * when the desk's togglePanel promise settles — nothing can be called on it
   * then. This method is the other half: the desk keeps this screen alive
   * (KEEP_ALIVE_MAIN_KINDS), so an instance that is merely REVEALED, or is
   * already on screen where an open-only togglePanel is a deliberate no-op,
   * never sees launch options and would otherwise keep the view it was left on.
   *
   * No-op when the screen is already exactly there, so the fresh-mount path —
   * which just read the same view from its options — does not pay for a second
   * fetch of the window it is already loading.
   */
  focusView(view) {
    if (!VIEW_KEYS.includes(view)) return;
    const today = ymd(Dayjs());
    if (this._view === view && this._cursor === today) return;
    this._view = view;
    this._cursor = today;
    // Same pairing every cursor/view change in onUiEvent uses: a toolbar
    // dropdown left open would hang over a grid it no longer describes.
    this._closeMenus();
    // The fetch window is derived from view + cursor, so this is a refetch,
    // not a repaint — exactly what `cal-set-view` and `cal-day-more` do.
    return this._reload();
  }

  // ── state readers used by the skeletons ────────────────────────────────────

  getView() {
    return this._view;
  }

  getCursor() {
    return this._cursor;
  }

  /**
   * The All / Task / Meeting toolbar state.
   *
   * NOT named getFilter(). Marionette's CollectionView — which LetcBox extends
   * — already owns that name: `_getFilter()` calls `this.getFilter()` and, when
   * the result is a STRING, builds a predicate that keeps only child views
   * whose model has a truthy attribute of that name:
   *
   *     if (_.isString(viewFilter))
   *       return view => view.model && view.model.get(viewFilter);
   *
   * Overriding it to return "all" therefore filtered every child of this widget
   * on `model.get("all")`, which no skeleton node has. The fed tree landed in
   * the collection and was then filtered straight back out, leaving
   * `children` empty — so the view reported itself empty and rendered its
   * emptyView (LetcBlank) instead. The whole screen came up blank, with a
   * populated collection and no error anywhere.
   */
  getActiveFilter() {
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

  /**
   * The month the range popup's mini calendar is SHOWING, which is not the
   * calendar's cursor: browsing to next March inside the popup must leave the
   * grid behind it where it is until a day is actually picked. Null until the
   * user steps it — the popup then opens on the cursor's own month.
   */
  getPickerCursor() {
    return this._pickerCursor || null;
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
      expandRecurrence(row, from, to).forEach((r) => {
        // Only rows the grids can actually place. Two shapes reach here that
        // cannot be drawn anywhere, and both used to be counted as "visible":
        //
        //   • a task with no due_date — rowStart() is null, so no cell owns it
        //     (the helpers state a task with no due date never appears)
        //   • a series whose occurrences all fall outside the window —
        //     expandRecurrence falls back to `[row]`, putting the ORIGIN's own
        //     date back in play even though it is out of range
        //
        // The grids drop both at render, so they were invisible either way —
        // but they made getVisibleItems() non-empty, which suppressed
        // "Nothing scheduled" and left the screen blank with no explanation.
        const s = rowStart(r);
        if (!s || s.isBefore(from, "day") || s.isAfter(to, "day")) return;
        out.push(r);
      });
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
    this._loadedAt = Date.now();

    // Single-row collapse: a result set holding exactly one row answers `{...}`
    // where every other count answers `[...]`. This has already emptied a
    // calendar once in this product (room.list), so normalise every shape.
    //
    // Tested on id OR nid, and with `!= null` rather than truthiness: a raw
    // meeting row is keyed by `nid` and carries no `id` at all, and an `id` of
    // 0 is a legitimate key. `rows.id` alone therefore read a perfectly good
    // single meeting as a failed request and drew "Try again" over an empty
    // calendar — the exact failure this collapse handling exists to prevent.
    const isRow = (r) =>
      r && typeof r === "object" && (r.id != null || r.nid != null);
    const list = Array.isArray(rows) ? rows : isRow(rows) ? [rows] : null;
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
    // Which range the next paint draws. The scroll rules below key on it: the
    // same range re-fed is a repaint, a different one is a new screen.
    const key = `${this._view}:${this._cursor}`;
    const grid = this._gridEl();
    const keep = grid && key === this._gridKey ? grid.scrollTop : null;
    this._gridKey = key;
    this.feed(require("./skeleton")(this));
    // The page feed rebuilds the toast slot empty — closing the invite-link
    // card with "Done" reloads the page right after a Copy. Put a live toast
    // back so it still gets its full 3.5s.
    if (this._toast) this._renderToast();
    // The children are not laid out inside feed(), so the scroller has no
    // height to set scrollTop against until the frame settles.
    _.defer(() => {
      if (this.isDestroyed && this.isDestroyed()) return;
      this._placeHoursScroll(keep);
    });
  }

  /** The screen's scroller — the grid root, whatever view drew it. */
  _gridEl() {
    return (this.el && this.el.querySelector(`.${this.fig.family}__grid`)) || null;
  }

  /**
   * The hour canvas draws all 24 hours (skeleton/hours.js — the frame the
   * workspace Meet tab's schedule uses), so an unscrolled week/day grid opens
   * on empty night hours. Two different jobs, and conflating them is how a
   * grid either fights the user or strands them at midnight:
   *
   *   range CHANGED (view switch, next/prev, a day picked) → land on the
   *     earliest timed item in view with one row of context above it, or on the
   *     working hours when nothing is scheduled. Same rule, and the same
   *     default hour, as window/folder/index.js _scrollScheduleIntoView.
   *   range the SAME, page merely re-fed (a live push, a filter repaint, a
   *     modal closing) → put the user back where they were. _render rebuilds
   *     the whole page, so without this every push threw the grid to midnight.
   *
   * Month doesn't scroll by hour and is left alone in the first case.
   */
  _placeHoursScroll(keep) {
    const grid = this._gridEl();
    if (!grid) return;
    if (keep != null) {
      grid.scrollTop = keep;
      return;
    }
    if (grid.getAttribute("data-view") === "month") return;

    const hours = this.getVisibleItems()
      .filter((row) => row.kind === "meeting" && row.stime)
      .map((row) => fromEpoch(row.stime))
      .filter(Boolean)
      .map((d) => d.hour());
    const hour = hours.length ? Math.min(...hours) : DAY_START_HOUR;

    // Measured, not assumed: the row height is a token (--cal-hour-height) and
    // the responsive block is free to change it.
    const rule = grid.querySelector(`.${this.fig.family}__hour-rule`);
    const rowH = (rule && rule.getBoundingClientRect().height) || 0;
    if (!rowH) return;
    // One row of context above the first item, clamped to the top. The header
    // is sticky but in flow, so its height cancels out of the arithmetic.
    grid.scrollTop = Math.max(0, (hour - 1) * rowH);
  }

  /**
   * Repaint ONLY the toolbar row.
   *
   * Opening a dropdown used to call _render(), which re-feeds the whole page —
   * header, toolbar AND the entire month grid with every chip in it — to show
   * a two-item menu. Rebuilding the grid reflows the row above it, so the
   * button visibly jumped as its own menu opened, and a 40-cell month paid for
   * a click that changed nothing below the toolbar.
   *
   * Only state the toolbar draws (which menu is open) may use this. Anything
   * the GRID reads — the view, the cursor, the filter — still needs _render().
   */
  _renderToolbar() {
    // Every open and close of a dropdown comes through here, so this is the one
    // place that has to keep the outside-click dismisser in step.
    this._syncMenuDismiss();

    // SYNCHRONOUS, and it falls back rather than failing.
    //
    // The first cut used ensurePart(...).then(...).catch(() => {}). ensurePart
    // returns a PROMISE that only resolves once the part exists — and if it
    // never resolves, or the feed throws, the catch ate it and the click did
    // nothing at all. A dropdown that silently refuses to open is exactly the
    // failure mode the blank-Calendar bug had, and it is not worth the repaint
    // it was buying.
    //
    // getPart is a plain lookup in _branches. If the part is missing for any
    // reason, fall back to the full render: slower and it reflows the grid,
    // but it always works.
    const part = _.isFunction(this.getPart) ? this.getPart("toolbar") : null;
    if (!part || (part.isDestroyed && part.isDestroyed()) || !part.el) {
      return this._render();
    }
    part.feed(require("./skeleton/toolbar")(this));
  }

  async _reload() {
    this._dirty = false;
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
    // While a modal is open a reload would re-feed the page and the modal with
    // it — replaying its entrance, rebuilding the date picker and dropping
    // whatever is typed but not yet absorbed. Parked the same way a hidden
    // screen is; _closeForm runs it.
    if (this._parked || this._form) {
      this._dirty = true;
      return;
    }
    if (this._reloadTimer) return;
    this._reloadTimer = setTimeout(() => {
      this._reloadTimer = null;
      if (this.isDestroyed && this.isDestroyed()) return;
      // The modal may have opened during the debounce.
      if (this._form) {
        this._dirty = true;
        return;
      }
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
    this._unbindMenuDismiss();
  }

  // ── outside-click dismissal for the toolbar dropdowns ──────────────────────
  //
  // A dropdown used to close ONLY by clicking its own trigger a second time
  // (Lexis, 2026-09-08, about the [month, year] picker). Any click that lands
  // outside the toolbar row closes it now.
  //
  // 🔑 The guard is the WHOLE toolbar row, not "the menu plus its trigger", and
  // that is deliberate. This runs in the CAPTURE phase, so closing repaints the
  // toolbar BEFORE the click reaches whatever it was aimed at — and a repaint
  // destroys the toolbar's children. With a narrower guard, clicking ‹ Today ›,
  // a filter chip or another picker while a menu was open would have destroyed
  // that button mid-click and the click would have done nothing. Every control
  // in the row already calls _closeMenus() in its own handler, so leaving the
  // row alone loses nothing.
  //
  // Capture phase and a `document` listener both follow the folder window's
  // thread menu (window/folder/index.js _bindThreadMenuOutside). Listening on
  // `document` rather than on the menu element is what lets it survive
  // _renderToolbar() rebuilding that element on every open and close.
  //
  // Repaint via _renderToolbar(), NEVER _render(): a full render rebuilds the
  // month grid, i.e. the very element the click is still travelling to.
  _syncMenuDismiss() {
    if (this._viewMenuOpen || this._newMenuOpen || this._rangeMenuOpen) {
      this._bindMenuDismiss();
    } else {
      this._unbindMenuDismiss();
    }
  }

  _bindMenuDismiss() {
    if (this._menuDismiss) return;
    const toolbar = `.${this.fig.family}__toolbar`;
    this._menuDismiss = (ev) => {
      const t = ev && ev.target;
      // No `closest` means no element to reason about (a text node, a click
      // synthesised on the document itself) — leave the menu alone rather than
      // guess.
      if (!t || !t.closest) return;
      if (t.closest(toolbar)) return;
      if (this.isDestroyed && this.isDestroyed()) return this._unbindMenuDismiss();
      this._closeMenus();
      this._renderToolbar();
    };
    document.addEventListener("click", this._menuDismiss, true);
  }

  _unbindMenuDismiss() {
    if (!this._menuDismiss) return;
    document.removeEventListener("click", this._menuDismiss, true);
    this._menuDismiss = null;
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
          files: [],
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
          files: [],
        },
      };
    }
    this._pendingDay = null;
    this._renderModal();
    if (row) this._loadLinkedFiles(this._form);
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
        files: [],
      },
    };
    this._pendingDay = null;
    this._renderModal();
  }

  _closeForm() {
    // Whatever is still uploading has no task or meeting to join any more.
    this._cancelFormUploads(this._form);
    this._form = null;
    // Pushes that landed while the modal was open were held back
    // (_scheduleReload); this is where they are owed.
    // The modal goes first — the reload waits on the network.
    this._renderModal();
    if (this._dirty) return this._reload();
  }

  /**
   * Open, swap or close the modal by re-feeding ONLY its wrapper.
   *
   * Opening used to call _render(), which rebuilt the header, toolbar and the
   * whole grid underneath a dialog that covers them. The wrapper is a stable
   * part of the page ("wrapper-cal-modal"), so it is fed on its own and its
   * data-state — the desk's slot-lift hook — is stamped directly. Falls back
   * to the full render if the part is missing, as _renderToolbar does.
   */
  _renderModal() {
    const part = _.isFunction(this.getPart) ? this.getPart("wrapper-cal-modal") : null;
    if (!part || (part.isDestroyed && part.isDestroyed()) || !part.el) {
      return this._render();
    }
    part.el.setAttribute("data-state", this._form ? "open" : "closed");
    part.feed(modalKids(this));
  }

  // ── in-place form updates ──────────────────────────────────────────────────
  //
  // A click inside the modal (a pill, AM/PM, a toggle, a recipient) changes the
  // draft and then repaints ONLY the element it changed. Nothing in the modal
  // is re-fed, so the card does not replay its entrance, the date picker is
  // not rebuilt, and text the user is typing stays where it is — no absorb
  // pass needed before a click any more, only before a commit.

  _modalEl() {
    return (this.el && this.el.querySelector(`.${this.fig.family}__modal`)) || null;
  }

  /** Light `key` in the option row the clicked element belongs to. */
  _lightOption(cmd, rowSelector, itemSelector, key) {
    const row = cmd.el && cmd.el.closest(rowSelector);
    if (!row) return;
    row.querySelectorAll(itemSelector).forEach((el) => {
      el.setAttribute("data-active", el.getAttribute("data-key") === key ? "1" : "0");
    });
  }

  /** Invite block: toggle rows, the restrict switch and the sub-blocks they reveal. */
  _syncInviteDom() {
    const root = this._modalEl();
    if (!root || !this._form) return;
    const pfx = this.fig.family;
    const d = this._form.draft || {};
    const flag = (on) => (on ? "1" : "0");
    root.querySelectorAll("[data-toggle]").forEach((el) => {
      const on = flag(d[el.getAttribute("data-toggle")]);
      el.setAttribute("data-on", on);
      const box = el.querySelector(`.${pfx}__checkbox`);
      if (box) box.setAttribute("data-checked", on);
      const sw = el.querySelector(`.${pfx}__switch`);
      if (sw) sw.setAttribute("data-on", on);
    });
    root.querySelectorAll("[data-sub]").forEach((el) => {
      el.setAttribute("data-open", flag(d[el.getAttribute("data-sub")]));
    });
  }

  /**
   * Required fields — the ones the skeleton marks `data-required`, so the
   * form, not this method, decides what is required (task: title and
   * description; meeting: title). Blank or whitespace-only fails.
   *
   * A failing field gets data-error="1", which shows its error line and reds
   * its border; the first one takes the focus. Returns true when all pass.
   * The flag comes off again as the user types (_clearFieldError).
   */
  _validateRequired(draft) {
    const root = this._modalEl();
    if (!root) return true;
    let first = null;
    root.querySelectorAll("[data-required='1'][data-field]").forEach((el) => {
      const key = el.getAttribute("data-field");
      const ok = String((draft && draft[key]) || "").trim() !== "";
      el.setAttribute("data-error", ok ? "0" : "1");
      if (!ok && !first) first = el;
    });
    if (!first) return true;
    const input = first.querySelector("input, textarea");
    if (input) input.focus();
    this._bindFieldErrorClear(root);
    return false;
  }

  /**
   * One delegated `input` listener per modal element, bound on the first
   * failed submit: a flagged field loses its error as soon as it holds text
   * again. The modal element is replaced on every open, so the listener goes
   * with it.
   */
  _bindFieldErrorClear(root) {
    if (root.__calErrorClear) return;
    root.__calErrorClear = (ev) => {
      const t = ev.target;
      const field = t && t.closest && t.closest("[data-required='1'][data-error='1']");
      if (field && String(t.value || "").trim() !== "") {
        field.setAttribute("data-error", "0");
      }
    };
    root.addEventListener("input", root.__calErrorClear);
  }

  // ── toast ──────────────────────────────────────────────────────────────────
  //
  // Settings' toast (settings_main _showToast / _renderToast / _placeToast),
  // same markup, timing and placement: a white card with a check (success) or
  // warning (error) glyph, hung under the topbar's utility icons for 3.5s.

  _showToast(message, kind = "success") {
    this._toast = { message, kind };
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this._toastTimer = null;
      this._toast = null;
      this._renderToast();
    }, 3500);
    this._renderToast();
  }

  _renderToast() {
    if (this.isDestroyed && this.isDestroyed()) return;
    const part = _.isFunction(this.getPart) ? this.getPart("cal-toast") : null;
    if (!part || !part.el) return;
    if (!this._toast) return part.feed([]);
    const pfx = this.fig.family;
    const { message, kind } = this._toast;
    const ico = kind === "error" ? "apps-warning" : "app-check";
    part.feed(
      Skeletons.Box.X({
        className: `${pfx}__toast ${pfx}__toast--${kind}`,
        kids: [
          Skeletons.Image.Svg({ ico, className: `${pfx}__toast-ico` }),
          Skeletons.Note({ className: `${pfx}__toast-text`, content: message }),
        ],
      }),
    );
    this._placeToast(part.el);
  }

  /**
   * Right edge on the topbar's utility cluster, TOAST_GAP below it; without
   * a cluster (phone topbar) the slot keeps its CSS corner. Set, measured and
   * corrected by the difference, because this slot lives inside the desk's
   * animated main slot and its `fixed` offsets are not viewport pixels —
   * the reasoning settings_main _placeToast documents.
   */
  _placeToast(slot) {
    const TOAST_GAP = 8;
    slot.style.top = "";
    slot.style.right = "";
    const cluster = document.querySelector(".desk-module-topbar__utility-cluster");
    const c = cluster && cluster.getBoundingClientRect();
    if (!c || !c.width || !c.height) return;
    const want = { top: c.bottom + TOAST_GAP, right: c.right };
    const style = getComputedStyle(slot);
    const got = slot.getBoundingClientRect();
    const sx = slot.offsetWidth ? got.width / slot.offsetWidth : 1;
    const sy = slot.offsetHeight ? got.height / slot.offsetHeight : 1;
    const top = (parseFloat(style.top) || 0) + (want.top - got.top) / (sy || 1);
    const right = (parseFloat(style.right) || 0) + (got.right - want.right) / (sx || 1);
    slot.style.top = `${top}px`;
    slot.style.right = `${right}px`;
  }

  /** Re-feed the recipient chip row alone. */
  _renderRecipients() {
    const list = (this._form && this._form.draft.recipients) || [];
    const part = _.isFunction(this.getPart) ? this.getPart("form-recipient-chips") : null;
    if (!part || !part.el) return;
    part.feed(recipientChips(this, list));
    part.el.setAttribute("data-count", String(list.length));
  }

  // ── attachments ────────────────────────────────────────────────────────────
  //
  // Files upload the moment they are added (upload-progress window, the route
  // the Task tab takes) into the personal hub's hidden task folder; the commit
  // only links the nids (_linkTaskFiles / _linkMeetingFiles). Every callback
  // checks it still belongs to the open form: the modal can close, or another
  // open, while bytes are in flight.

  /** The personal hub's /__chat__/__task__ (mfs_home.task_upload_id). */
  async _attachmentNid() {
    if (this._attachNid) return this._attachNid;
    try {
      const home = await this.fetchService({
        service: (SERVICE.media && SERVICE.media.home) || "media.home",
        hub_id: this._personalHub,
      });
      if (home && home.task_upload_id) this._attachNid = home.task_upload_id;
    } catch (e) {
      this.warn && this.warn("calendar: task folder lookup failed", e);
    }
    return this._attachNid || this._personalNid;
  }

  async _stageFiles(files) {
    const form = this._form;
    if (!form || !files || !files.length) return;
    const draft = form.draft;
    draft.files = draft.files || [];
    const { overflow } = A.stageFiles(draft.files, files);
    if (overflow.length && typeof Butler !== "undefined") Butler.say(LOCALE.CAL_FILES_LIMIT);
    this._renderFiles();
    return this._startUploads(form);
  }

  /** Re-feed the chip list alone (part "form-files"). */
  _renderFiles() {
    const list = (this._form && this._form.draft.files) || [];
    const part = _.isFunction(this.getPart) ? this.getPart("form-files") : null;
    if (!part || !part.el) return;
    part.feed(fileChips(this, list));
    part.el.setAttribute("data-count", String(list.length));
  }

  async _startUploads(form) {
    const list = (form && form.draft.files) || [];
    const fresh = list.filter((pf) => pf.file && !pf.nid && !pf.bundleEntry && pf.status === "queued");
    if (!fresh.length) return;
    const Entry = require("media/bundle/entry");
    const UploadProgress = require("window/upload-progress");
    const paired = A.pairEntries(fresh, Entry.entriesFromFileList(fresh.map((pf) => pf.file)));
    if (!paired.length) return;
    paired.forEach((pf) => (pf.status = "uploading"));
    this._renderFiles();
    const dest = await this._attachmentNid();
    await UploadProgress.runBundle(
      paired.map((pf) => pf.bundleEntry),
      dest,
      this._personalHub,
      null,
      {
        onJob: (job) => paired.forEach((pf) => (pf.bundleJob = job)),
        onFileDone: (node, _parent, entry) => this._onFileDone(form, entry, node),
        onDone: () => this._onBatchDone(form, paired),
      },
    ).catch(() => null);
    // No window, or it refused the batch before making a job: nothing will
    // ever report on these.
    const orphaned = paired.filter((pf) => !pf.bundleJob && pf.bundleEntry && pf.bundleEntry.status !== "canceled");
    if (orphaned.length) {
      orphaned.forEach((pf) => (pf.bundleEntry.status = "error"));
      this._onBatchDone(form, orphaned);
    }
  }

  _onFileDone(form, entry, node) {
    const pf = ((form && form.draft.files) || []).find((f) => f.bundleEntry === entry);
    if (!pf || !A.settleEagerFile(pf, node, this._personalHub)) return;
    if (this._form !== form) return;
    this._renderFiles();
  }

  _onBatchDone(form, pfs) {
    // settleEagerBatch hands failures back for a commit-time retry; this
    // modal has no commit-time upload, so a failure is an error chip with
    // Retry, and a cancel leaves the list.
    const { fallback, dropped } = A.settleEagerBatch(pfs);
    fallback.forEach((pf) => (pf.status = "error"));
    if (dropped.length) {
      const gone = new Set(dropped);
      form.draft.files = form.draft.files.filter((f) => !gone.has(f));
    }
    if (this._form !== form) return;
    if (fallback.length || dropped.length) this._renderFiles();
  }

  async _removeFile(key) {
    const form = this._form;
    if (!form) return;
    const list = form.draft.files || [];
    const pf = list.find((f) => A.fileKey(f) === key);
    if (!pf) return;
    if (pf.linked) {
      // Edit mode: the file is already on the task. Unlinked now, like the
      // Task tab's ✕, addressed with the ROW's hub.
      const row = form.row || {};
      const res = await this.postService({
        service: (SERVICE.task && SERVICE.task.unlink_file) || "task.unlink_file",
        hub_id: row.hub_id || this._personalHub,
        task_id: row.id,
        file_nid: pf.nid,
      });
      if (!Array.isArray(res)) {
        Wm.alert(LOCALE.ERROR_NETWORK);
        return;
      }
    } else if (A.unfinishedPending([pf]).length) {
      require("window/upload-progress").dropEntries(A.itemsOf([pf]));
    }
    if (pf.previewUrl) {
      try {
        URL.revokeObjectURL(pf.previewUrl);
      } catch (_) {}
    }
    form.draft.files = (form.draft.files || []).filter((f) => f !== pf);
    if (this._form === form) this._renderFiles();
  }

  _retryFile(key) {
    const form = this._form;
    const pf = form && (form.draft.files || []).find((f) => A.fileKey(f) === key);
    if (!pf || pf.status !== "error" || !pf.file) return;
    pf.bundleEntry = null;
    pf.bundleJob = null;
    pf.status = "queued";
    this._startUploads(form);
  }

  _cancelFormUploads(form) {
    const list = (form && form.draft && form.draft.files) || [];
    const doomed = A.abandonedPending(list);
    if (doomed.length) require("window/upload-progress").dropEntries(A.itemsOf(doomed));
    for (const pf of list) {
      if (!pf.previewUrl) continue;
      try {
        URL.revokeObjectURL(pf.previewUrl);
      } catch (_) {}
    }
  }

  /** Paperclip: a throwaway <input type=file multiple>. */
  _pickFiles() {
    const form = this._form;
    if (!form) return;
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = () => {
      if (this._form === form) this._stageFiles(Array.from(input.files || []));
    };
    input.click();
  }

  /**
   * Delegated on this.el, so it survives every modal re-feed. Only a COMPUTER
   * file drag (dataTransfer type "Files") while a task/meeting modal is open is
   * ours. Over the Attachments zone it is accepted; anywhere else in the modal
   * it is refused out loud. Either way it is stopped here, because the desk's
   * own drop handler would otherwise upload the file into the home folder.
   */
  _installFileDrop() {
    if (!this.el || this._dropHandlers) return;
    const pfx = this.fig.family;
    const modalOpen = () => this._form && (this._form.kind === "task" || this._form.kind === "meeting");
    const zoneOf = (t) => (t && t.closest ? t.closest(`.${pfx}__files[data-drop-zone="files"]`) : null);
    const light = (zone) => {
      if (this._litZone === zone) return;
      if (this._litZone) this._litZone.setAttribute("data-drop-active", "0");
      if (zone) zone.setAttribute("data-drop-active", "1");
      this._litZone = zone || null;
    };
    const over = (e) => {
      if (!modalOpen() || !A.isFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();
      const zone = zoneOf(e.target);
      try {
        e.dataTransfer.dropEffect = zone ? "copy" : "none";
      } catch (_) {}
      light(zone);
    };
    const leave = (e) => {
      if (this._litZone && !this._litZone.contains(e.relatedTarget)) light(null);
    };
    const drop = (e) => {
      light(null);
      return this._onDrop(e);
    };
    this._dropHandlers = [["dragover", over], ["dragleave", leave], ["drop", drop]];
    for (const [type, fn] of this._dropHandlers) this.el.addEventListener(type, fn);
    this._pasteHandler = (e) => this._onPasteFiles(e);
    document.addEventListener("paste", this._pasteHandler);
  }

  _onDrop(e) {
    if (!this._form || !A.isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    const pfx = this.fig.family;
    const zone = e.target && e.target.closest ? e.target.closest(`.${pfx}__files[data-drop-zone="files"]`) : null;
    if (!zone) {
      if (typeof Butler !== "undefined") Butler.say(LOCALE.WRONG_DROP_AREA);
      return;
    }
    return this._stageFiles(Array.from((e.dataTransfer && e.dataTransfer.files) || []));
  }

  /**
   * Paste files (a screenshot, a file copied in the OS file manager) into the
   * open modal. A paste into the title or description stays text.
   */
  _onPasteFiles(e) {
    if (!this._form || (this._form.kind !== "task" && this._form.kind !== "meeting")) return;
    const t = e && e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    const files = Array.from((e.clipboardData && e.clipboardData.files) || []);
    if (!files.length) return;
    e.preventDefault();
    return this._stageFiles(files);
  }
  /**
   * Before a commit. A failed file must be retried or removed first — this
   * modal has no commit-time upload. A file still on its way asks the
   * upload-progress card (wait, or go without it). True = the commit may go.
   */
  async _gateFiles(form) {
    const list = (form && form.draft.files) || [];
    if (A.failedFiles(list).length) {
      if (typeof Butler !== "undefined") Butler.say(LOCALE.CAL_FILES_FAILED);
      return false;
    }
    const moving = A.unfinishedPending(list);
    if (!moving.length) return true;
    const choice = await require("window/upload-progress").confirmUnfinished({
      items: A.itemsOf(moving),
      action: form.kind === "meeting" || form.mode !== "edit" ? "create" : "update",
    });
    if (this._form !== form || choice !== "skip") return false;
    // "skip" has already cancelled them in their bundle; take them off the list.
    const gone = new Set(A.abandonedPending(form.draft.files));
    form.draft.files = form.draft.files.filter((f) => !gone.has(f));
    return true;
  }

  /** task.link_file per nid. postService never rejects: success = an array. Returns the failure count. */
  async _linkTaskFiles(hub_id, task_id, nids) {
    const svc = (SERVICE.task && SERVICE.task.link_file) || "task.link_file";
    let failed = 0;
    for (const file_nid of nids || []) {
      const res = await this.postService({ service: svc, hub_id, task_id, file_nid });
      if (!Array.isArray(res)) failed++;
    }
    return failed;
  }

  async _linkMeetingFiles(nid, nids) {
    if (!nids || !nids.length) return true;
    const res = await this.postService({
      service: (SERVICE.room && SERVICE.room.link_files) || "room.link_files",
      hub_id: this._personalHub,
      nid,
      file_nids: nids,
    });
    return !!(res && Array.isArray(res.attachments));
  }

  /** Edit mode: the task's current files, as removable chips. */
  async _loadLinkedFiles(form) {
    const row = form.row || {};
    const rows = await this.fetchService({
      service: (SERVICE.task && SERVICE.task.get_linked_files) || "task.get_linked_files",
      hub_id: row.hub_id || this._personalHub,
      task_id: row.id,
    });
    if (this._form !== form || !Array.isArray(rows)) return;
    const linked = rows.map((f) => ({
      nid: f.file_nid,
      linked: 1,
      status: "linked",
      filename: f.filename || "",
      extension: f.extension || f.ext || "",
    }));
    form.draft.files = [...linked, ...(form.draft.files || []).filter((f) => !f.linked)];
    this._renderFiles();
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
    // leaving the meridiem the toggle already set (except for a 24h hour).
    ["start", "end"].forEach((which) => {
      const part = draft[which] || {};
      const hour = data[`${which}_hour`];
      const minute = data[`${which}_minute`];
      if (hour != null && `${hour}`.trim() !== "") part.hour = `${hour}`.trim();
      // A 24-hour entry (13-23, e.g. "16" for 4 PM) is unambiguous: store it
      // the 12h way (4 + PM) instead of letting _epochFor clamp it to 12.
      const h = parseInt(part.hour, 10);
      if (h >= 13 && h <= 23) {
        part.hour = String(h - 12);
        part.meridiem = "PM";
      }
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
    if (!this._validateRequired(draft)) return;
    if (!(await this._gateFiles(this._form))) return;
    const title = String(draft.title || "").trim();

    // The form is only cleared once the write comes back, so every trigger
    // that lands while the request is in flight would post again — a second
    // Enter (the Entry resets its own `_done` guard on each keyup), a
    // double-clicked Create button, Enter followed by a click. One in-flight
    // write per modal.
    if (this._submitting) return;
    this._submitting = true;
    try {
      await this._writeTask(draft, title);
    } finally {
      this._submitting = false;
    }
  }

  async _writeTask(draft, title) {
    const form = this._form;
    const editing = form.mode === "edit";
    const svcCreate = (SERVICE.task && SERVICE.task.create) || "task.create";
    const svcUpdate = (SERVICE.task && SERVICE.task.update) || "task.update";
    const svcStatus =
      (SERVICE.task && SERVICE.task.update_status) || "task.update_status";
    let linkFailed = 0;

    if (!editing) {
      // Personal task: personal-hub scope, and no assignee_uids at all —
      // requirement §4 wants assignment refused, not hidden, and the server
      // rejects it for a personal hub. Sending an empty array would still be
      // sending the field.
      const created = rowOf(await this.postService({
        service: svcCreate,
        hub_id: this._personalHub,
        nid: this._personalNid,
        title,
        description: draft.description || null,
        status: draft.status || "todo",
        priority: draft.priority || "medium",
        due_date: draft.due_date || null,
      }));
      if (!created) {
        Wm.alert(LOCALE.ERROR_NETWORK);
        return;
      }
      linkFailed = await this._linkTaskFiles(this._personalHub, created.id, A.nidsToLink(draft.files));
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
      linkFailed = await this._linkTaskFiles(hub_id, row.id, A.nidsToLink(draft.files));
    }

    // The task exists either way; a file that would not link is said out loud
    // rather than closing the modal on it silently.
    if (linkFailed) this._showToast(LOCALE.CAL_FILES_NOT_ATTACHED, "error");

    this._form = null;
    await this._reload();
  }

  async _deleteTask() {
    const row = (this._form && this._form.row) || null;
    if (!row) return;
    if (this._submitting) return;
    this._submitting = true;
    try {
      await this._writeDelete(row);
    } finally {
      this._submitting = false;
    }
  }

  async _writeDelete(row) {
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
    if (!this._validateRequired(draft)) return;
    const title = String(draft.title || "").trim();
    if (!draft.date) return;
    if (!(await this._gateFiles(this._form))) return;

    // Same in-flight guard as _submitTask: room.book runs two round trips
    // before the modal is replaced, and a second trigger in that window
    // would book the room twice.
    if (this._submitting) return;
    this._submitting = true;
    try {
      await this._writeMeeting(draft, title);
    } finally {
      this._submitting = false;
    }
  }

  async _writeMeeting(draft, title) {
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

    // Before public_link, which grants the link whatever is attached when it runs.
    const linked = await this._linkMeetingFiles(nid, A.nidsToLink(draft.files));
    if (!linked) this._showToast(LOCALE.CAL_FILES_NOT_ATTACHED, "error");

    // Link + optional password. public_link accepts `password` today.
    const linkPayload = { service: linkSvc, hub_id: this._personalHub, nid };
    if (draft.password_on && draft.password) linkPayload.password = draft.password;
    const answer = await this.postService(linkPayload);
    const link = answer && answer.link;

    if (link) copyToClipboard(link);
    this._form = { kind: "invite-link", link: link || "" };
    // The new meeting reaches the grid when this card closes (_closeForm),
    // not underneath it — a reload now would re-feed the card it just opened.
    this._dirty = true;
    this._renderModal();
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
   * A PERSONAL task is this screen's own record and opens the editable modal
   * right here — there is no workspace to go to.
   *
   * A WORKSPACE task or meeting is owned by its folder, and the Calendar is
   * only a renderer of it (see the note at the top of this file). So the click
   * hands the user over to the surface that DOES own it: switch to that
   * workspace, open its Task / Meeting tab, open that record's own panel. Which
   * also settles the read-only question the earlier C-10 note left open — the
   * item is fully editable, under its own ACL, in its own window, instead of
   * half-editable in a preview card here.
   */
  _openItem(cmd) {
    const id = cmd.mget("itemId");
    const kind = cmd.mget("itemKind");
    // A generated occurrence is not its own record — it carries the SERIES'
    // id, so the lookup below lands on the series either way.
    //
    // It used to `return` here, and that made a whole class of chip a DEAD
    // CLICK: expandRecurrence leaves only the instance that falls on the
    // series' own start date unflagged, so a recurring meeting is made
    // entirely of occurrences in every month except the one it started in.
    // Nothing on screen said so — the chip looked exactly like any other.
    // Taking the user to the series is what the chip promises ("a chip takes
    // you to the item"); refusing to EDIT one instance from here is a
    // narrower rule, and it is kept below, where the editable modal is.
    const occurrence = !!Number(cmd.mget("itemOccurrence"));
    const row = this._items.find(
      (r) => `${r.id}` === `${id}` && r.kind === kind,
    );
    if (!row) {
      // The window was reloaded (or filtered) between paint and click. Said
      // out loud because a silent return here is indistinguishable from a
      // chip that is simply not wired up.
      this.warn("calendar: clicked item is no longer in the loaded window", {
        id,
        kind,
      });
      return;
    }
    if (row.scope === "personal" && row.can_write && row.kind === "task") {
      // Editing ONE instance of a series is a separate feature: opening the
      // editable modal on the series from an occurrence would let a user
      // rewrite every instance while believing they were changing this one.
      if (occurrence) {
        this.warn("calendar: an occurrence of a recurring item is not editable", id);
        return;
      }
      this._openTaskForm(row);
      return;
    }
    // The occurrence's OWN start, so the workspace's Meeting tab anchors on
    // the date the user clicked rather than on the series origin.
    const stime = Number(cmd.mget("itemStime")) || 0;
    return this._openInWorkspace(row, { stime });
  }

  /**
   * Hand a workspace-owned row over to its own workspace: dock that workspace,
   * open the tab that owns the record, open the record.
   *
   * ONE ENTRY POINT, deliberately — Wm.openNotificationLocation. It is the
   * DOCKED opener (`#/desk/wm/reveal/`), and every step this needs already
   * lives there: mount-or-reuse the pane, wait for its folder view, release the
   * section screen this Calendar is, navigate, switch tab, open the detail,
   * light the rail. Building a second opener here would duplicate all of it and
   * drift from it.
   *
   * NOT Wm.launch / openFileLocation, and not because they are merely
   * different: a launch-time `activeTab` of "meeting" makes window_folder
   * START A CALL (its onDomRefresh), so a meeting chip would place a video
   * call instead of showing the meeting. Only the docked route sets the tab
   * after the pane is mounted.
   *
   * PERSONAL rows never come here. A personal item lives in the user's own hub
   * (hub_id = Visitor.id), which is not a workspace you switch to — its
   * children ARE the desk's home grid — so there is nowhere to send the user.
   * A personal task is handled by the caller; a personal meeting keeps today's
   * behaviour of opening nothing.
   */
  _openInWorkspace(row, opt = {}) {
    if (!row) return;
    // Every refusal below is a click that does NOTHING, on a chip that looks
    // identical to one that works. Each one says why, because "the calendar's
    // chips are not clickable" is the report they all arrive as, and the three
    // causes need three different fixes.
    if (row.scope === "personal") {
      this.warn(
        "calendar: personal items have no workspace to open — the personal hub is not a dockable pane",
        { id: row.id, kind: row.kind },
      );
      return;
    }
    if (!row.hub_id) {
      // calendar.list states hub_id as REQUIRED (skeleton/helpers.js). A row
      // without one came from a server that predates that contract, or from a
      // workspace fan-out that could not resolve the hub.
      this.warn("calendar: row carries no hub_id — cannot open it in its workspace", row);
      return;
    }
    if (!window.Wm || !_.isFunction(Wm.openNotificationLocation)) {
      this.warn("calendar: Wm.openNotificationLocation is unavailable");
      return;
    }

    const args = {
      hub_id: row.hub_id,
      // filetype is stated rather than left out. openNotificationLocation
      // decides whether the target IS the folder to show or a file to show
      // INSIDE its parent from this key, and a calendar.list row carries no
      // filetype of its own — so an omitted one would ride on that method's
      // fallback instead of on what we actually mean.
      filetype: _a.folder,
      pid: 0,
    };

    if (row.kind === "meeting") {
      // The workspace ROOT (nid 0), never row.nid. For a meeting row nid IS
      // the meeting node — a `schedule` node, not a container — and navigating
      // to it would resolve a file where a folder is expected. Meetings are
      // hub-scoped anyway (room.* takes hub_id; one room per workspace), so the
      // root is the right and only place to land. Same reason the activity
      // panel's meeting_notice sends `meeting_pid` rather than the node.
      args.nid = 0;
      args.open_meeting_nid = row.id;
      // Saves the window a lookup: it anchors its schedule on this so the
      // meeting is inside the range room.list is asked for. 0 for an all-day
      // row, which openMeetingDeepLink falls back from.
      //
      // The CLICKED occurrence's start wins over the series origin: anchoring
      // on the origin would open the Meeting tab on a month the user never
      // asked for (and, for a series that started long ago, on one that no
      // longer holds the meeting at all).
      args.open_meeting_stime = Number(opt.stime) || row.stime || 0;
    } else {
      // The folder the task was filed in, so the pane lands where the task
      // lives and a task created from the board afterwards is filed there too.
      // Falsy → 0, the server's "this hub's root" shortcut.
      args.nid = row.nid || 0;
      args.open_task_id = row.id;
    }

    return Wm.openNotificationLocation(args);
  }


  // ── events ─────────────────────────────────────────────────────────────────

  async onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    switch (service) {
      case "cal-prev":
        return this._step(-1);
      case "cal-next":
        return this._step(1);
      // Menu open/close is toolbar-only state — never repaint the grid for it.
      case "cal-toggle-view-menu":
        this._viewMenuOpen = !this._viewMenuOpen;
        this._newMenuOpen = false;
        this._rangeMenuOpen = false;
        return this._renderToolbar();

      case "cal-toggle-range-menu":
        this._rangeMenuOpen = !this._rangeMenuOpen;
        this._viewMenuOpen = false;
        this._newMenuOpen = false;
        // Each open starts on the month the calendar is actually showing —
        // otherwise the popup reopens wherever the user last browsed to and
        // stopped, which is not where the grid behind it is.
        this._pickerCursor = null;
        return this._renderToolbar();

      // ‹ › either side of the popup's month. Moves the POPUP only, so this is
      // a toolbar repaint and not a refetch — the grid behind it has not moved.
      // Stays open: stepping is how the user browses to the month they want.
      case "cal-picker-step": {
        const delta = Number(cmd.mget("calStep"));
        if (delta !== 1 && delta !== -1) return;
        const shown = day(this._pickerCursor) || day(this._cursor) || Dayjs();
        this._pickerCursor = ymd(shown.add(delta, "month"));
        return this._renderToolbar();
      }

      // A day picked in the popup. Anchors the calendar on it in whatever view
      // is current — the day view lands on that day, week on its week, month on
      // its month — which is what the Meet tab's `sched-pick-day` does.
      case "cal-pick-day": {
        const picked = day(cmd.mget("calDay"));
        if (picked) this._cursor = ymd(picked);
        this._closeMenus();
        // The fetch window moves with the cursor, so this is a refetch.
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
        return this._renderToolbar();

      case "cal-new-task":
        return this._openTaskForm(null);
      case "cal-new-meeting":
        return this._openMeetingForm();

      case "cal-day-add":
        this._pendingDay = cmd.mget("calDay");
        return this._openTaskForm(null);

      // A square on the week/day canvas → the create-TASK popup, due that
      // day. It used to open the meeting form at that hour, which is what the
      // Meet tab's cells do — but this calendar is where a user plans their
      // own day, and a task is the thing they add most. The hour clicked is
      // deliberately not used: a task's due_date is a calendar DATE with no
      // time (see skeleton/hours.js), so the task lands in that day's all-day
      // strip, which is where every task on this canvas lives. A meeting is
      // still one click away in "+ New".
      case "cal-slot-add":
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
        return this._lightOption(
          cmd,
          `.${this.fig.family}__pills`,
          `.${this.fig.family}__pill`,
          this._form.draft.status,
        );

      case "cal-form-priority":
        if (!this._form) return;
        this._form.draft.priority = cmd.mget("calPriority") || "medium";
        return this._lightOption(
          cmd,
          `.${this.fig.family}__pills`,
          `.${this.fig.family}__pill`,
          this._form.draft.priority,
        );

      case "cal-form-time":
        // Absorbed at commit from getData(); nothing to do per keystroke.
        return;

      case "cal-form-meridiem": {
        if (!this._form) return;
        const which = cmd.mget("calWhich") === "end" ? "end" : "start";
        const part = this._form.draft[which] || {};
        part.meridiem = cmd.mget("calMeridiem") === "PM" ? "PM" : "AM";
        this._form.draft[which] = part;
        return this._lightOption(
          cmd,
          `.${this.fig.family}__meridiem`,
          `.${this.fig.family}__meridiem-item`,
          part.meridiem,
        );
      }

      case "cal-toggle-require-email": {
        if (!this._form) return;
        const d = this._form.draft;
        d.require_email = !d.require_email;
        // Turning the requirement off makes the restriction meaningless.
        if (!d.require_email) {
          d.restrict = false;
        }
        return this._syncInviteDom();
      }

      case "cal-toggle-restrict":
        if (!this._form) return;
        this._form.draft.restrict = !this._form.draft.restrict;
        return this._syncInviteDom();

      // The sign-in form's eye toggle (welcome/signin index.js): flip the
      // input between password and text, and swap the icon to match.
      case "cal-toggle-password-visibility": {
        const row = cmd.el && cmd.el.closest(`.${this.fig.family}__password`);
        const input = row && row.querySelector("input");
        if (!input) return;
        const visible = input.type === "text";
        input.type = visible ? "password" : "text";
        const use = cmd.el.querySelector("svg use");
        if (use) {
          use.setAttribute("xlink:href", visible ? "#--icon-eye_closed" : "#--icon-eye");
        }
        cmd.el.dataset.state = visible ? "0" : "1";
        return;
      }

      case "cal-toggle-password":
        if (!this._form) return;
        this._form.draft.password_on = !this._form.draft.password_on;
        return this._syncInviteDom();

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
        return this._renderRecipients();
      }

      case "cal-remove-recipient": {
        if (!this._form) return;
        const email = cmd.mget("calEmail");
        this._form.draft.recipients = (this._form.draft.recipients || []).filter(
          (e) => e !== email,
        );
        return this._renderRecipients();
      }

      // The title Entry carries `service: "cal-submit-task"` so Enter commits.
      // The base Entry reports through that same service on other statuses too
      // — "interactive" on every printable keyup when interactive:1 is set,
      // "cancel" on Escape — and a status that is not a commit must never
      // reach task.create. Typing the title used to create one task per
      // letter that way ("a", "ab", "abc"). The Entry no longer asks for
      // interactive, and this keeps any status but an explicit commit out of
      // the write regardless. A click on the Create button carries no
      // __inputStatus at all, so it passes. Same guard as invite-popup.
      case "cal-pick-files":
        return this._pickFiles();
      case "cal-file-remove":
        return this._removeFile(cmd.mget("calFileKey"));
      case "cal-file-retry":
        return this._retryFile(cmd.mget("calFileKey"));

      case "cal-submit-task":
        if (args && args.__inputStatus && args.__inputStatus !== _a.commit) {
          return;
        }
        return this._submitTask();
      case "cal-delete-task":
        return this._deleteTask();
      case "cal-submit-meeting":
        if (args && args.__inputStatus && args.__inputStatus !== _a.commit) {
          return;
        }
        return this._submitMeeting();

      case "cal-copy-link": {
        const link = this._form && this._form.link;
        if (link) {
          copyToClipboard(link);
          this._showToast(LOCALE.URL_COPIED, "success");
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
