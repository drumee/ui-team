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
// for its own personal-scope launches. A personal task carries no assignee —
// there is nobody else to give it to — so no write here sends one. The server
// would accept it (task.update_assignee does not check the hub), so omitting
// the field is the only gate there is.
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
  dateOnly,
  itemsByDay,
} = require("./skeleton/helpers");
const { armItemsReady, markItemsReady } = require("libs/items-ready");
const { modalKids } = require("./skeleton");
const { recipientChips } = require("./skeleton/meeting-form");
const A = require("./attachments");
const hotkeys = require("libs/hotkeys");
const { rowOf } = require("../../window/tasks/live-sync");
const { fileChips, taskFileChips, fileResults } = require("./skeleton/attachments");
const { subtaskBody } = require("./skeleton/task-form");
const { rangeDisable } = require("./skeleton/date-field");

// A task's DATE as the pickers and task.update take it (YYYY-MM-DD), or "".
// The date part of what the server sends (dateOnly), never Dayjs(instant):
// west of UTC that is the day before, and every save would move the task back
// a day. Sending the instant itself back is refused outright (task.update fails).
const dateOf = (v) => dateOnly(v) || "";

// One "Restrict access" entry as the guest gate matches it (server dmz.js
// _emailMatchesAllowed): an email address, or a domain written "@domain".
// A bare "domain.tld" is taken as that domain. Lower-cased; anything else is
// refused (null).
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN = /^@?([a-z0-9-]+\.)+[a-z]{2,}$/;
function recipientEntry(raw) {
  const v = String(raw || "").trim().toLowerCase();
  if (EMAIL.test(v)) return v;
  if (DOMAIN.test(v)) return v.startsWith("@") ? v : `@${v}`;
  return null;
}

// task.search_files also lists folders and the hub root; a task links files.
const NOT_ATTACHABLE = ["folder", "hub", "root", "schedule"];

const VIEW_KEYS = ["month", "week", "day"];
const FILTER_KEYS = ["all", "task", "meeting"];
const AUDIENCE_KEYS = ["personal", "team"];
// A parked calendar (desk keep-alive) revealed after this long re-reads its
// window even if no push arrived meanwhile — a missed push is plausible by then.
const PARKED_REFRESH_MS = 60 * 1000;
// How long the ‹ Today › spinner stays up after a ‹ › click, at least. A
// prefetched window redraws in a few dozen ms — too short to see — and the
// spinner is the click's only feedback when the grid barely changes.
const NAV_SPINNER_MIN_MS = 300;

class __calendar_main extends LetcBox {
  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    armItemsReady(this);
    this.declareHandlers();

    // Month, unless the entry point NAMED a view: the Daily Reminder card's
    // meetings tile asks for today in `day` view. Validated against VIEW_KEYS,
    // so a malformed or stale option can only ever fall back to the default —
    // an unknown string would otherwise reach GRIDS[view] in the skeleton and
    // silently render the month grid under a toolbar claiming something else.
    const startView = this.mget("startView");
    this._view = VIEW_KEYS.includes(startView) ? startView : "month";
    this._cursor = ymd(Dayjs());
    // Not persisted, by spec: the filter resets to All every session — unless
    // the entry point names one: the Daily Reminder's due-tasks tile opens on
    // Task, its meetings tile on Meeting. Validated like startView.
    const startFilter = this.mget("startFilter");
    this._filter = FILTER_KEYS.includes(startFilter) ? startFilter : "all";
    // Personal | Team. Team — every row calendar.list sends — is the default:
    // it is the set this screen showed before the toggle existed, and the
    // Daily Reminder's task and meeting tiles count workspace items only, so a
    // Personal default would open their calendar on an empty grid.
    this._audience = "team";
    this._items = [];
    this._form = null;
    // Which toolbar dropdown is open — "view", "new", "range" (the range
    // label's mini calendar) or "filter" — or null. One value rather than a
    // flag per menu, so opening one closes the others by construction and
    // _closeMenus has a single thing to reset.
    this._openMenu = null;
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
    if (this._subMenuDismiss) {
      document.removeEventListener("click", this._subMenuDismiss, true);
      this._subMenuDismiss = null;
    }
    // A pending file search would otherwise still fire into a torn-down widget:
    // its `this._form === form` guard holds as long as the form is kept.
    const form = this._form;
    if (form && form.search) {
      clearTimeout(form.search.timer);
      clearTimeout(form.search.blurTimer);
    }
    this._cancelFormUploads(form);
    this._form = null;
    if (this._dropHandlers && this.el) {
      for (const [type, fn] of this._dropHandlers) this.el.removeEventListener(type, fn);
      this._dropHandlers = null;
    }
    if (this._pasteHandler) {
      document.removeEventListener("paste", this._pasteHandler);
      this._pasteHandler = null;
    }
    if (this._timeFilter && this.el) {
      this.el.removeEventListener("input", this._timeFilter);
      this.el.removeEventListener("change", this._timeFilter);
      this._timeFilter = null;
    }
    if (this._formKeys) {
      document.removeEventListener("keydown", this._formKeys, true);
      this._formKeys = null;
    }
    // Its listeners live on `document` and `window`.
    this._closeDayMenu();
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
    this._installTimeFilter();
    this._installFormKeys();
    this._render();
    this._loadItems().then(() => {
      if (this.isDestroyed && this.isDestroyed()) return;
      this._render();
      // First window painted — events, the empty grid, or "Try again" after a
      // failed calendar.list (_loadItems resolves either way). A reload's
      // screen restore waits on this (libs/items-ready).
      markItemsReady(this);
      // So the first ‹ or › answers from cache.
      this._prefetchNeighbours();
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
      this._prefetchNeighbours();
    });
  }

  /**
   * Parked by the desk. The live subscription stays bound (it is what makes
   * the reveal cheap), but a push must not fetch and rebuild a display:none
   * page — note it and let onPanelShown do one reload.
   */
  onPanelHidden() {
    this._parked = true;
    this._closeDayMenu();
  }

  /**
   * Point the screen at `view`, on TODAY — for an entry point that names one
   * rather than taking the screen as the user left it. The Daily Reminder
   * card is the only such caller today: [My calendar] opens the month view on
   * All, the due-tasks tile the month view on Task, the meetings tile the day
   * view on Meeting (Lexis, 2026-10-20).
   *
   * A FRESH mount reads the same thing from its `startView` option, and that
   * is the path that matters most, because the kind may still be lazy-loading
   * when the desk's togglePanel promise settles — nothing can be called on it
   * then. This method is the other half: the desk keeps this screen alive
   * (KEEP_ALIVE_MAIN_KINDS), so an instance that is merely REVEALED, or is
   * already on screen where an open-only togglePanel is a deliberate no-op,
   * never sees launch options and would otherwise keep the view it was left on.
   *
   * It also puts the toolbar back on Team, and on `filter` (All when the
   * caller names none). The card's tiles count workspace items, so a screen
   * left on Personal, or on another kind, would open without the very items
   * the card just counted.
   *
   * No-op when the screen is already exactly there, so the fresh-mount path —
   * which just read the same view from its options — does not pay for a second
   * fetch of the window it is already loading.
   */
  focusView(view, filter) {
    if (!VIEW_KEYS.includes(view)) return;
    if (!FILTER_KEYS.includes(filter)) filter = "all";
    const today = ymd(Dayjs());
    if (
      this._view === view &&
      this._cursor === today &&
      this._audience === "team" &&
      this._filter === filter
    ) {
      return;
    }
    this._view = view;
    this._cursor = today;
    this._audience = "team";
    this._filter = filter;
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

  /** The Personal | Team toolbar state. */
  getActiveAudience() {
    return this._audience;
  }

  getForm() {
    return this._form;
  }

  /** Is this toolbar dropdown ("view", "new", "range", "filter") the open one? */
  isMenuOpen(name) {
    return this._openMenu === name;
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

  /** Is a ‹ › / Today / view switch still waiting on its window's rows? */
  isNavLoading() {
    return !!this._navLoading;
  }

  /**
   * The rows the current view should draw: recurrence expanded into the visible
   * window, then the All / Task / Meeting filter and the Personal | Team toggle
   * applied.
   *
   * Expansion is client-side by the server's own stated contract (room.js: "the
   * calendar expands occurrences client-side").
   */
  getVisibleItems() {
    const { from, to } = viewRange(this._view, this._cursor);
    const out = [];
    this._items.forEach((row) => {
      if (!passesFilter(row, this._filter)) return;
      if (this._audience === "personal" && row.scope !== "personal") return;
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
   *
   * `{ cached: true }` is the ‹ › / view-switch path (_navigate): a window
   * already read (or being prefetched) is reused instead of paying another
   * round trip. Every other caller — first paint, a live push, our own writes —
   * wants the server's truth, so a plain load drops the cache first.
   *
   * A load overtaken by a newer one (fast ‹ ‹ ‹ clicks) leaves _items alone:
   * applying it would draw one window's rows under another window's range.
   */
  async _loadItems({ cached = false } = {}) {
    const { from, to } = viewRange(this._view, this._cursor);
    if (!cached) this._dropWindowCache();
    const seq = (this._loadSeq = (this._loadSeq || 0) + 1);
    this._loading = true;
    const list = await this._fetchWindow(from, to, cached);
    if (seq !== this._loadSeq) return;
    this._loading = false;
    this._loadedAt = Date.now();

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
    this._items = list;
  }

  /**
   * The normalized rows for [from, to], or null when the read failed.
   *
   * With `cached`, a window read less than PARKED_REFRESH_MS ago — or one
   * whose read is still in flight (a neighbour prefetch the user just clicked
   * onto) — is answered from _windows. Failures are never cached.
   */
  _fetchWindow(from, to, cached) {
    const key = `${ymd(from)}|${ymd(to)}`;
    if (!this._windows) this._windows = new Map();
    const hit = this._windows.get(key);
    if (cached && hit && (hit.pending || Date.now() - hit.at < PARKED_REFRESH_MS)) {
      return hit.promise;
    }
    const gen = this._windowGen || 0;
    const entry = { pending: true, at: 0 };
    entry.promise = this._readWindow(from, to).then((list) => {
      entry.pending = false;
      entry.at = Date.now();
      // Dropped meanwhile (a push or a write invalidated it), or failed.
      if (!list || gen !== (this._windowGen || 0)) {
        if (this._windows.get(key) === entry) this._windows.delete(key);
      }
      return list;
    });
    this._windows.set(key, entry);
    return entry.promise;
  }

  async _readWindow(from, to) {
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
        // One day of slack each side. The server turns these dates into
        // epochs in ITS timezone (calendar.js _epoch — UTC on stage), but a
        // meeting is placed on the VIEWER's local day: 00:00 on the 2nd in
        // UTC+7 is 17:00 on the 1st in UTC, so a Day view of the 2nd never
        // got it back while the month window did. A day covers any UTC
        // offset; getVisibleItems keeps only rows on the view's own days.
        from: ymd(from.subtract(1, "day")),
        to: ymd(to.add(1, "day")),
        // `kinds` is deliberately NOT sent: the server defaults to both, and an
        // array in a GET query string is a serialization risk for no gain —
        // the All / Task / Meeting filter is applied client-side over the
        // fetched window anyway (see getVisibleItems).
      });
    } catch (e) {
      this.warn && this.warn("[calendar] calendar.list failed", e);
      rows = null;
    }

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
    if (!list) return null;
    return list.map((r) => normalizeRow(r)).filter(Boolean);
  }

  /** Forget every cached window, and orphan any read still in flight. */
  _dropWindowCache() {
    this._windowGen = (this._windowGen || 0) + 1;
    if (this._windows) this._windows.clear();
  }

  /**
   * Warm the windows one ‹ and one › away, so the arrows answer from cache.
   * Fire-and-forget: a prefetch only fills _windows, never the screen.
   */
  _prefetchNeighbours() {
    if (this._parked || (this.isDestroyed && this.isDestroyed())) return;
    [-1, 1].forEach((d) => {
      const { from, to } = viewRange(this._view, this._neighbour(d));
      this._fetchWindow(from, to, true);
    });
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
    // The page feed rebuilds the day-menu slot empty and the "+" it hangs
    // from, so an open day menu has nothing left to point at.
    this._closeDayMenu();
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
      // ‹ Today › asked for today's cell: one shot, on the paint that has the
      // rows (a miss paints once before they land, and the second paint would
      // cut a smooth scroll short). Later repaints keep where this one went.
      if (this._scrollTodayPending && !this._loading) {
        this._scrollTodayPending = false;
        if (this._scrollToToday()) return;
      }
      this._restoreGridScroll(keep);
    });
  }

  /** The screen's scroller — the grid root, whatever view drew it. */
  _gridEl() {
    return (this.el && this.el.querySelector(`.${this.fig.family}__grid`)) || null;
  }

  /**
   * A page merely re-fed on the same range (a live push, a filter repaint, a
   * modal closing) puts the user back where they were: _render rebuilds the
   * whole page, so without this every push threw the grid back to the top. A
   * new range (view switch, next/prev, a day picked) opens at the top.
   */
  _restoreGridScroll(keep) {
    const grid = this._gridEl();
    if (grid && keep != null) grid.scrollTop = keep;
  }

  /**
   * Centre today's cell in the grid — the month square, or the week's column
   * (the grid scrolls sideways on a phone). False when today is not drawn.
   * Scrolls the grid alone: scrollIntoView would move the desk around it too.
   */
  _scrollToToday() {
    const grid = this._gridEl();
    const cell = grid && grid.querySelector('[data-today="1"]');
    if (!cell) return false;
    const g = grid.getBoundingClientRect();
    const c = cell.getBoundingClientRect();
    grid.scrollTo({
      top: grid.scrollTop + c.top - g.top - (g.height - c.height) / 2,
      left: grid.scrollLeft + c.left - g.left - (g.width - c.width) / 2,
      behavior: "smooth",
    });
    return true;
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
   * the GRID reads — the view, the cursor, the filter, Personal | Team — still
   * needs _render().
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
      // Meetings push on room.scheduled to new INVITEES (room.js
      // _notify_invitees), and on room.book / room.update / room.remove to
      // every socket on the meeting's hub (room.js _broadcast).
      //
      // No hub_id filter on purpose. This screen lists the workspace meetings
      // the user takes part in as well as the personal ones (calendar.list
      // _meetings reads the global index by participation), and the push only
      // carries { nid, hub_id } — so a push from any hub this socket hears may
      // be a meeting drawn here. Filtering on the loaded nids fails too: a
      // meeting moved INTO the visible range is not loaded yet. The cost is
      // one debounced re-read (_scheduleReload) per push.
      case "room.scheduled":
      case "room.book":
      case "room.update":
      case "room.remove":
        this._scheduleReload();
        return;
      default:
        if (super.onWsMessage) super.onWsMessage(svc, data, options);
    }
  }

  // ── navigation ─────────────────────────────────────────────────────────────

  _step(direction) {
    this._cursor = this._neighbour(direction);
    return this._navigate();
  }

  /** The cursor one ‹ (-1) or › (+1) away in the current view. */
  _neighbour(direction) {
    const unit = this._view === "day" ? "day" : this._view === "week" ? "week" : "month";
    const anchor = day(this._cursor) || Dayjs();
    return ymd(anchor.add(direction, unit));
  }

  /**
   * The cursor or the view moved: show the new window NOW, data second.
   *
   * This used to be _reload(), so every ‹ › waited a full calendar.list round
   * trip with the old range still on screen. Now a cached window (the
   * neighbours are prefetched) paints at once with no request at all; a miss
   * paints the new range immediately over the rows already held — the grid
   * only draws those that fall inside it — and repaints when the read lands.
   *
   * The ‹ Today › pill spins (isNavLoading) on every click, for the read if
   * there is one and for at least NAV_SPINNER_MIN_MS either way. It goes off by
   * re-stamping the pill, not by another page rebuild.
   */
  async _navigate() {
    this._closeMenus();
    const key = `${this._view}:${this._cursor}`;
    const started = Date.now();
    this._navLoading = true;
    const load = this._loadItems({ cached: true });
    // A cache hit has already resolved, but awaiting is a microtask — paint
    // the miss case before it, so the label and the grid move on the click.
    const { from, to } = viewRange(this._view, this._cursor);
    const hit = this._windows && this._windows.get(`${ymd(from)}|${ymd(to)}`);
    if (!hit || hit.pending) this._render();
    await load;
    if (this.isDestroyed && this.isDestroyed()) return;
    // Overtaken by another click: that one paints.
    if (key !== `${this._view}:${this._cursor}`) return;
    this._render();
    this._prefetchNeighbours();
    clearTimeout(this._navSpinnerTimer);
    this._navSpinnerTimer = setTimeout(() => {
      this._navSpinnerTimer = null;
      if (this.isDestroyed && this.isDestroyed()) return;
      // A newer click owns the spinner now.
      if (key !== `${this._view}:${this._cursor}`) return;
      this._navLoading = false;
      this._stampNavLoading();
    }, Math.max(0, NAV_SPINNER_MIN_MS - (Date.now() - started)));
  }

  /** Mirror isNavLoading onto the pill on screen, without a rebuild. */
  _stampNavLoading() {
    const nav = this.el && this.el.querySelector(`.${this.fig.family}__nav`);
    if (!nav) return;
    nav.setAttribute("data-loading", this._navLoading ? "1" : "0");
    nav.setAttribute("aria-busy", this._navLoading ? "true" : "false");
  }

  _closeMenus() {
    this._openMenu = null;
    this._unbindMenuDismiss();
  }

  /** Open `name`, or close it if it is the one already open. */
  _toggleMenu(name) {
    // One dropdown at a time, the day cell's "+" menu included.
    this._closeDayMenu();
    this._openMenu = this._openMenu === name ? null : name;
    return this._renderToolbar();
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
  // the Personal | Team toggle or another picker while a menu was open would
  // have destroyed that button mid-click and the click would have done
  // nothing. Every control in the row already calls _closeMenus() in its own
  // handler, so leaving the row alone loses nothing.
  //
  // Capture phase and a `document` listener both follow the folder window's
  // thread menu (window/folder/index.js _bindThreadMenuOutside). Listening on
  // `document` rather than on the menu element is what lets it survive
  // _renderToolbar() rebuilding that element on every open and close.
  //
  // Repaint via _renderToolbar(), NEVER _render(): a full render rebuilds the
  // month grid, i.e. the very element the click is still travelling to.
  _syncMenuDismiss() {
    if (this._openMenu) {
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

  // ── a day cell's "+" menu ──────────────────────────────────────────────────
  //
  // The "+ New" dropdown's Task / Meeting rows, opened from a day cell's "+"
  // and due that day. It is NOT a fifth toolbar menu: those live in the
  // toolbar row and repaint with it, while this one hangs from a cell in the
  // grid, and rebuilding the grid to open it would destroy the "+" that was
  // clicked. So it is fed into one floating slot on the page (skeleton/index.js
  // "cal-day-menu"), placed under the "+" in viewport coordinates, and closed by
  // a click anywhere else, Escape, a scroll or a resize — any of which would
  // leave it pointing at the wrong place.

  /** Open the menu under the clicked "+", or close it if that "+" owns it. */
  _toggleDayMenu(cmd) {
    const key = cmd && cmd.mget && cmd.mget("calDay");
    this._toggleDayPopover(cmd, () => require("./skeleton/toolbar").dayMenu(this, key));
  }

  /**
   * A month cell's "+N more": every visible item of that day, grouped by kind
   * (skeleton/day-popover.js), in the same floating slot, laid OVER the cell
   * rather than under the control — the cell is what it expands.
   */
  _toggleDayMore(cmd) {
    const key = cmd && cmd.mget && cmd.mget("calDay");
    const owner = cmd && cmd.el;
    const cell = owner && owner.closest && owner.closest(`.${this.fig.family}__day`);
    this._toggleDayPopover(cmd, () => require("./skeleton/day-popover")(this, key), cell || owner);
  }

  /**
   * Open `build()` in the floating slot for the clicked control, or close it
   * if that control owns it. `over`, when given, is the element the popover
   * covers (see _placeDayMenu); otherwise it hangs under the control.
   */
  _toggleDayPopover(cmd, build, over) {
    const key = cmd && cmd.mget && cmd.mget("calDay");
    const anchor = cmd && cmd.el;
    const same = this._dayMenu && this._dayMenu.anchor === anchor;
    this._closeDayMenu();
    if (same || !key || !anchor) return;

    // One dropdown at a time.
    if (this._openMenu) {
      this._closeMenus();
      this._renderToolbar();
    }

    const slot = _.isFunction(this.getPart) ? this.getPart("cal-day-menu") : null;
    if (!slot || (slot.isDestroyed && slot.isDestroyed()) || !slot.el) return;
    this._dayMenu = { key, anchor, slot, over: over || null };
    anchor.dataset.open = "1";
    slot.el.dataset.open = "1";
    if (over) slot.el.dataset.over = "1";
    slot.feed(build());
    this._placeDayMenu();
    // The rows are laid out after the feed: clamp once they have a size.
    requestAnimationFrame(() => this._placeDayMenu());
    this._bindDayMenuDismiss();
  }

  /**
   * Under the "+", 4px below it and starting at its left edge; above it when
   * the viewport has no room below; never past the viewport's edges.
   *
   * Over a cell ("+N more"): centred on it, its top 8px above the cell's, a
   * little wider than the cell (at least the skin's min-width), then pushed
   * back inside the viewport.
   */
  _placeDayMenu() {
    const m = this._dayMenu;
    // Over a cell, the cell is what counts: a delete re-feeds its body, and
    // the "+N more" that opened the popover may be gone with it.
    if (!m || !m.slot.el || !(m.over || m.anchor).isConnected) return;
    const GAP = 4;
    const EDGE = 8;
    const el = m.slot.el;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (m.over && m.over.isConnected) {
      const c = m.over.getBoundingClientRect();
      el.style.width = `${Math.min(c.width + 2 * EDGE, vw - 2 * EDGE)}px`;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const left = c.left + (c.width - w) / 2;
      el.style.left = `${Math.max(EDGE, Math.min(left, vw - w - EDGE))}px`;
      el.style.top = `${Math.max(EDGE, Math.min(c.top - EDGE, vh - h - EDGE))}px`;
      return;
    }
    const a = m.anchor.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const below = a.bottom + GAP;
    const top = below + h <= vh - EDGE || a.top - GAP - h < EDGE ? below : a.top - GAP - h;
    el.style.top = `${Math.max(EDGE, top)}px`;
    el.style.left = `${Math.max(EDGE, Math.min(a.left, vw - w - EDGE))}px`;
  }

  _closeDayMenu() {
    const m = this._dayMenu;
    this._dayMenu = null;
    this._unbindDayMenuDismiss();
    if (!m) return;
    if (m.anchor) delete m.anchor.dataset.open;
    if (m.slot && !(m.slot.isDestroyed && m.slot.isDestroyed()) && m.slot.el) {
      delete m.slot.el.dataset.open;
      delete m.slot.el.dataset.over;
      m.slot.el.style.width = "";
      m.slot.feed([]);
    }
  }

  _bindDayMenuDismiss() {
    if (this._dayMenuDismiss) return;
    const close = () => this._closeDayMenu();
    // Capture phase, like the toolbar's: a click outside closes the menu
    // before it reaches what it was aimed at. A click on the menu itself is
    // left to its row's service, and one on the "+" that owns it to
    // _toggleDayMenu, which closes it — closing here first would make that
    // toggle open it again.
    const onClick = (ev) => {
      const m = this._dayMenu;
      const t = ev && ev.target;
      if (!m || !t || !t.closest) return;
      if (m.slot.el && m.slot.el.contains(t)) return;
      if (m.anchor.contains(t)) return;
      close();
    };
    const onKey = (ev) => {
      if (ev.key === "Escape") close();
    };
    // Except a scroll inside the popover itself: the "+N more" list scrolls.
    const onScroll = (ev) => {
      const m = this._dayMenu;
      const t = ev && ev.target;
      if (m && m.slot.el && t && t.nodeType === 1 && m.slot.el.contains(t)) return;
      close();
    };
    this._dayMenuDismiss = { onClick, onKey, onScroll, close };
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
    // Capture, so a scroll anywhere — the grid, a week column — counts.
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
  }

  _unbindDayMenuDismiss() {
    const d = this._dayMenuDismiss;
    if (!d) return;
    this._dayMenuDismiss = null;
    document.removeEventListener("click", d.onClick, true);
    document.removeEventListener("keydown", d.onKey, true);
    document.removeEventListener("scroll", d.onScroll, true);
    window.removeEventListener("resize", d.close);
  }

  // ── forms ──────────────────────────────────────────────────────────────────

  _openTaskForm(row) {
    this._closeMenus();
    // Both dates in YYYY-MM-DD from the start: every task.update writes both
    // columns, so the draft must always hold the row's own Start and End.
    if (row) {
      this._form = {
        kind: "task",
        mode: "edit",
        row,
        draft: {
          id: row.id,
          title: row.title || "",
          description: row.description || "",
          due_date: dateOf(row.due_date),
          start_date: dateOf(row.start_date),
          status: row.status || "todo",
          priority: row.priority || "medium",
          files: [],
          subtasks: [],
        },
      };
    } else {
      this._form = {
        kind: "task",
        mode: "create",
        draft: {
          title: "",
          description: "",
          // Opened on a day (a cell's "+" menu or the board's column):
          // Start and End both on it. End alone left Start blank.
          due_date: this._pendingDay || "",
          start_date: this._pendingDay || "",
          status: "todo",
          priority: "medium",
          files: [],
          subtasks: [],
        },
      };
    }
    this._form.doneKeys = [];
    this._form.subMenu = null;
    this._form.search = { seq: 0, timer: null, blurTimer: null, rows: [] };
    this._pendingDay = null;
    this._renderModal();
    this._loadDoneColumns(this._form);
    if (row) {
      this._loadLinkedFiles(this._form);
      this._loadSubtasks(this._form);
    }
  }

  /**
   * The meeting form: a new personal meeting, or — given a personal meeting's
   * calendar row — that meeting, prefilled, to update or delete.
   */
  _openMeetingForm(row) {
    this._closeMenus();
    if (row) return this._openMeetingEdit(row);
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

  _openMeetingEdit(row) {
    const start = fromEpoch(row.stime) || Dayjs();
    const end = fromEpoch(row.etime) || start.add(30, "minute");
    // The form's 12-hour clock parts, the inverse of _epochFor.
    const clock = (d) => ({
      hour: d.hour() % 12 || 12,
      minute: String(d.minute()).padStart(2, "0"),
      meridiem: d.hour() < 12 ? "AM" : "PM",
    });
    this._form = {
      kind: "meeting",
      mode: "edit",
      row,
      draft: {
        title: row.title || "",
        date: ymd(start),
        start: clock(start),
        end: clock(end),
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
    const form = this._form;
    if (form && form.search) {
      clearTimeout(form.search.timer);
      clearTimeout(form.search.blurTimer);
    }
    this._form = null;
    // Re-feeding the modal below destroys the embedded board panel, and its
    // document listeners with it (tasks onBeforeDestroy).
    this._quickPanel = null;
    if (this._subMenuDismiss) {
      document.removeEventListener("click", this._subMenuDismiss, true);
      this._subMenuDismiss = null;
    }
    // The modal goes first — the reload waits on the network.
    this._renderModal();
    // Closing alone never touches the page under the modal. It reloads only
    // when something changed: a push that landed while the modal was open was
    // held back (_scheduleReload), or the form itself wrote — the task modal
    // saves subtasks and files before Update/Create is pressed (`form.wrote`,
    // see _markFormWrote). None of our own writes come back as a push (the
    // server skips the sending socket), so those need the reload.
    if (this._dirty || (form && form.wrote)) return this._reload();
  }

  /** The open form has written to the server: its close must reload. */
  _markFormWrote(form = this._form) {
    if (form) form.wrote = true;
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
    // A toast still up must clear the card that just opened, and go back to
    // its corner once the card is gone (_placeToast).
    const toast = this._toast ? this.getPart("cal-toast") : null;
    if (toast && toast.el) this._placeToast(toast.el);
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

  /**
   * Invite block: each toggle row's checkbox and the sub-block its flag
   * reveals. Only the password row is drawn today (skeleton/meeting-form.js
   * header); the restrict switch it also repaints comes back with the email
   * rows.
   */
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
   * form, not this method, decides what is required (the title in both
   * forms, and the End date in the task form). Blank or whitespace-only fails.
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
  // Figma 1693:201972: a 512px white card at the calendar's bottom-right with
  // a glyph, one line and a ×, for 3.5s. The glyph follows the kind — a
  // check-circle for success, the warning glyph for an error (the task form's
  // failures use this same toast), never a check on an error.

  _showToast(message, kind = "success") {
    this._toast = { message, kind };
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this._closeToast(), 3500);
    this._renderToast();
  }

  _renderToast() {
    if (this.isDestroyed && this.isDestroyed()) return;
    const part = _.isFunction(this.getPart) ? this.getPart("cal-toast") : null;
    if (!part || !part.el) return;
    if (!this._toast) return part.feed([]);
    const pfx = this.fig.family;
    const { message, kind } = this._toast;
    const ico = kind === "error" ? "apps-warning" : "noti-check-circle";
    part.feed(
      Skeletons.Box.X({
        className: `${pfx}__toast ${pfx}__toast--${kind}`,
        kids: [
          Skeletons.Image.Svg({ ico, className: `${pfx}__toast-ico` }),
          Skeletons.Note({ className: `${pfx}__toast-text`, content: message }),
          Skeletons.Button.Svg({
            className: `${pfx}__toast-close`,
            ico: "cross",
            bubble: 0,
            service: "cal-toast-close",
            uiHandler: [this],
            // Focusable and announced; Enter / Space press it (_installFormKeys).
            attrOpt: { "aria-label": LOCALE.CLOSE, role: "button", tabindex: "0" },
          }),
        ],
      }),
    );
    this._placeToast(part.el);
  }

  _closeToast() {
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = null;
    this._toast = null;
    this._renderToast();
  }

  /**
   * Bottom-right corner of this screen: 24px in from its right edge and 37px
   * up from its bottom, where frame 1693:201564 hangs the card. Set, measured
   * and corrected by the difference, because this slot lives inside the
   * desk's animated main slot and its `fixed` offsets are not viewport
   * pixels — the reasoning settings_main _placeToast documents.
   *
   * Unless that corner lands on the open modal card. The task card fills 88vh
   * with its actions at the bottom right, and its failure toasts fire while
   * it stays open for a retry — there the toast covered Cancel and Create.
   * It then hangs INSET_TOP under the top of the window instead, which a
   * full-height card leaves to its top padding.
   */
  _placeToast(slot) {
    const INSET_RIGHT = 24;
    const INSET_BOTTOM = 37;
    const INSET_TOP = 8;
    slot.style.top = "";
    slot.style.bottom = "";
    slot.style.right = "";
    const page = this.el && this.el.getBoundingClientRect();
    if (!page || !page.width || !page.height) return;
    const want = { bottom: page.bottom - INSET_BOTTOM, right: page.right - INSET_RIGHT };
    const style = getComputedStyle(slot);
    let got = slot.getBoundingClientRect();
    const sx = slot.offsetWidth ? got.width / slot.offsetWidth : 1;
    const sy = slot.offsetHeight ? got.height / slot.offsetHeight : 1;
    const bottom = (parseFloat(style.bottom) || 0) + (got.bottom - want.bottom) / (sy || 1);
    const right = (parseFloat(style.right) || 0) + (got.right - want.right) / (sx || 1);
    slot.style.bottom = `${bottom}px`;
    slot.style.right = `${right}px`;

    const card = this._form ? this._modalEl() : null;
    const c = card && card.getBoundingClientRect();
    got = slot.getBoundingClientRect();
    if (!c || got.bottom <= c.top || got.top >= c.bottom || got.right <= c.left || got.left >= c.right) return;
    slot.style.bottom = "auto";
    slot.style.top = "0px";
    got = slot.getBoundingClientRect();
    slot.style.top = `${(INSET_TOP - got.top) / (sy || 1)}px`;
  }

  /** Re-feed the recipient chip row alone. */
  _renderRecipients() {
    const list = (this._form && this._form.draft.recipients) || [];
    const part = _.isFunction(this.getPart) ? this.getPart("form-recipient-chips") : null;
    if (!part || !part.el) return;
    part.feed(recipientChips(this, list, this._form && this._form.recipientsExpanded));
    part.el.setAttribute("data-count", String(list.length));
  }

  // ── attachments ────────────────────────────────────────────────────────────
  //
  // Files upload the moment they are added (upload-progress window, the route
  // the Task tab takes) into the personal hub's hidden task folder; the commit
  // only links the nids (_linkTaskFiles). Every callback
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
    // The task modal draws paperclip chips; the meeting modal its file rows.
    const chips = this._form && this._form.kind === "task" ? taskFileChips : fileChips;
    part.feed(chips(this, list));
    part.el.setAttribute("data-count", String(list.length));
    const zone = part.el.closest && part.el.closest(`.${this.fig.family}__files`);
    if (zone) zone.setAttribute("data-has-files", list.length ? "1" : "0");
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
        // The chips show each file's state; the card stays a bar under the
        // modal (skin) instead of covering it.
        collapsed: true,
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
      form.wrote = true;
      const res = await this.postService({
        service: (SERVICE.task && SERVICE.task.unlink_file) || "task.unlink_file",
        hub_id: row.hub_id || this._personalHub,
        task_id: row.id,
        file_nid: pf.nid,
      });
      // unlink_file answers an object ({task_id, file_nid, ...}); postService
      // never rejects, so a refusal is {error} and a transport failure undefined.
      if (!res || res.error || String(res.file_nid) !== String(pf.nid)) {
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
    // The task modal's Search file field: its results open on focus and close
    // on blur, deferred so a click on a result lands first.
    const isSearch = (t) => !!(t && t.matches && t.matches('[name="cal-file-search"]'));
    const focusIn = (e) => {
      if (isSearch(e.target)) this._searchFiles(e.target.value || "");
    };
    const focusOut = (e) => {
      const form = this._form;
      if (!form || !form.search || !isSearch(e.target)) return;
      clearTimeout(form.search.blurTimer);
      form.search.blurTimer = setTimeout(() => {
        if (this._form !== form || isSearch(document.activeElement)) return;
        form.search.seq++;
        this._feedFileResults([]);
      }, 200);
    };
    this._dropHandlers = [
      ["dragover", over],
      ["dragleave", leave],
      ["drop", drop],
      ["focusin", focusIn],
      ["focusout", focusOut],
    ];
    for (const [type, fn] of this._dropHandlers) this.el.addEventListener(type, fn);
    this._pasteHandler = (e) => this._onPasteFiles(e);
    document.addEventListener("paste", this._pasteHandler);
  }

  /**
   * The meeting form's time boxes take digits only: hour 1-12, minute 00-59.
   * Delegated on this.el like _installFileDrop, so it survives every modal
   * re-feed.
   *
   * On `input`, a value that is not on its way to a legal one (13, 60, a
   * letter) is refused and the box goes back to what it held before the key
   * press. Partial values ("0", "1") are let through because they are
   * keystrokes away from "09" or "12". On `change` (blur), an hour left at
   * "0" or "00" can never become legal, so it goes back to the last complete
   * hour the box held.
   */
  _installTimeFilter() {
    if (!this.el || this._timeFilter) return;
    const pfx = this.fig.family;
    const RULES = {
      hour: { partial: /^(0|1|0[1-9]|1[0-2]|[2-9])?$/, done: (n) => n >= 1 && n <= 12 },
      minute: { partial: /^([0-5][0-9]?|[6-9])?$/, done: (n) => n >= 0 && n <= 59 },
    };
    this._timeFilter = (e) => {
      const t = e.target;
      if (!t || t.tagName !== "INPUT" || !t.closest(`.${pfx}__time-input`)) return;
      const part = /_(hour|minute)$/.exec(t.name || "");
      const rule = part && RULES[part[1]];
      if (!rule) return;
      const isDone = (v) => v !== "" && rule.done(parseInt(v, 10));
      if (t.__calLast == null) t.__calLast = rule.partial.test(t.defaultValue) ? t.defaultValue : "";
      if (t.__calGood == null) t.__calGood = isDone(t.defaultValue) ? t.defaultValue : "";

      if (e.type === "input") {
        const digits = String(t.value || "").replace(/\D/g, "").slice(0, 2);
        if (!rule.partial.test(digits)) {
          t.value = t.__calLast;
          return;
        }
        if (t.value !== digits) t.value = digits;
        t.__calLast = digits;
        if (isDone(digits)) t.__calGood = digits;
        return;
      }

      if (t.value !== "" && !isDone(t.value)) {
        t.value = t.__calGood;
        t.__calLast = t.__calGood;
      }
    };
    this.el.addEventListener("input", this._timeFilter);
    this.el.addEventListener("change", this._timeFilter);
  }

  /**
   * Keyboard for this screen's forms and the toast.
   *
   * - Enter / Space on one of this screen's role="button" icons (the modal and
   *   toast ×, the link's copy, the password eye, the task card's × buttons)
   *   presses it: they are Button.Svg divs, with no keyboard behaviour of
   *   their own.
   * - Escape, one rule for every form kind (task, meeting, invite link,
   *   quick-open card):
   *   1. an open date picker, then the task card's subtask menu, takes it;
   *   2. typed into a field or ending an IME composition, it belongs to that
   *      field (the Entry's cancel, the quick card's menus and mention
   *      popups) — nothing closes and the draft stays;
   *   3. otherwise the form closes through its own cancel path: Cancel / × for
   *      the task, meeting and invite-link cards, the board's onEscape for the
   *      quick card (a subtask walks back to its parent), a plain close while
   *      that card is still loading.
   *   A press handled in 1 or 3 is claimed (preventDefault + stopPropagation),
   *   so it never reaches the desk's own Escape, which would close the window
   *   under the calendar. In 2 it is left to the field, which needs it; the
   *   desk skips text entry on its own.
   *
   *   On the document and in the capture phase, so focus anywhere counts and
   *   the checks run before flatpickr's own handler has closed the picker.
   */
  _installFormKeys() {
    if (this._formKeys) return;
    this._formKeys = (e) => {
      if (this.isDestroyed && this.isDestroyed()) return;
      const t = e.target;
      if (e.key === "Enter" || e.key === " ") {
        if (t && t.getAttribute && t.getAttribute("role") === "button" && this.el && this.el.contains(t)) {
          e.preventDefault();
          t.click();
        }
        return;
      }
      const form = this._form;
      if (e.key !== "Escape" || !form) return;
      const claim = () => {
        e.preventDefault();
        e.stopPropagation();
      };
      const root = this._modalEl();
      const picker = Array.from((root && root.querySelectorAll("input")) || [])
        .map((input) => input._flatpickr)
        .find((fp) => fp && fp.isOpen);
      if (picker) {
        claim();
        picker.close();
        return;
      }
      if (form.kind === "task" && form.subMenu) {
        claim();
        form.subMenu = null;
        this._syncSubtaskMenuDismiss();
        this._renderSubtasks();
        return;
      }
      if (hotkeys.isComposing(e) || hotkeys.inTextEntry(e.target)) return;
      claim();
      if (form.kind === "task-quick-open") {
        const panel = this._quickPanel;
        // Still loading: there is no card, and no draft, to discard yet.
        if (!panel || panel.isQuickLoading()) return this._closeForm();
        panel.onEscape();
        return;
      }
      this._closeForm();
    };
    document.addEventListener("keydown", this._formKeys, true);
  }

  _onDrop(e) {
    if (!this._form || !A.isFileDrag(e)) return;
    // The quick-open card's drops are the board panel's: it claims those on its
    // own zones and files them under that hub. One it left unclaimed stops
    // here, so the desk does not upload it to the active window or home.
    if (this._form.kind === "task-quick-open") {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
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
    // The task form only: the meeting form takes no attachments.
    if (!this._form || this._form.kind !== "task") return;
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

  /** task.link_file per nid. postService never rejects: success = an array. Returns the nids that did not link. */
  async _linkTaskFiles(hub_id, task_id, nids) {
    const svc = (SERVICE.task && SERVICE.task.link_file) || "task.link_file";
    const failed = [];
    for (const file_nid of nids || []) {
      this._markFormWrote();
      const res = await this.postService({ service: svc, hub_id, task_id, file_nid });
      if (!Array.isArray(res)) failed.push(file_nid);
    }
    return failed;
  }

  /** Edit mode: the task's current files, as removable chips. */
  async _loadLinkedFiles(form) {
    const row = form.row || {};
    const rows = await this.fetchService({
      service: (SERVICE.task && SERVICE.task.get_linked_files) || "task.get_linked_files",
      hub_id: row.hub_id || this._personalHub,
      task_id: row.id,
      // A GET is served from the HTTP cache; a reopen right after a link or an
      // unlink must not get the old list back.
      _ts: Date.now(),
    });
    if (this._form !== form || !Array.isArray(rows)) return;
    const linked = rows.map((f) => ({
      nid: f.file_nid,
      linked: 1,
      status: "linked",
      filename: f.filename || "",
      extension: f.extension || f.ext || "",
      category: f.category || "",
    }));
    form.draft.files = [...linked, ...(form.draft.files || []).filter((f) => !f.linked)];
    this._renderFiles();
  }

  // ── file search (task modal) ───────────────────────────────────────────────
  //
  // Search file: each keystroke (and focus) asks task.search_files for its
  // first page on the personal hub — no task_id, so any file the user can read
  // there, best matches first; the Meet tab modal's search. A picked file is
  // linked with the uploads, on Create / Update.

  _searchFiles(query) {
    const form = this._form;
    if (!form || form.kind !== "task" || !form.search) return;
    const s = form.search;
    const seq = ++s.seq;
    clearTimeout(s.timer);
    clearTimeout(s.blurTimer);
    s.timer = setTimeout(async () => {
      let rows;
      try {
        rows = await this.fetchService({
          service: (SERVICE.task && SERVICE.task.search_files) || "task.search_files",
          hub_id: this._personalHub,
          pattern: String(query || "").trim(),
          page: 1,
        });
      } catch (e) {
        rows = [];
      }
      if (this._form !== form || s.seq !== seq) return;
      // One row comes back as an object, not a one-element array.
      const list = Array.isArray(rows) ? rows : rows && rows.nid ? [rows] : [];
      const taken = new Set((form.draft.files || []).map((pf) => String(pf.nid || "")));
      this._feedFileResults(
        list.filter((r) => r && r.nid && !taken.has(String(r.nid)) && !NOT_ATTACHABLE.includes(r.category)),
      );
    }, 200);
  }

  _feedFileResults(rows) {
    const form = this._form;
    const part = _.isFunction(this.getPart) ? this.getPart("form-files-results") : null;
    if (!form || !form.search || !part || !part.el) return;
    form.search.rows = rows || [];
    part.feed(fileResults(this, form.search.rows));
    // A press on a row must not blur the search field first, or the focusout
    // teardown closes the list mid-click and the pick is lost.
    require("libs/pick-guard").keepListThroughClick(part.el, `.${this.fig.family}__fsearch-option`);
    part.el.setAttribute("data-open", form.search.rows.length ? "1" : "0");
  }

  _pickSearchedFile(nid) {
    const form = this._form;
    if (!form || !form.search || !nid) return;
    const row = form.search.rows.find((r) => String(r.nid) === String(nid));
    const files = form.draft.files || (form.draft.files = []);
    if (row && !files.some((pf) => String(pf.nid) === String(nid))) {
      if (files.length >= A.MAX_FILES) {
        if (typeof Butler !== "undefined") Butler.say(LOCALE.CAL_FILES_LIMIT);
      } else {
        files.push({
          localKey: `pick:${nid}`,
          nid: String(nid),
          filename: row.filename || "",
          extension: row.ext || row.extension || "",
          category: row.category || "",
          status: "queued",
        });
      }
    }
    form.search.seq++;
    const root = this._modalEl();
    const input = root && root.querySelector('[name="cal-file-search"]');
    if (input) input.value = "";
    this._feedFileResults([]);
    this._renderFiles();
  }

  // ── subtasks (task modal) ──────────────────────────────────────────────────
  //
  // Create mode keeps them in the draft until Create. Edit mode saves each
  // change at once — a new row on Enter, ✕, a Status or Priority pick — each
  // row with its own in-flight flag, so Cancel only drops the task's own
  // fields. Every task.update here sends the row's own due_date and
  // start_date: the service writes both whatever else it is given.

  /**
   * The personal hub's done columns, for the progress bar. task.column_list
   * also seeds the hub's four built-in columns the first time it is called;
   * until then no status counts as done to the server, so neither the
   * progress (subtask_done) nor the parent's auto-complete can fire. The board
   * calls it on open; this modal is the calendar's equivalent.
   */
  async _loadDoneColumns(form) {
    const rows = await this.fetchService({
      service: (SERVICE.task && SERVICE.task.column_list) || "task.column_list",
      hub_id: this._personalHub,
      nid: this._personalNid,
      _ts: Date.now(),
    });
    if (this._form !== form) return;
    // fetchService never rejects: a failure is {error} or nothing. Said in the
    // block, not left to read as "0% done".
    if (!Array.isArray(rows)) {
      form.subtaskLoadError = true;
      return this._renderSubtasks();
    }
    form.doneKeys = rows.filter((c) => c && Number(c.is_done) === 1).map((c) => String(c.id));
    this._renderSubtasks();
  }

  /** Edit mode: the task's subtasks (calendar.list leaves subtasks out). */
  async _loadSubtasks(form) {
    const row = form.row || {};
    const rows = await this.fetchService({
      service: (SERVICE.task && SERVICE.task.list) || "task.list",
      hub_id: row.hub_id || this._personalHub,
      workspace: 1,
      _ts: Date.now(),
    });
    if (this._form !== form) return;
    // A failed read must not look like a task with no subtasks.
    if (!Array.isArray(rows)) {
      form.subtaskLoadError = true;
      return this._renderSubtasks();
    }
    const loaded = rows
      .filter((t) => t && t.id && String(t.parent_task_id || "") === String(row.id))
      .map((t) => ({
        localKey: `id:${t.id}`,
        id: t.id,
        title: t.title || "",
        status: t.status || "todo",
        priority: t.priority || "medium",
        due_date: dateOf(t.due_date),
        start_date: dateOf(t.start_date),
      }));
    this._absorbSubtaskTitles();
    const ids = new Set(loaded.map((s) => String(s.id)));
    form.draft.subtasks = [
      ...loaded,
      ...(form.draft.subtasks || []).filter((s) => !s.id || !ids.has(String(s.id))),
    ];
    this._renderSubtasks();
  }

  /** Names typed into rows not saved yet → the draft. Runs before every re-feed of the rows. */
  _absorbSubtaskTitles() {
    const form = this._form;
    const root = this._modalEl();
    if (!form || !root) return;
    root.querySelectorAll('input[name^="subtask:"]').forEach((input) => {
      const key = input.getAttribute("name").slice("subtask:".length);
      const s = (form.draft.subtasks || []).find((x) => x.localKey === key);
      if (s && !s.id) s.title = String(input.value || "");
    });
  }

  /** Re-feed the progress bar and the rows alone (part "form-subtasks"). */
  _renderSubtasks() {
    const part = _.isFunction(this.getPart) ? this.getPart("form-subtasks") : null;
    if (!this._form || !part || !part.el) return;
    this._absorbSubtaskTitles();
    part.feed(subtaskBody(this));
  }

  _focusSubtask(key) {
    setTimeout(() => {
      const root = this._modalEl();
      const input = root && root.querySelector(`input[name="subtask:${key}"]`);
      if (input) input.focus();
    }, 0);
  }

  _addSubtask() {
    const form = this._form;
    if (!form) return;
    this._absorbSubtaskTitles();
    const subs = form.draft.subtasks || (form.draft.subtasks = []);
    // One blank row at a time: a second + goes to the row already waiting.
    let s = subs.find((x) => !x.id && !String(x.title || "").trim());
    if (!s) {
      s = {
        localKey: `new:${Date.now()}:${subs.length}`,
        title: "",
        status: "todo",
        priority: "medium",
        due_date: "",
        start_date: "",
      };
      subs.push(s);
      form.subMenu = null;
      this._syncSubtaskMenuDismiss();
      this._renderSubtasks();
    }
    this._focusSubtask(s.localKey);
  }

  /**
   * task.create for one row under the form's task. True when the row exists
   * on the server afterwards (a blank row is no task, and is let through).
   * A create already on its way — Enter, then Update before it answered — is
   * waited for, never posted twice and never counted as a failure.
   */
  _createSubtask(form, s) {
    if (s.id) return Promise.resolve(true);
    if (s.pending) return s.pending;
    const title = String(s.title || "").trim();
    if (!title) return Promise.resolve(true);
    s.busy = true;
    form.wrote = true;
    s.pending = this.postService({
      service: (SERVICE.task && SERVICE.task.create) || "task.create",
      hub_id: (form.row && form.row.hub_id) || this._personalHub,
      parent_task_id: form.draft.id,
      title,
      status: s.status || "todo",
      priority: s.priority || "medium",
    }).then((res) => {
      const created = rowOf(res);
      s.busy = false;
      s.pending = null;
      if (!created) {
        s.error = true;
        return false;
      }
      s.id = created.id;
      s.title = created.title || title;
      s.error = false;
      return true;
    });
    return s.pending;
  }

  /** Every row not on the server yet. Returns how many failed. */
  async _saveNewSubtasks(form) {
    this._absorbSubtaskTitles();
    let failed = 0;
    for (const s of form.draft.subtasks || []) {
      if (!(await this._createSubtask(form, s))) failed++;
    }
    return failed;
  }

  /** Enter on a new row's name: saved at once in edit mode, kept for Create otherwise. */
  async _commitSubtask(key) {
    const form = this._form;
    if (!form) return;
    this._absorbSubtaskTitles();
    const s = (form.draft.subtasks || []).find((x) => x.localKey === key);
    if (!s || s.id || form.mode !== "edit" || !String(s.title || "").trim()) return;
    const ok = await this._createSubtask(form, s);
    if (this._form !== form) return;
    this._renderSubtasks();
    if (!ok) this._showToast(LOCALE.CAL_SUBTASKS_NOT_SAVED, "error");
  }

  async _removeSubtask(key) {
    const form = this._form;
    const s = form && (form.draft.subtasks || []).find((x) => x.localKey === key);
    if (!s || s.busy) return;
    if (s.id) {
      s.busy = true;
      form.wrote = true;
      const res = await this.postService({
        service: (SERVICE.task && SERVICE.task.delete) || "task.delete",
        hub_id: (form.row && form.row.hub_id) || this._personalHub,
        id: s.id,
      });
      s.busy = false;
      // postService never rejects: a refusal is {error}, a lost request undefined.
      if (!res || res.error) {
        Wm.alert(LOCALE.ERROR_NETWORK);
        return;
      }
    }
    form.draft.subtasks = (form.draft.subtasks || []).filter((x) => x !== s);
    if (form.subMenu && form.subMenu.key === key) form.subMenu = null;
    this._syncSubtaskMenuDismiss();
    if (this._form === form) this._renderSubtasks();
  }

  _toggleSubtaskMenu(key, kind) {
    const form = this._form;
    if (!form) return;
    const m = form.subMenu;
    form.subMenu = m && m.key === key && m.kind === kind ? null : { key, kind };
    this._syncSubtaskMenuDismiss();
    this._renderSubtasks();
  }

  async _setSubtaskValue(key, kind, value) {
    const form = this._form;
    if (!form) return;
    form.subMenu = null;
    this._syncSubtaskMenuDismiss();
    const s = (form.draft.subtasks || []).find((x) => x.localKey === key);
    const field = kind === "status" ? "status" : "priority";
    if (!s || !value || s[field] === value || s.busy) return this._renderSubtasks();
    const before = s[field];
    s[field] = value;
    this._renderSubtasks();
    if (!s.id) return;
    s.busy = true;
    const hub_id = (form.row && form.row.hub_id) || this._personalHub;
    form.wrote = true;
    const res = await this.postService(
      field === "status"
        ? {
            service: (SERVICE.task && SERVICE.task.update_status) || "task.update_status",
            hub_id,
            id: s.id,
            status: value,
          }
        : {
            service: (SERVICE.task && SERVICE.task.update) || "task.update",
            hub_id,
            id: s.id,
            priority: value,
            due_date: s.due_date || null,
            start_date: s.start_date || null,
          },
    );
    s.busy = false;
    if (!rowOf(res)) {
      s[field] = before;
      Wm.alert(LOCALE.ERROR_NETWORK);
    } else if (field === "status" && res && res.parent && res.parent.status) {
      this._syncParentStatus(res.parent.status);
    }
    if (this._form === form) this._renderSubtasks();
  }

  /**
   * The server completed the task with its last subtask (task.update_status
   * answers with `parent`). Our own socket gets no push for it, so the modal's
   * Status follows here — and Update, which compares against it, does not
   * move the task back.
   */
  _syncParentStatus(status) {
    const form = this._form;
    if (!form) return;
    // A Status the user had picked but not saved yet gives way to the server's;
    // they are told rather than seeing their pick change under them.
    const saved = (form.row && form.row.status) || "todo";
    const overridden = form.draft.status !== saved && form.draft.status !== status;
    if (form.row) form.row = { ...form.row, status };
    form.draft.status = status;
    const pfx = this.fig.family;
    const root = this._modalEl();
    const pills = root && root.querySelector(`.${pfx}__pills--status`);
    if (pills) {
      pills.querySelectorAll(`.${pfx}__pill`).forEach((el) => {
        el.setAttribute("data-active", el.getAttribute("data-key") === status ? "1" : "0");
      });
    }
    if (overridden) this._showToast(LOCALE.CAL_TASK_COMPLETED_BY_SUBTASKS, "success");
  }

  // A click outside the Subtasks block closes an open row menu. The guard is
  // the whole block for the toolbar's reason (_bindMenuDismiss): this runs in
  // the capture phase, and closing re-feeds the rows before the click lands.
  _syncSubtaskMenuDismiss() {
    const open = !!(this._form && this._form.subMenu);
    if (!open) {
      if (this._subMenuDismiss) document.removeEventListener("click", this._subMenuDismiss, true);
      this._subMenuDismiss = null;
      return;
    }
    if (this._subMenuDismiss) return;
    const guard = `.${this.fig.family}__subtasks`;
    this._subMenuDismiss = (ev) => {
      const t = ev && ev.target;
      if (t && t.closest && t.closest(guard)) return;
      const live = this._form && this._form.subMenu && !(this.isDestroyed && this.isDestroyed());
      if (this._form) this._form.subMenu = null;
      this._syncSubtaskMenuDismiss();
      if (live) this._renderSubtasks();
    };
    document.addEventListener("click", this._subMenuDismiss, true);
  }

  /**
   * After a Start or End pick: the other picker is re-bounded to the new pair
   * (Start never after End), and a filled End date drops its error — its
   * input is read-only, so no `input` event will (_bindFieldErrorClear).
   */
  _syncDateRange(changed) {
    const root = this._modalEl();
    const d = this._form && this._form.draft;
    if (!root || !d) return;
    if (changed === "due_date" && d.due_date) {
      const f = root.querySelector('[data-field="due_date"]');
      if (f) f.setAttribute("data-error", "0");
    }
    const other = changed === "start_date" ? "due_date" : "start_date";
    const input = root.querySelector(`input[name="${other}"]`);
    const fp = input && input._flatpickr;
    if (fp) fp.set("disable", rangeDisable(other, d.start_date, d.due_date));
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
    // leaving the meridiem the toggle already set. The boxes only accept
    // 1-12 for the hour (_installTimeFilter), so there is no 24h hour to fold.
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
    // Names typed into new subtask rows (inputs named subtask:<key>).
    this._absorbSubtaskTitles();
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
    let hub_id = this._personalHub;
    let task_id = null;
    // From here the form may stay open on a task that is already written (a
    // subtask or a file failed after it): its close must reload.
    form.wrote = true;

    if (!editing) {
      // Personal task: personal-hub scope, and no assignee_uids at all — a
      // personal task has nobody else to give it to. Sending an empty array
      // would still be sending the field.
      const created = rowOf(await this.postService({
        service: svcCreate,
        hub_id: this._personalHub,
        nid: this._personalNid,
        title,
        description: draft.description || null,
        status: draft.status || "todo",
        priority: draft.priority || "medium",
        due_date: draft.due_date || null,
        start_date: draft.start_date || null,
      }));
      if (!created) {
        Wm.alert(LOCALE.ERROR_NETWORK);
        return;
      }
      // The task exists from here on, so the form becomes its edit form before
      // anything else can fail: pressed again after a subtask did not save,
      // Create updates this task instead of making a second one.
      draft.id = created.id;
      form.mode = "edit";
      form.row = { ...created, hub_id: this._personalHub, status: created.status || draft.status || "todo" };
      task_id = created.id;
    } else {
      const row = form.row || {};
      // Addressed with the ROW's hub — never the personal hub. This is the
      // line that keeps ACL and audit consistent with the folder view.
      hub_id = row.hub_id || this._personalHub;
      task_id = row.id;
      // task.update writes due_date AND start_date whatever else it is given:
      // a key left out is stored as NULL, and a task with no due date drops
      // off the calendar. Both always go, in YYYY-MM-DD (see dateOf).
      const updated = rowOf(await this.postService({
        service: svcUpdate,
        hub_id,
        id: row.id,
        title,
        description: draft.description || null,
        priority: draft.priority || "medium",
        due_date: draft.due_date || null,
        start_date: draft.start_date || null,
      }));
      if (!updated) {
        Wm.alert(LOCALE.ERROR_NETWORK);
        return;
      }
      if ((draft.status || "todo") !== (row.status || "todo")) {
        await this.postService({
          service: svcStatus,
          hub_id,
          id: row.id,
          status: draft.status || "todo",
        });
        form.row = { ...row, status: draft.status || "todo" };
      }
    }

    const nids = A.nidsToLink(draft.files);
    const linkFailed = await this._linkTaskFiles(hub_id, task_id, nids);
    // What did link is on the task now: a second pass must not link it again.
    for (const pf of draft.files || []) {
      if (pf.nid && nids.includes(pf.nid) && !linkFailed.includes(pf.nid)) {
        pf.linked = 1;
        pf.status = "linked";
      }
    }

    // A subtask that did not save keeps the modal open on it. The task and
    // the rows that did save stay saved; Create — an update by now — retries
    // the rest.
    if ((draft.subtasks || []).length && (await this._saveNewSubtasks(form))) {
      if (this._form === form) {
        this._renderFiles();
        this._renderSubtasks();
      }
      this._showToast(LOCALE.CAL_SUBTASKS_NOT_SAVED, "error");
      return;
    }

    // The task exists either way; a file that would not link is said out loud
    // rather than closing the modal on it silently.
    if (linkFailed.length) this._showToast(LOCALE.CAL_FILES_NOT_ATTACHED, "error");

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
    // "Restrict access" with nobody on the list would be an open link that
    // looks restricted: refused until an address or domain is added.
    if (
      this._form.mode !== "edit" &&
      draft.require_email &&
      draft.restrict &&
      !(draft.recipients || []).length
    ) {
      if (typeof Butler !== "undefined") Butler.say(LOCALE.SECURE_SHARE_EMAIL_REQUIRED);
      return;
    }
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

    if (this._form && this._form.mode === "edit") {
      return this._updateMeeting(this._form, draft, title, stime, end);
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

    const node = await this.postService({ service: bookSvc, ...payload });
    const nid = node && (node.id || node.nid);
    if (!nid) {
      Wm.alert(LOCALE.ERROR_NETWORK);
      return;
    }

    // Link + its gate: an optional password, and "Require email to view" with
    // its optional "Restrict access" list — both enforced at the guest gate
    // (server dmz.js), which matches addresses and "@domain" entries.
    const linkPayload = { service: linkSvc, hub_id: this._personalHub, nid };
    if (draft.password_on && draft.password) linkPayload.password = draft.password;
    if (draft.require_email) {
      linkPayload.require_email = 1;
      if (draft.restrict && (draft.recipients || []).length) {
        linkPayload.allowed_emails = draft.recipients;
      }
    }
    const answer = await this.postService(linkPayload);
    const link = answer && answer.link;

    if (link) copyToClipboard(link);
    this._form = { kind: "invite-link", link: link || "" };
    // The new meeting reaches the grid when this card closes (_closeForm),
    // not underneath it — a reload now would re-feed the card it just opened.
    this._dirty = true;
    this._renderModal();
  }

  /**
   * Save an edited personal meeting. Two narrow room.update calls rather than
   * one `flag: "all"`: "all" also rewrites the agenda (cleared unless resent)
   * and the attendee list (replaced by whatever is sent), neither of which this
   * form shows. "title" renames, "when" moves the date and both epochs; the
   * recurrence, the agenda, the attendees and the attachments are kept.
   */
  async _updateMeeting(form, draft, title, stime, etime) {
    const row = form.row || {};
    const nid = row.nid || row.id;
    const svc = (SERVICE.room && SERVICE.room.update) || "room.update";
    const scope = { service: svc, hub_id: this._personalHub, nid };
    const base = day(draft.date);
    const renamed = title !== (row.title || "")
      ? await this.postService({ ...scope, flag: "title", title })
      : true;
    const moved = await this.postService({
      ...scope,
      flag: "when",
      date: base ? base.format("LLLL") : "",
      stime,
      etime,
    });
    // postService never rejects: a refusal (NOT_MEETING_OWNER) or a transport
    // failure answers {error} or nothing.
    if (!renamed || renamed.error || !moved || moved.error) {
      Wm.alert(LOCALE.ERROR_NETWORK);
      return;
    }
    this._form = null;
    await this._reload();
  }

  async _deleteMeeting() {
    const row = (this._form && this._form.mode === "edit" && this._form.row) || null;
    if (!row || this._submitting) return;
    this._submitting = true;
    try {
      const res = await this.postService({
        service: (SERVICE.room && SERVICE.room.remove) || "room.remove",
        hub_id: this._personalHub,
        nid: row.nid || row.id,
      });
      if (!res || res.error) {
        Wm.alert(LOCALE.ERROR_NETWORK);
        return;
      }
      this._form = null;
      await this._reload();
    } finally {
      this._submitting = false;
    }
  }

  async _removeItem(cmd) {
    const kind = cmd.mget("itemKind");
    const id = cmd.mget("itemId");
    const hub_id = cmd.mget("itemHub") || this._personalHub;
    if (id == null) return;

    let res;
    if (kind === "meeting") {
      const svc = (SERVICE.room && SERVICE.room.remove) || "room.remove";
      res = await this.postService({ service: svc, hub_id, nid: cmd.mget("itemNid") || id });
    } else {
      const svc = (SERVICE.task && SERVICE.task.delete) || "task.delete";
      res = await this.postService({ service: svc, hub_id, id });
    }
    if (this.isDestroyed && this.isDestroyed()) return;
    // postService never rejects: a refusal is {error}, a lost request
    // undefined. The chip stays, since the item does.
    if (!res || res.error) {
      Wm.alert(LOCALE.ERROR_NETWORK);
      return;
    }
    this._dropItem(kind, id);
  }

  /**
   * Take a deleted item off the screen WITHOUT rebuilding the page: only the
   * chip lists of the days that showed it are re-fed — several for a series —
   * so a month cell's next item moves up and its "+N more" recounts, and an
   * open "+N more" popover is re-fed in place. No refetch either: our own
   * writes never come back as a push, and the server has already said yes.
   *
   * Falls back to a full render when a day's part cannot be found.
   */
  _dropItem(kind, id) {
    const match = (r) => `${r.id}` === `${id}` && r.kind === kind;
    const keys = new Set();
    this.getVisibleItems().forEach((r) => {
      if (!match(r)) return;
      const s = rowStart(r);
      if (s) keys.add(ymd(s));
    });
    this._items = this._items.filter((r) => !match(r));
    // The other cached windows may hold it too; they are re-read on demand.
    this._dropWindowCache();

    const byDay = itemsByDay(this.getVisibleItems());
    const month = this._view === "month";
    for (const key of keys) {
      const part = _.isFunction(this.getPart) ? this.getPart(`cal-body-${key}`) : null;
      if (!part || (part.isDestroyed && part.isDestroyed()) || !part.el) {
        return this._render();
      }
      const list = byDay[key] || [];
      part.feed(
        month
          ? require("./skeleton/month").dayBodyKids(this, list, key)
          : require("./skeleton/board").bodyKids(this, list, this._view),
      );
    }

    const m = this._dayMenu;
    if (m && m.over && keys.has(m.key)) {
      m.slot.feed(require("./skeleton/day-popover")(this, m.key));
      this._placeDayMenu();
    }
  }

  /**
   * Clicking an item.
   *
   * A PERSONAL task is this screen's own record and opens the editable modal
   * right here — there is no workspace to go to.
   *
   * A WORKSPACE task opens right here too, as the board's own card: the
   * workspace's tasks_panel mounted in quick-open mode (_openQuickTask). It
   * writes to the owning hub through the board's own handlers, and only as far
   * as the viewer's role in that workspace allows — calendar.list reads it on
   * the hub side and answers can_write; the task ACL still checks every write.
   * Its "Open in board" goes on to the workspace.
   *
   * A WORKSPACE meeting is handed over to the surface that owns it: switch to
   * that workspace, open its Meeting tab, open that record's own panel.
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
    if (row.scope === "workspace" && row.kind === "task") return this._openQuickTask(row);
    // A personal meeting is edited here, in this screen's own meeting form: it
    // lives in the caller's own hub, which has no Meeting tab to hand it to.
    // The creator only (room.update / room.remove are creator-only), and never
    // from one occurrence of a series, for the same reason as the task above.
    if (row.scope === "personal" && row.kind === "meeting" && row.can_write) {
      if (occurrence) {
        this.warn("calendar: an occurrence of a recurring item is not editable", id);
        return;
      }
      return this._openMeetingForm(row);
    }
    // The occurrence's OWN start, so the workspace's Meeting tab anchors on
    // the date the user clicked rather than on the series origin.
    const stime = Number(cmd.mget("itemStime")) || 0;
    return this._openInWorkspace(row, { stime });
  }

  /**
   * A workspace task's quick-open card: the board's tasks_panel for the row's
   * hub, drawing only that task's card (quick_open). Edits stay the board's:
   * its own handlers, its own Update, its own upload folder for the hub. The
   * panel says when the card has gone (task-quick-open-closed / -board).
   */
  _openQuickTask(row) {
    this._closeMenus();
    this._form = { kind: "task-quick-open", row };
    this._renderModal();
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
      // The quick-open card has gone (X, Cancel, Escape, a saved Update, or a
      // task that is no longer on its board). Its writes carry this tab's
      // socket_id, so none of them comes back as a push: reload on both exits,
      // whatever was done, since comments, subtasks and files save at once.
      case "task-quick-open-closed": {
        if (!this._form || this._form.kind !== "task-quick-open") return;
        return this._closeForm() || this._reload();
      }
      // Its "Open in board": the workspace board takes over, on this task.
      case "task-quick-open-board": {
        const form = this._form;
        if (!form || form.kind !== "task-quick-open") return;
        this._dirty = true;
        this._closeForm();
        return this._openInWorkspace(form.row);
      }
      case "cal-prev":
        return this._step(-1);
      case "cal-next":
        return this._step(1);
      // Back to today in whatever view is current: the month, the week or the
      // day holding it. Same cursor-then-refetch path as ‹ and ›.
      case "cal-today":
        this._cursor = ymd(Dayjs());
        // Bring today's cell into view too — also when this range is already
        // the one on screen and the grid was only scrolled away from it.
        this._scrollTodayPending = true;
        return this._navigate();

      // Menu open/close is toolbar-only state — never repaint the grid for it.
      case "cal-toggle-view-menu":
        return this._toggleMenu("view");

      case "cal-toggle-range-menu":
        // Each open starts on the month the calendar is actually showing —
        // otherwise the popup reopens wherever the user last browsed to and
        // stopped, which is not where the grid behind it is.
        this._pickerCursor = null;
        return this._toggleMenu("range");

      case "cal-toggle-filter-menu":
        return this._toggleMenu("filter");

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
        // The fetch window moves with the cursor (cached when already read).
        return this._navigate();
      }

      case "cal-set-view": {
        const next = cmd.mget("calView");
        if (VIEW_KEYS.includes(next)) this._view = next;
        // The window changes with the view, so this needs a (cached) refetch,
        // not just a re-render.
        return this._navigate();
      }

      case "cal-set-filter": {
        const next = cmd.mget("calFilter");
        if (FILTER_KEYS.includes(next)) this._filter = next;
        this._closeMenus();
        // Filtering is client-side over an already-fetched window — no refetch.
        return this._render();
      }

      case "cal-set-audience": {
        const next = cmd.mget("calAudience");
        if (AUDIENCE_KEYS.includes(next)) this._audience = next;
        this._closeMenus();
        // Client-side too: calendar.list already sends every row's scope.
        return this._render();
      }

      case "cal-toggle-new-menu":
        return this._toggleMenu("new");

      // From "+ New", or from a day cell's "+" menu, whose rows name the day
      // the form opens due on.
      case "cal-new-task":
      case "cal-new-meeting":
        if (cmd.mget("calDay")) this._pendingDay = cmd.mget("calDay");
        this._closeDayMenu();
        return service === "cal-new-task" ? this._openTaskForm(null) : this._openMeetingForm();

      case "cal-day-menu":
        return this._toggleDayMenu(cmd);

      case "cal-day-add":
        this._pendingDay = cmd.mget("calDay");
        return this._openTaskForm(null);

      // "+N more" in a month cell: the day's items in a popover over the cell.
      case "cal-day-more":
        return this._toggleDayMore(cmd);
      case "cal-day-more-close":
        return this._closeDayMenu();

      // The popover's date: that day in Day view.
      case "cal-day-open": {
        this._closeDayMenu();
        const target = cmd.mget("calDay");
        if (target) {
          this._cursor = target;
          this._view = "day";
        }
        return this._navigate();
      }

      // From a cell or from the "+N more" popover. The popover closes once
      // the item has been read off the chip — closing destroys the chip.
      case "cal-open-item": {
        const r = this._openItem(cmd);
        this._closeDayMenu();
        return r;
      }
      // The "+N more" popover stays open: _dropItem re-feeds it.
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
        if (this._form.kind === "meeting") {
          this._form.draft.date = value;
          return;
        }
        // The task form has two pickers on this one service: the field's own
        // name says which end of Start → End moved.
        const name = (cmd.mget(_a.name) || cmd.mget("name")) === "start_date" ? "start_date" : "due_date";
        this._form.draft[name] = value;
        return this._syncDateRange(name);
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
        cmd.el.setAttribute("aria-pressed", visible ? "false" : "true");
        return;
      }

      case "cal-toggle-password":
        if (!this._form) return;
        this._form.draft.password_on = !this._form.draft.password_on;
        return this._syncInviteDom();

      case "cal-add-recipient": {
        if (!this._form) return;
        // Only an Enter commits — the Entry also reports other statuses.
        if (args && args.__inputStatus && args.__inputStatus !== _a.commit) return;
        const part = await this.ensurePart("form-recipient");
        const input = part && part.el && part.el.querySelector("input");
        const entry = recipientEntry(input ? input.value : "");
        if (!entry) {
          if (input && String(input.value || "").trim() && typeof Butler !== "undefined") {
            Butler.say(LOCALE.ENTER_EMAIL_OR_DOMAIN);
          }
          return;
        }
        const list = this._form.draft.recipients || [];
        if (!list.includes(entry)) list.push(entry);
        this._form.draft.recipients = list;
        if (input) input.value = "";
        return this._renderRecipients();
      }

      // "+N": show every allowed email / domain, so each can be removed.
      case "cal-expand-recipients":
        if (!this._form) return;
        this._form.recipientsExpanded = true;
        return this._renderRecipients();

      case "cal-remove-recipient": {
        if (!this._form) return;
        const email = cmd.mget("calEmail");
        this._form.draft.recipients = (this._form.draft.recipients || []).filter(
          (e) => e !== email,
        );
        return this._renderRecipients();
      }

      // The title Entry used to carry `service: "cal-submit-task"` so Enter
      // committed (it now has its own no-op "cal-form-title"; only the button
      // submits). The base Entry reports through its service on other statuses too
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
      case "cal-file-typed":
        return this._searchFiles((args && args.value) || "");
      case "cal-pick-file":
        return this._pickSearchedFile(cmd.mget("calNid"));

      case "cal-subtask-add":
        return this._addSubtask();
      case "cal-subtask-commit":
        // Enter only — the same status guard as cal-submit-task below.
        if (args && args.__inputStatus && args.__inputStatus !== _a.commit) {
          return;
        }
        return this._commitSubtask(cmd.mget("calSubKey"));
      case "cal-subtask-remove":
        return this._removeSubtask(cmd.mget("calSubKey"));
      case "cal-subtask-menu":
        return this._toggleSubtaskMenu(cmd.mget("calSubKey"), cmd.mget("calSubKind"));
      case "cal-subtask-set":
        return this._setSubtaskValue(cmd.mget("calSubKey"), cmd.mget("calSubKind"), cmd.mget("calValue"));

      // The title Entry's own reports (Enter's commit, Escape's cancel).
      // Enter in the title saves nothing: only the Create / Update button
      // submits (skeleton/task-form.js).
      case "cal-form-title":
        return;

      case "cal-submit-task":
        if (args && args.__inputStatus && args.__inputStatus !== _a.commit) {
          return;
        }
        return this._submitTask();
      case "cal-delete-task":
        return this._deleteTask();
      case "cal-delete-meeting":
        return this._deleteMeeting();
      case "cal-submit-meeting":
        if (args && args.__inputStatus && args.__inputStatus !== _a.commit) {
          return;
        }
        return this._submitMeeting();

      case "cal-copy-link": {
        const link = this._form && this._form.link;
        if (link) {
          copyToClipboard(link);
          this._showToast(LOCALE.PERSONAL_MEETING_LINK_COPIED, "success");
        }
        return;
      }

      case "cal-toast-close":
        return this._closeToast();

      default:
        if (super.onUiEvent) return super.onUiEvent(cmd, args);
    }
  }

  // One part is captured here: the quick-open card's board panel, which
  // Escape is handed to (_installFormKeys). The modal slot itself
  // ("wrapper-cal-modal" — Wrapper.Y names it `wrapper-{name}`) needs no
  // wiring, its kids come from the skeleton; everything else flows to the
  // base class.
  onPartReady(child, pn) {
    // The quick-open card's board panel, so Escape can be handed to it.
    if (pn === "quick-open-panel") this._quickPanel = child;
    if (super.onPartReady) super.onPartReady(child, pn);
  }
}

module.exports = __calendar_main;
