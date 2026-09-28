const CATEGORIES = {
  ticket: "supportCount",
  chat: "contactChatCount",
  teamchat: "teamChatCount",
  media: "mediaCount",
}
const WS_EVENT = "ws:event";
// The tab set is declared once, in the tab bar skeleton, and imported here so
// the panel and the bar can never disagree about which buckets exist.
const { BUCKETS: TAB_BUCKETS, DEFAULT_BUCKET } = require('./skeleton/tabbar');
// Header Filter popup (All / Unread / Bookmarked), declared once in its skeleton.
const { VIEW_FILTERS, buttonLabel: viewFilterLabel } = require('./skeleton/view-filter');
// Round 3 Phase 2: the real-time chat card. Built to Figma
// (58208:83650) — see chat-toast.js for the measurements and the rules.
const { showChatToast, killChatToast } = require('./chat-toast');
// Round 3 Phase 3: which popups the user has switched off. Read once here and
// refreshed from every mute_set — never per message. Suppresses the CARD only:
// the feed, the badge and the tab counts are untouched by design.
const { loadMuteState } = require('./mute');
const { hubCounts, latestTime } = require('./hub-counts');
require('./skin');
const { trackDeskCanvas } = require('libs/desk-canvas');
const { armItemsReady, markItemsReady } = require("libs/items-ready");

class __panel_activity extends LetcBox {
  constructor(...args) {
    super(...args);
    this.updateSubactivityCount = this.updateSubactivityCount.bind(this);
    this.updateactivityCount = this.updateactivityCount.bind(this);
    this.refreshActivity = this.refreshActivity.bind(this);
    this.onWsMessage = this.onWsMessage.bind(this);
    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    this.getCurrentApi = this.getCurrentApi.bind(this);
    this._notify = this._notify.bind(this);
    this._hide = this._hide.bind(this);
    this._onWorkspaceChatRead = this._onWorkspaceChatRead.bind(this);
    this._onRefreshRequest = this._onRefreshRequest.bind(this);
    this._onWorkspaceTabSeen = this._onWorkspaceTabSeen.bind(this);
  }

  /**
   *
   * @param {*} opt 
   */
  initialize(opt = {}) {
    this.activityState = 0;
    opt.state = 0;
    super.initialize(opt);
    armItemsReady(this);
    this.declareHandlers();

    window.ActivityHandler = this;

    this._onOutsideClick = this._onOutsideClick.bind(this);
    this._currentCount = 0;
    this._currentPayload = {};
    // The panel opens showing READ AND UNREAD, and the Unreads toggle narrows
    // to unread. Lexis 2026-08-28: reading a notification must no longer make
    // it disappear, and this default is what makes that visible -- a read row
    // stays in the list and simply loses the unread card tint (the styling for
    // that already existed: item/skin/index.scss keys the fill on
    // [data-unread="1"]). Before this the panel opened unread-only, so a row
    // was filtered out the moment it was read.
    this._unreadsOnly = 0;
    // Header Filter (skeleton/view-filter): '' = no filter, the panel as above.
    // _unreadsOnly is derived from it in _applyViewFilter.
    this._viewFilter = '';
    // Selected Notification Center tab. 'all' = no bucket scope, so the very
    // first render requests the same unscoped feed the panel always has.
    this._filter = DEFAULT_BUCKET;
    this._mergedRows = [];
    // Last day group emitted by _stampDayHeaders; reset whenever the feed
    // restarts at page 1.
    this._dayCursor = null;
    this._dismissedKeys = new Set();
    this._meetingItems = [];
    this.details = {};
    this.onVisibilityChange = this.onVisibilityChange.bind(this)
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    this.onWsMessage = this.onWsMessage.bind(this)
    this._last_notified = 0;
    // Fire and forget: the panel must come up whether or not this answers, and
    // it never rejects. Until it lands nothing is muted, which is the safe
    // direction — a failed read shows a popup that should have been silenced,
    // where the opposite default would silence one that should have shown.
    loadMuteState(this);
  }

  /**
   * 
   */
  _hide() {
    this._closeViewFilter();
    this.el.dataset.anim = "out";
    this.setState(0)
    this.activityState = 0
  }
  /**
   * 
   * @param {*} e 
   */
  _onOutsideClick(e, source) {
    // The Filter popup closes on any click outside itself and its button, on
    // every device, before the panel-level rules below.
    const target = e && e.target;
    if (!(target && target.closest && target.closest('.panel-activity__vf'))) {
      this._closeViewFilter();
    }
    // Clicks coming from a sidebar toggle button are owned by
    // Desk.togglePanel / toggle-activity — bail so we don't race the
    // toggle handler and immediately reopen what it just closed.
    const svc = source && source.mget && source.mget(_a.service);
    if (typeof svc === "string" && svc.startsWith("toggle-")) return;
    if (!this.activityState) return;
    // Mobile: the card closes only via its explicit close button (plus the
    // sidebar toggle), so it never auto-dismisses on an outside tap. This
    // also removes the filter-tab (All/Mentions/Shares) re-render race that
    // mis-fired as an outside click and closed the panel.
    if (Visitor.isMobile()) return;
    // Desktop keeps outside-click-to-close, but resolved against the LIVE
    // DOM: switching the filter restarts the smart list and can detach the
    // clicked node (or leave this.el a stale __ui), which the old
    // this.el.contains check mis-read as an outside click.
    const t = e && e.target;
    if (!t || !t.isConnected) return;
    if (t.closest && t.closest('.panel-activity__ui')) return;
    this._hide();
  }

  /**
   * 
   */
  onDestroy() {
    RADIO_CLICK.off(_e.click, this._onOutsideClick);
    RADIO_BROADCAST.off('activity:request', this.updateSubactivityCount);
    RADIO_BROADCAST.off('activity:notify', this._notify);
    RADIO_BROADCAST.off('workspace-chat-read', this._onWorkspaceChatRead);
    RADIO_BROADCAST.off('activity:refresh', this._onRefreshRequest);
    RADIO_BROADCAST.off('workspace-tab-seen', this._onWorkspaceTabSeen);
    if (this._refreshRequestTimer) clearTimeout(this._refreshRequestTimer);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    // The card lives in the window layer, not inside this panel, so it would
    // outlive the panel — along with its pending dismiss timer.
    killChatToast(this);
    if (this._untrackCanvas) this._untrackCanvas();
  }

  /**
   * Cover the workspace at ≤ 1024px (see libs/desk-canvas). This panel is
   * mounted once with the desk and opened through setState, so tracking is
   * (re)tried on every open as well as on render, in case the desk was not
   * in the DOM yet the first time.
   */
  _trackCanvas() {
    if (this._untrackCanvas) return;
    this._untrackCanvas = trackDeskCanvas(this.el);
  }

  /**
   * The desk opens this panel with setState(1) directly, not through a
   * service, so this is the one place every open passes.
   */
  setState(state, ...rest) {
    if (~~state === 1) this._trackCanvas();
    return super.setState(state, ...rest);
  }

  /**
   * 
   * @param {*} e 
   */
  onVisibilityChange(e) {
    if (!this.visible) {
      this.refreshActivity(100);
    }
    this.visible = !document.hidden;
  }


  /**
   * 
   */
  onDomRefresh() {
    this.setState(0);
    this._trackCanvas();
    RADIO_BROADCAST.on('activity:request', this.updateSubactivityCount);
    RADIO_BROADCAST.on('activity:notify', this._notify);
    // off-before-on, same reason as the outside-click handler below.
    RADIO_BROADCAST.off('workspace-chat-read', this._onWorkspaceChatRead);
    RADIO_BROADCAST.on('workspace-chat-read', this._onWorkspaceChatRead);
    RADIO_BROADCAST.off('activity:refresh', this._onRefreshRequest);
    RADIO_BROADCAST.on('activity:refresh', this._onRefreshRequest);
    RADIO_BROADCAST.off('workspace-tab-seen', this._onWorkspaceTabSeen);
    RADIO_BROADCAST.on('workspace-tab-seen', this._onWorkspaceTabSeen);
    RADIO_NETWORK.on(_e.online, this.refreshActivity);
    // off-before-on: onDomRefresh can run again on re-feed; without this the
    // outside-click handler stacks up duplicate registrations.
    RADIO_CLICK.off(_e.click, this._onOutsideClick);
    RADIO_CLICK.on(_e.click, this._onOutsideClick)
    this.visible = !document.hidden;
    this.feed(require('./skeleton')(this));
    this.ensurePart(_a.list).then((p) => {
      this.refreshActivity()
    })
    Wm.on(WS_EVENT, this.onWsMessage)
  }

  /**
   * The feed list registers here so its `data` event can be hooked before it
   * fetches anything (see the skeleton). Guarded super-delegation is the repo
   * pattern: LetcBox defines no onPartReady, and the 'priority' part is reached
   * through ensurePart rather than this hook.
   */
  onPartReady(child, pn) {
    if (pn === _a.list && child && child.on) {
      // renderData() emits this with the page's raw rows just before mapping
      // them into item models — the one place the whole page is visible in
      // order, which is what day grouping needs.
      child.on(_e.data, (rows) => this._stampDayHeaders(child, rows));
      // Same page of raw rows: the saved ones among them are pinned on top.
      child.on(_e.data, (rows) => this._collectPinned(child, rows));
      // An EMPTY first page never emits `data` (ui-core handleResponse goes
      // straight to eod), which would leave the pinned block unbuilt: the
      // Unread / All filters on a view with nothing unread. Build it from the
      // snapshots alone then.
      child.on(_e.eod, () => {
        if (this._pinCollected !== this._pinCycle) this._collectPinned(child, []);
      });
      // The first page is down (rows or none): the feed has painted. A
      // reload's screen restore waits on this (libs/items-ready).
      child.once(_e.eod, () => markItemsReady(this));
      // A failed first page fires `error`, never `eod` (ui-core list
      // onServerComplain) — and a failed load is still a finished one.
      child.once(_e.error, () => markItemsReady(this));
    }
    if (super.onPartReady) super.onPartReady(child, pn);
  }

  /**
   * Mark the first row of each day so the row widget can render a
   * "Today" / "Yesterday" / "Aug 13" caption above itself. Grouping is entirely
   * client-side off `timestamp || ctime`; no server field is involved.
   *
   * `_curPage` is still the page being rendered when this fires (handleResponse
   * increments it only afterwards), so page 1 restarts the grouping and later
   * pages continue it. restart() — tab switch, unread toggle, refresh — always
   * returns to page 1, which resets the cursor.
   *
   * 🚨 The try/catch is load-bearing: ui-core calls renderData() inside
   * `try { … } catch (error) {}`, so an exception raised in here would be
   * swallowed and the feed would render EMPTY with no error anywhere.
   */
  _stampDayHeaders(list, rows) {
    try {
      if (!_.isArray(rows)) return;
      if (!list || (list._curPage || 1) <= 1) this._dayCursor = null;
      for (const row of rows) {
        if (!row || !_.isObject(row)) continue;
        const ts = parseInt(row.timestamp || row.ctime, 10);
        if (!ts) {
          delete row.day_header;
          continue;
        }
        const key = this._dayKey(ts);
        if (key === this._dayCursor) {
          delete row.day_header;
          continue;
        }
        this._dayCursor = key;
        row.day_header = key;
      }
    } catch (e) {
      this.warn('[panel_activity] day-header grouping failed', e);
    }
  }

  /**
   * 'today' | 'yesterday' | 'YYYY-MM-DD'. The row skeleton turns the first two
   * into LOCALE.TODAY / LOCALE.YESTERDAY and formats the rest as "Aug 13".
   */
  _dayKey(ts) {
    const day = Dayjs.unix(ts).startOf('day');
    const diff = Dayjs().startOf('day').diff(day, 'day');
    if (diff === 0) return 'today';
    if (diff === 1) return 'yesterday';
    return day.format('YYYY-MM-DD');
  }

  /**
   * 
   * @returns 
   */
  getCurrentApi() {
    const api = {
      service: SERVICE.activity.get_feed,
      hub_id: Visitor.id,
      unread_only: this._unreadsOnly,
    };
    // 'All' is the ABSENCE of a tab scope, not a scope named "all": the server
    // returns the whole feed when no bucket is sent, which is byte-for-byte the
    // pre-existing behaviour. Every other tab narrows to its bucket, assigned
    // server-side (see bucketOf in service/private/activity.js).
    //
    // `filter` is deliberately no longer sent. It only ever selected the retired
    // Mentions / Shares tabs; the server defaults it to 'all', which is what the
    // old All tab sent anyway — so dropping it changes nothing.
    if (this._filter && this._filter !== DEFAULT_BUCKET) api.bucket = this._filter;
    // Page 1 of a (re)started feed: fetch the pinned rows for the same view in
    // parallel, so they land together with the first page (_collectPinned).
    const list = this.__list;
    if (!list || (list._curPage || 1) <= 1) this._startPinned();
    return api;
  }

  /**
   * Fetch the per-tab unread counts and write them into the tab badges.
   *
   * One call for all six numbers (activity.unread_counts). The counts cannot be
   * derived on the client: get_feed is paginated, so the panel only ever holds
   * one page and can never know a tab's total.
   *
   * Updates each badge through its own part, so a refresh never re-renders the
   * tab bar — re-rendering would drop the user's selected tab mid-session.
   * Best-effort: on failure the badges keep their last values rather than
   * flashing to zero, which would read as "nothing unread".
   */
  async _renderTabCounts() {
    let counts;
    try {
      counts = await this.postService({
        service: (SERVICE.activity && SERVICE.activity.unread_counts) || 'activity.unread_counts',
        hub_id: Visitor.id,
        // Rail Files pill: per workspace, count new files / folders only after
        // the user last opened its Files tab (hub-counts.js "seen" marks).
        files_since: this._filesSinceMarks(),
      });
    } catch (e) {
      this.warn('[panel_activity] unread_counts failed', e);
      return false;
    }
    if (!counts || typeof counts !== 'object') return false;
    // New files / folders per workspace for the rail's Files pill. Only when
    // the server sent the field: an older server leaves the last list alone.
    if (Array.isArray(counts.files_by_hub)) {
      this._filesByHub = counts.files_by_hub;
      this._publishHubCounts();
    }
    // THE BELL COMES FROM HERE TOO, so it can never disagree with the tabs.
    //
    // It used to be `merged.length` in refreshActivity, which counts only the
    // rows that method merges — access requests, task mentions/assignments and
    // the rollups. That set has no file notifications in it, so the bell read
    // lower than the tabs the moment activity.unread_counts started counting the
    // base feed's changelog rows. One number, one source: `all` is the server's
    // own sum of the five buckets.
    //
    // refreshActivity falls back to `merged.length` only when this returns
    // false (the two early returns above), so a failed request still leaves a
    // bell rather than nothing — and a successful one never gets overwritten by
    // the lower number.
    const bell = parseInt(counts.all, 10);
    if (Number.isFinite(bell)) {
      RADIO_BROADCAST.trigger('activity-update', { unread_count: bell });
    }
    for (const bucket of TAB_BUCKETS) {
      const total = parseInt(counts[bucket], 10) || 0;
      this.ensurePart(`tab-count-${bucket}`).then((p) => {
        if (!p || !p.el) return;
        p.el.innerText = total > 99 ? '99+' : String(total);
        // The real number, so _decrementTabCount can step down from past 99.
        p.el.dataset.count = String(total);
        // Hidden rather than showing a 0 — the design has no zero state.
        p.el.dataset.empty = total ? '0' : '1';
      });
    }
    return true;
  }

  /**
   * @param {*} cmd 
   * @param {*} args 
  */
  async onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.mget(_a.service);
    // Tab clicks (`tab-all` … `tab-other`) are matched by prefix against the one
    // canonical bucket list instead of a case per tab, so the tab set stays
    // defined in exactly one place — the tab bar skeleton. An unknown `tab-*`
    // falls through to the switch untouched rather than silently selecting
    // something.
    if (typeof service === 'string' && service.indexOf('tab-') === 0) {
      const bucket = service.slice(4);
      if (TAB_BUCKETS.indexOf(bucket) !== -1) return this._setTab(bucket);
    }
    switch (service) {
      case 'open-activity-panel':
        this.activityState = 1;
        // "No toast while the Center is open" also means: not one already on
        // screen when it opens. The row is in the list behind it either way.
        killChatToast(this);
        this.setState(1);
        return '';

      case 'close-activity-panel':
        // Through the desk when it is there: the same close the bell's second
        // press takes, which also puts the breadcrumb back on the workspace
        // path and turns the bell off. _hide() as well, for the data-anim it
        // stamps and for a panel mounted without a desk.
        this._hide();
        if (typeof Desk !== 'undefined' && Desk && typeof Desk._closeUtilityPanel === 'function') {
          Desk._closeUtilityPanel('toggle-activity');
        }
        return '';

      case 'delete-entity':
        cmd.goodbye();
        return this.deleteEntityResponse(cmd);

      // The TRASH BUTTON. Permanent since 2026-08-28: the row is removed and
      // stays removed across reloads.
      case 'dismiss-activity': {
        // Deleting a pinned (saved) row also unsaves it, or it would stay
        // pinned on top after the user removed it. Key read BEFORE the delete:
        // the row's view is destroyed once it succeeds.
        const saved = this._savedItemOf(cmd);
        const done = this._dismissActivity(cmd, args, 'delete');
        if (saved) this._forgetSaved(saved.key, saved.item);
        return done;
      }

      // Opening a row's body. Records that the user has read it and leaves the
      // row in the list, without the unread tint. This is what a body click
      // fires now; it used to fire 'dismiss-activity', which is why reading a
      // notification deleted it.
      case 'read-activity':
        return this._dismissActivity(cmd, args, 'read');

      case 'toggle-favorite':
        return this._toggleFavorite(cmd, args);

      // case 'open-contact':
      //   this._dismissFromOpen(cmd, args);
      //   this.activityState = 0;
      //   this.setState(0);
      //   return Desk.togglePanel('address_book', 'chat-panel');

      // case 'open-chat': {
      //   const drumate_id = args && args.drumate_id;
      //   const message_id = args && args.message_id;
      //   this._dismissFromOpen(cmd, args);
      //   this.activityState = 0;
      //   this.setState(0);
      //   Desk.openP2Pchat(args)
      //   return;
      // }

      // case 'open-activity':
      //   this._dismissFromOpen(cmd, args);
      //   return;

      // case 'open-workspace-invitation':
      // case 'open-folder':
      // case 'open-channel':
      // case 'open-ticket': {
      //   // For any "open the underlying entity" service we (1) dismiss the
      //   // notification (in-memory + server-side persistence), (2) close
      //   // the activity panel, and (3) navigate the desk to the target hub.
      //   // Acting on a notification implies "I've seen this" — keeps the
      //   // panel and badge in sync with what the user has actually engaged
      //   // with, no matter which row category fired the open.
      //   const item = this._findActivityItem(cmd);
      //   const hubId = (args && args.hub_id)
      //     || (item && item.mget && item.mget('hub_id'));
      //   this._dismissFromOpen(cmd, args);
      //   this.activityState = 0;
      //   this.setState(0);
      //   if (hubId && typeof Wm !== 'undefined' && Wm.loadWorkspace) {
      //     try { Wm.loadWorkspace({ hub_id: hubId }); }
      //     catch (e) { this.warn('loadWorkspace failed', e); }
      //   }
      //   return;
      // }

      // Header Filter popup. Picking a radio only moves the pending choice;
      // Apply commits it, Clear goes back to no filter.
      case 'view-filter-open':
        return this._toggleViewFilter();

      case 'view-filter-close':
        return this._closeViewFilter();

      case 'view-filter-pick': {
        const pick = cmd.mget && cmd.mget(_a.name);
        const popup = this._vfPart('view-filter-popup');
        if (popup && popup.el && VIEW_FILTERS.indexOf(pick) !== -1) popup.el.dataset.pick = pick;
        return '';
      }

      case 'view-filter-apply': {
        const popup = this._vfPart('view-filter-popup');
        const pick = popup && popup.el && popup.el.dataset.pick;
        this._closeViewFilter();
        return this._applyViewFilter(VIEW_FILTERS.indexOf(pick) !== -1 ? pick : '');
      }

      case 'view-filter-clear':
        this._closeViewFilter();
        return this._applyViewFilter('');

      case 'clear-all':
        return this._clearAll();

      case 'open-access-request': {
        // The request fields arrive in args (forwarded by the item); fall back to
        // the item model so this still works if called with only a cmd. Do NOT
        // hard-return on a missing item — that was the silent failure that left
        // the approve popup from ever opening.
        const item = this._findActivityItem(cmd);
        const pick = (k) => (args[k] != null ? args[k] : (item && item.mget ? item.mget(k) : undefined));
        const req = {
          request_id:      pick('request_id'),
          requested_level: pick('requested_level'),
          requester_email: pick('requester_email'),
          message:         pick('message'),
          hub_id:          pick('hub_id'),
          workspace_name:  pick('workspace_name'),
        };
        if (!req.request_id) return;
        this._arRequest    = req;
        // Multi-select: pre-select every requested level (the recipient may have
        // asked for several, e.g. chat + edit). requested_level is a SET column —
        // the driver returns it as an ARRAY, so String() it before splitting
        // (String(['a','b']) → "a,b"); also handles the legacy single-string form.
        this._arGrantLevels = new Set(String(req.requested_level || '').split(',').map(s => s.trim()).filter(Boolean));
        return this.ensurePart('ar-overlay').then((p) => {
          if (!p) return;
          p.feed(require('./skeleton/approve-request')(this, req));
          this._liftArOverlay(p);
        });
      }

      case 'accept-invite':
        return this._answerWorkspaceInvite('accept', args);

      case 'decline-invite':
        return this._answerWorkspaceInvite('decline', args);

      case 'ar-select-level': {
        // Multi-select: toggle this level in the grant set (the sender can grant
        // several at once, mirroring the recipient's multi request).
        const lvl = cmd.mget('level');
        if (!this._arGrantLevels) this._arGrantLevels = new Set();
        if (this._arGrantLevels.has(lvl)) this._arGrantLevels.delete(lvl);
        else this._arGrantLevels.add(lvl);
        return this.ensurePart('ar-overlay').then((p) => {
          if (!p || !p.el) return;
          p.el.querySelectorAll('[data-level]').forEach((b) => {
            b.dataset.selected = this._arGrantLevels.has(b.dataset.level) ? 'yes' : '';
          });
        });
      }

      case 'ar-approve':
        return this._respondAccessRequest('approve');

      case 'ar-deny':
        return this._respondAccessRequest('deny');

      case 'ar-close':
        return this._closeArOverlay();

      case 'close-access-result':
        // "Done" on the post-decision confirmation (Figma 64/65/66).
        return this._closeArOverlay();

      case 'change-permission':
        // Reopen the approve-request popup for the same request. String() the
        // SET value (driver returns it as an array) before splitting.
        this._arGrantLevels = new Set(String((this._arRequest && this._arRequest.requested_level) || '').split(',').map(s => s.trim()).filter(Boolean));
        return this.ensurePart('ar-overlay').then((p) => {
          if (!p) return;
          p.feed(require('./skeleton/approve-request')(this, this._arRequest || {}));
          this._liftArOverlay(p);
        });

      case 'join-meeting': {
        const item = this._findActivityItem(cmd);
        const hub_id = (args && args.hub_id) || (item && item.mget && item.mget('hub_id'));
        const details = (item && item.mget && item.mget('details')) || {};
        const room_id = (item && item.mget && item.mget('room_id')) || details.nid;
        const room_type = (item && item.mget && item.mget('room_type')) || 'meeting';
        if (hub_id && typeof Wm !== 'undefined' && Wm.addWindow) {
          const folderNid = details.nid || details.actual_home_id || room_id;
          try {
            // Reuse an already-open folder window for this hub and JOIN the
            // live room on it — addWindow has no dedup, so it used to stack a
            // duplicate folder window; and only a fresh window's buildContent
            // honors activeTab:'meeting', so the duplicate was also the only
            // reason the join fired at all.
            const open = ((Wm.getItemsByKind && Wm.getItemsByKind('window_folder')) || [])
              .find((w) => !w.isDestroyed() && w.mget(_a.hub_id) == hub_id);
            if (open && typeof open._launchMeetingInPanel === 'function') {
              if (open.raise) open.raise();
              open._launchMeetingInPanel();
            } else {
              Wm.addWindow({
                kind: 'window_folder',
                hub_id,
                nid: folderNid,
                filename: details.filename || details.user_filename || '',
                area: details.area,
                activeTab: 'meeting',
                room_id,
                room_type,
              });
            }
          } catch (e) { this.warn('join-meeting: addWindow failed', e); }
        }
        const item_key = item && item.mget && item.mget('item_key');
        if (item_key) {
          this._meetingItems = (this._meetingItems || []).filter(m => m.item_key !== item_key);
          this.refreshActivity(0);
        }
        this.activityState = 0;
        this.setState(0);
        return;
      }

      case 'open-meeting-chat': {
        // Row click on a meeting notification (NOT the green Join button): open the
        // folder CHAT tab where the meeting is happening (the meeting-start card's
        // own Join button lets the user join when ready) — do NOT join the call.
        // If that folder window is already open, raise it and switch to Chat;
        // otherwise open a fresh window on the Chat tab. Reuse the window rather
        // than a location.hash reveal, so an already-open folder actually switches
        // to the conversation instead of just re-focusing whatever tab was showing
        // (that "reveal a nid" route was why the row appeared to do nothing when a
        // folder for the hub was already open). The folder window self-heals its
        // chat-gate privilege on open (see window/folder _healChatPrivilege), so a
        // full-permission member is never wrongly shown "need admin permission".
        const item = this._findActivityItem(cmd);
        const hub_id = (args && args.hub_id) || (item && item.mget && item.mget('hub_id'));
        const details = (item && item.mget && item.mget('details')) || {};
        const folderNid = details.nid || details.actual_home_id
          || (item && item.mget && item.mget('room_id')) || 0;
        if (hub_id && typeof Wm !== 'undefined') {
          try {
            // Same "the window already showing this exact folder" lookup the
            // notification tab deep link uses — one definition, in window/utils.
            const open = Wm._findFolderWindow(hub_id, folderNid);
            if (open) {
              if (open.raise) open.raise();
              if (open.showFolderTab) open.showFolderTab(_a.chat);
            } else if (Wm.addWindow) {
              Wm.addWindow({
                kind: 'window_folder',
                hub_id,
                nid: folderNid,
                filename: details.filename || details.user_filename || '',
                area: details.area,
                activeTab: _a.chat,
              });
            }
          } catch (e) { this.warn('open-meeting-chat: open folder failed', e); }
        }
        const item_key = item && item.mget && item.mget('item_key');
        if (item_key) {
          this._meetingItems = (this._meetingItems || []).filter(m => m.item_key !== item_key);
          this.refreshActivity(0);
        }
        this.activityState = 0;
        this.setState(0);
        return;
      }
    }
  }

  async _clearAll() {
    // "Mark as all read" acts on the tab in view. null = the All tab = clear
    // everything, which is the pre-existing behaviour, byte for byte.
    const bucket = (this._filter && this._filter !== DEFAULT_BUCKET) ? this._filter : null;
    if (bucket) return this._clearBucket(bucket);
    this._dismissedKeys = this._dismissedKeys || new Set();
    try {
      const [invitations, messages, hubInvites] = await Promise.all([
        this.postService(SERVICE.contact.invite_get, { hub_id: Visitor.id }),
        this.postService(SERVICE.drumate.notification_center, { hub_id: Visitor.id }),
        this._fetchHubInvitations(),
      ]);
      (invitations || []).forEach((e) => this._dismissedKeys.add(`contact_invite:${e.id || e.drumate_id || ''}`));
      (messages || []).forEach((e) => this._dismissedKeys.add(`chat:${e.key_id || e.drumate_id || e.hub_id || ''}`));
      (hubInvites || []).forEach((e) => this._dismissedKeys.add(`hub_invite:${e.id || e.hub_id || ''}`));
    } catch (e) {
      this.warn('clear-all snapshot failed', e);
    }
    try {
      await this.postService(SERVICE.activity.mark_all_read, { hub_id: Visitor.id });
    } catch (e) {
      this.warn('mark_all_read failed', e);
    }
    this.ensurePart('priority').then((p) => {
      if (!p) return;
      p.feed([]);
      if (this.el && this.el.dataset) this.el.dataset.hasPriority = '0';
    });
    if (this.__list && !this.__list.isDestroyed()) this.__list.restart();
    RADIO_BROADCAST.trigger('activity-update', { unread_count: 0 });
    this._renderTabCounts();
  }

  /**
   * Mark one tab's notifications as read (the scoped half of _clearAll).
   *
   * Deliberately does NOT hand-maintain the local dismissed-key bookkeeping the
   * unscoped path uses: the server has already persisted the read state for this
   * bucket, so re-reading the truth via refreshActivity is both simpler and
   * safer than duplicating the per-category key formats here — and it repairs
   * the bell badge and every tab count in the same pass, instead of asserting a
   * zero that is only true for one tab.
   */
  async _clearBucket(bucket) {
    try {
      await this.postService(SERVICE.activity.mark_all_read, {
        hub_id: Visitor.id,
        bucket,
      });
    } catch (e) {
      this.warn('mark_all_read failed', e);
      return;
    }
    // Live meeting rows are client-side only, so no server call can clear them.
    if (bucket === 'meeting') this._meetingItems = [];
    return this.refreshActivity(0);
  }

  _findActivityItem(cmd) {
    if (!cmd) return null;
    // `kind` is consumed by the list factory and not always retained on the
    // model, so also accept a forwarded item by `item_key` (always set in the
    // item's initialize via mset). Falls back to walking parents for child
    // elements (e.g. action buttons) that bubble up.
    if (cmd.mget && (cmd.mget('kind') === 'activity_item' || cmd.mget('item_key'))) return cmd;
    if (cmd.getParentByKind) return cmd.getParentByKind('activity_item');
    return null;
  }

  /**
   * Approve or deny the access request currently shown in the overlay, then
   * refresh the list so the handled request drops off. Caller must be the share
   * creator (enforced server-side).
   */
  /**
   * Answer a workspace invitation from its notification row.
   *
   * ACCEPT IS WHAT MAKES SOMEBODY A MEMBER now — hub.invite only mints the
   * invitation — so this is not a convenience shortcut for something that has
   * already happened. Declining is the other half, and it is the answer that
   * previously had no way to be given at all.
   *
   * 🚨 THE PAYLOAD IS THE TOKEN AND NOTHING ELSE, deliberately. That is the
   * exact shape modules/welcome has been calling hub.accept_invite with since
   * the link flow shipped, and it is the proven one; both services are
   * `src: anonymous` and resolve the workspace from the token themselves.
   * Adding hub_id would make this the only call site that sends it, on a
   * hub-scoped ACL, for no gain.
   *
   * WHY THE PANEL AND NOT THE ROW. The row is destroyed by the refresh this
   * triggers, so anything it owned mid-flight would go with it; and the
   * navigation after an accept belongs to whoever owns the desk's panels, which
   * is this.
   *
   * @param {String} action 'accept' | 'decline'
   * @param {Object} args   forwarded by the row: invite_token, hub_id, hub_name
   */
  async _answerWorkspaceInvite(action, args = {}) {
    const token = args.invite_token;
    // No token means the row is not answerable — an older invitation, or the
    // receipt written when an admin added somebody directly. The buttons are
    // not drawn in that case (see the item skeleton), so this is the belt to
    // that braces: never post an answer with nothing to answer.
    if (!token) return;
    // Re-entrancy guard. Both answers are irreversible-ish and the row stays on
    // screen until the refresh lands, so a double press would send two.
    if (this._answeringInvite) return;
    this._answeringInvite = 1;

    let res;
    try {
      res = await this.postService(
        action === 'accept' ? 'hub.accept_invite' : 'hub.decline_invite',
        { token },
      );
    } catch (e) {
      this.warn('[panel_activity] invite answer failed', e);
      this._answeringInvite = 0;
      this.refreshActivity(0);
      return;
    }
    this._answeringInvite = 0;

    // A rejected POST resolves undefined — doRequest hands a non-200 to
    // onServerComplain, which only warns — so a falsy answer is a failure and
    // must not be reported as a completed one.
    const status = (res && res.status) || (res ? '' : 'invalid');

    if (status === 'SEAT_LIMIT_REACHED') {
      // The org is full. Same surface the member form raises for the same
      // condition, and it is privilege-aware — only an org owner is shown the
      // upgrade card, everyone else simply gets nothing rather than a dead end.
      try {
        const { canShowSeatLimitPopup } = require('libs/billing');
        if (canShowSeatLimitPopup() && typeof Wm !== 'undefined' && Wm.openQuotaExceeded) {
          Wm.openQuotaExceeded({ limit: 'seat' });
        }
      } catch (e) { /* the refresh below still runs */ }
      this.refreshActivity(0);
      return;
    }

    if (status && status !== 'declined') {
      // invalid | expired | already_used | hub_not_found | not_authenticated |
      // OVER_LIMIT. All of them mean the same thing to the person pressing the
      // button: this invitation cannot be answered any more. One message, and
      // it is a key that is genuinely translated in all six locale files.
      if (typeof Wm !== 'undefined' && Wm.alert) Wm.alert(LOCALE.INVITE_LINK_INVALID);
      // Refreshed even on failure: the server dismisses the notification when
      // an invitation is answered, so a row reporting 'already_used' is a stale
      // one and the refresh is what clears it.
      this.refreshActivity(0);
      return;
    }

    this.refreshActivity(0);

    if (action !== 'accept') return;

    // JOINED — take them into the workspace, which is what the invitation was
    // for. `already_member: 1` comes back when they already had at least the
    // access the invitation offered; that is still a successful answer and
    // still lands on the workspace.
    const hub_id = (res && res.hub_id) || args.hub_id;
    if (!hub_id) return;
    // The sidebar is built from a cached workspace list that predates this
    // membership, so it has to be told before the switch — the desk rebuilds
    // the switcher on this broadcast.
    if (typeof RADIO_BROADCAST !== 'undefined') {
      RADIO_BROADCAST.trigger('workspace:refresh');
    }
    if (typeof Wm !== 'undefined' && _.isFunction(Wm.loadWorkspace)) {
      // nid ZERO, not omitted: loadWorkspace documents that a caller which
      // knows only the hub must reach its media.attributes fetch with an
      // explicit zero. Leaving it undefined skips that fetch and opens nothing.
      Wm.loadWorkspace({ hub_id, nid: 0 });
    }
    // Close the panel, the way join-meeting does after it navigates — it
    // overlays the workspace that was just opened.
    this.activityState = 0;
    this.setState(0);
  }

  async _respondAccessRequest(action) {
    const req = this._arRequest || {};
    if (!req.request_id) return this._closeArOverlay();
    // Multi-select grant → comma-list (server stores a SET). Need ≥1 to approve.
    const grantLevel = Array.from(this._arGrantLevels || []).join(',');
    if (action === 'approve' && !grantLevel) return; // need at least one level
    const payload = { hub_id: req.hub_id, request_id: req.request_id, action };
    if (action === 'approve') payload.granted_level = grantLevel;
    try {
      await this.postService(
        (SERVICE.secure_share && SERVICE.secure_share.respond_to_access_request)
          || 'secure_share.respond_to_access_request',
        payload
      );
    } catch (e) {
      this.warn('[panel_activity] respond_to_access_request failed', e);
      this._closeArOverlay();
      this.refreshActivity(0);
      return;
    }
    this.refreshActivity(0);
    // Figma 64/65/66 — show the post-decision confirmation in the same overlay.
    this._showArResult(action === 'deny' ? 'denied' : grantLevel);
  }

  // Render the post-decision confirmation (Figma 64/65/66) into the ar-overlay,
  // reusing the secure-share window's access-result skeleton + SCSS (fig override
  // so the same styles apply). Keeps `_arRequest` so "Change permission" works.
  _showArResult(outcome) {
    this.mset({ _pendingRequest: this._arRequest || {}, _resultOutcome: outcome });
    this.ensurePart('ar-overlay').then((p) => {
      if (!p) return;
      p.feed(require('window/secure-share/skeleton/access-result')(this, { fig: 'window-secure-share-access-result' }));
      this._liftArOverlay(p);
    });
  }

  // Lift the approve/result overlay out of the slide-transformed panel rail to
  // <body> so position:fixed centres it over the whole viewport (Figma 63/64/65/66).
  // A transformed/will-change ancestor (the panel's __ui slide) is a containing block
  // for fixed descendants, so the overlay would otherwise stay trapped in the panel
  // rail. LETC routes button clicks by uiHandler ref (not DOM ancestry), so moving
  // the node keeps Confirm/Deny/level-select working. Idempotent.
  _liftArOverlay(p) {
    if (!p || !p.el) return;
    if (p.el.parentNode !== document.body) document.body.appendChild(p.el);
    p.el.dataset.mode = _a.open;
  }

  _closeArOverlay() {
    this._arRequest = null;
    this._arGrantLevel = null;
    this.mset({ _resultOutcome: null });
    this.ensurePart('ar-overlay').then((p) => {
      if (!p || !p.el) return;
      p.el.dataset.mode = _a.closed;
      p.clear();
    });
  }

  /**
   * Save / unsave one notification row.
   *
   * Goes through activity.bookmark_add / bookmark_remove, keyed by the
   * `bookmark_key` activity.get_feed stamps on every row together with
   * `is_saved`. This used to post channel.bookmark_add with a message_id
   * guessed from key_id / id: that store is for chat messages and nothing
   * reads it back into the feed, so the button lit up, persisted nothing
   * useful, and was blank again on the next render.
   *
   * The row's button has already flipped (optimistic). The answer is checked
   * rather than trusted: a rejected POST resolves undefined (doRequest hands a
   * non-200 to onServerComplain, which only warns), so anything but the key
   * echoed back with the requested state puts the button back.
   */
  async _toggleFavorite(cmd, args = {}) {
    const item = this._findActivityItem(cmd);
    const bookmarkKey = args.bookmark_key || (item && item.mget && item.mget('bookmark_key'));
    const favorited = args.favorited ? 1 : 0;
    const button = args.button;
    this.verbose('[activity] toggle-favorite', { favorited, bookmarkKey, item_key: args.item_key });
    const setButton = (saved) => {
      if (!button || !button.el) return;
      button.el.dataset.state = saved ? '1' : '0';
      if (button.mset) button.mset(_a.state, saved ? 1 : 0);
    };
    if (!bookmarkKey) {
      this.warn('[activity] toggle-favorite skipped — no bookmark_key on row');
      setButton(!favorited);
      return;
    }
    if (item) item._bookmarkPending = 1;
    let res;
    try {
      res = await this.postService(
        favorited
          ? ((SERVICE.activity && SERVICE.activity.bookmark_add) || 'activity.bookmark_add')
          : ((SERVICE.activity && SERVICE.activity.bookmark_remove) || 'activity.bookmark_remove'),
        // ACL `scope:hub` needs a hub for the permission check; the store
        // itself is the caller's own drumate DB. Same hub get_feed uses.
        // `row` lets the server keep a snapshot so the row stays pinned on top
        // whatever feed page it sits on; it is only sent when saving.
        favorited && args.row
          ? { bookmark_key: bookmarkKey, hub_id: Visitor.id, row: args.row }
          : { bookmark_key: bookmarkKey, hub_id: Visitor.id },
      );
    } catch (e) {
      this.warn('toggle-favorite failed', e);
    }
    if (item) item._bookmarkPending = 0;
    const ok = res && res.bookmark_key === bookmarkKey
      && parseInt(res.is_saved, 10) === favorited;
    if (!ok) {
      this.warn('[activity] toggle-favorite not saved', res);
      setButton(!favorited);
      return;
    }
    // Keep the model in step so a re-render of this row before the next fetch
    // draws the saved state rather than the stale one.
    if (item && item.mset) item.mset('is_saved', favorited);
    if (favorited) this._pinFromRow(item, bookmarkKey);
    else this._unpinKey(bookmarkKey);
  }

  // ── Bookmarked rows pinned on top ────────────────────────────────
  //
  // A saved row is shown in the `saved` part above the feed, newest first, and
  // its copy in the feed is hidden (item data-twin) until it is unsaved, when
  // the copy reappears in place. Rows come from two sources:
  //  * the live feed row, whenever get_feed returned it -- true text and true
  //    read state, so it always wins;
  //  * the server snapshot (activity.bookmark_rows) for a saved row whose page
  //    is not loaded. Its read state is unknown, so it is served read, and it
  //    is not used under the Unread filter, which lists only what is still
  //    unread (the All filter does use it: it pins every saved row).
  // get_feed itself is untouched: the feed pages, their pagination and the
  // mobile client see exactly what they saw before.

  _startPinned() {
    this._pinCycle = (this._pinCycle || 0) + 1;
    this._pinnedRows = new Map();
    this._pinnedReady = false;
    this._pinnedQueue = [];
    if (this.el && this.el.dataset) this.el.dataset.savedReady = '0';
    const bucket = (this._filter && this._filter !== DEFAULT_BUCKET) ? this._filter : null;
    // Only the Unread filter goes without snapshots (they are served read). The
    // All filter runs the unread feed too but pins every saved row.
    this._pinnedFetch = this._viewFilter === 'unread' ? Promise.resolve([]) : this._fetchPinned(bucket);
  }

  async _fetchPinned(bucket) {
    try {
      const res = await this.postService(
        (SERVICE.activity && SERVICE.activity.bookmark_rows) || 'activity.bookmark_rows',
        bucket ? { hub_id: Visitor.id, bucket } : { hub_id: Visitor.id },
      );
      return _.isArray(res) ? res : (_.isArray(res && res.data) ? res.data : []);
    } catch (e) {
      this.warn('[panel_activity] bookmark_rows failed', e);
      return [];
    }
  }

  /**
   * Feed `data` hook (see onPartReady). Page 1 builds the pinned set once the
   * snapshots are in; later pages only add saved rows not pinned yet.
   * 🚨 try/catch is load-bearing, as in _stampDayHeaders: an exception here is
   * swallowed by ui-core and would leave the feed blank.
   */
  _collectPinned(list, rows) {
    try {
      if (!_.isArray(rows)) return;
      const live = rows.filter((r) => r && r.bookmark_key && parseInt(r.is_saved, 10) === 1);
      if (!list || (list._curPage || 1) <= 1) {
        const cycle = this._pinCycle;
        this._pinCollected = cycle;
        (this._pinnedFetch || Promise.resolve([])).then((snapshots) => {
          if (cycle !== this._pinCycle) return;
          const map = new Map();
          for (const r of snapshots || []) {
            if (r && r.bookmark_key) map.set(r.bookmark_key, r);
          }
          for (const r of [...live, ...(this._pinnedQueue || [])]) map.set(r.bookmark_key, { ...r });
          this._pinnedQueue = [];
          this._pinnedRows = map;
          this._pinnedReady = true;
          this._renderPinned();
          // The Bookmarked filter's empty line waits for this (skin).
          this._markHasSaved();
          if (this.el && this.el.dataset) this.el.dataset.savedReady = '1';
        });
        return;
      }
      for (const r of live) {
        if (this._pinnedRows && this._pinnedRows.has(r.bookmark_key)) continue;
        if (!this._pinnedReady) {
          this._pinnedQueue.push(r);
          continue;
        }
        this._insertPinned({ ...r });
      }
    } catch (e) {
      this.warn('[panel_activity] pinned rows failed', e);
    }
  }

  _pinnedTime(row) {
    return Number((row && (row.timestamp || row.ctime)) || 0);
  }

  _sortedPinned() {
    return [...(this._pinnedRows || new Map()).values()]
      .sort((a, b) => this._pinnedTime(b) - this._pinnedTime(a));
  }

  _pinnedModel(row) {
    const m = {
      ...row,
      is_saved: 1,
      pinned_view: 1,
      kind: 'activity_item',
      uiHandler: this,
      logicalParent: this,
    };
    // Day captions belong to the chronological feed, not to the pinned block.
    delete m.day_header;
    return m;
  }

  _renderPinned() {
    const rows = this._sortedPinned();
    // The feed restarts on every tab switch and on live updates while the
    // panel is open; re-feeding an unchanged block would only replay its
    // rows' fade-in.
    const signature = rows.map((r) => `${r.bookmark_key}:${r.is_read ? 1 : 0}:${this._pinnedTime(r)}`).join('|');
    if (signature === this._pinnedSignature) return;
    this._pinnedSignature = signature;
    const models = rows.map((r) => this._pinnedModel(r));
    this.ensurePart('saved').then((p) => {
      if (p && !p.isDestroyed()) p.feed(models);
      this._markHasSaved();
    });
  }

  // Hides the feed's "no notifications" line while pinned rows are showing
  // (skin: __ui[data-has-saved="1"]), like data-has-priority does.
  _markHasSaved() {
    if (!this.el || !this.el.dataset) return;
    this.el.dataset.hasSaved = (this._pinnedRows && this._pinnedRows.size) ? '1' : '0';
  }

  // Re-feeds the block rather than inserting at an index: ui-core's
  // Box.append(c, index) splices the WRAPPING ARRAY into the collection (an
  // empty "constructor" view) and cleanSet()s the whole part anyway. The block
  // only ever holds the saved rows, so a full feed stays cheap.
  _insertPinned(row) {
    if (!row || !row.bookmark_key) return;
    this._pinnedRows = this._pinnedRows || new Map();
    this._pinnedRows.set(row.bookmark_key, row);
    this._pinnedSignature = null;
    this._renderPinned();
  }

  // Every rendered row (pinned block and feed) carrying this bookmark key.
  _viewsWithKey(key) {
    const out = [];
    if (!key) return out;
    for (const part of [this.__saved, this.__list]) {
      if (!part || part.isDestroyed() || !part.children) continue;
      part.children.each((v) => {
        if (v && !v.isDestroyed() && v.mget && v.mget('bookmark_key') === key) out.push(v);
      });
    }
    return out;
  }

  _pinFromRow(item, key) {
    if (!item || !key) return;
    if (!item.mget('pinned_view') && item.el) item.el.dataset.twin = '1';
    const base = item._rawRow || {};
    const row = {
      ...base,
      bookmark_key: key,
      is_saved: 1,
      is_read: item.mget('is_read'),
      bucket: item.mget('bucket') || base.bucket,
    };
    if (!this._pinnedReady) {
      this._pinnedQueue = this._pinnedQueue || [];
      this._pinnedQueue.push(row);
      return;
    }
    if (this._pinnedRows && this._pinnedRows.has(key)) return;
    this._insertPinned(row);
  }

  _unpinKey(key) {
    if (!key) return;
    if (this._pinnedRows) this._pinnedRows.delete(key);
    this._pinnedSignature = null;
    this._markHasSaved();
    if (this._pinnedQueue) this._pinnedQueue = this._pinnedQueue.filter((r) => r.bookmark_key !== key);
    for (const v of this._viewsWithKey(key)) {
      if (v.mget('pinned_view')) {
        v.goodbye({ duration: 0.2, timeout: 50, now: 1 });
        continue;
      }
      // The feed copy comes back where it always was, unsaved.
      v.mset('is_saved', 0);
      if (v.el) {
        delete v.el.dataset.twin;
        const btn = v.el.querySelector('.activity-item__bookmark');
        if (btn) btn.dataset.state = '0';
      }
    }
  }

  // { key, item } when `cmd` is a saved row, else null.
  _savedItemOf(cmd) {
    const item = this._findActivityItem(cmd);
    if (!item || !item.mget || parseInt(item.mget('is_saved'), 10) !== 1) return null;
    const key = item.mget('bookmark_key');
    return key ? { key, item } : null;
  }

  // A saved row was deleted: unsave it and drop every other view of it. The
  // deleted view itself is left to _dismissActivity, which removes it.
  _forgetSaved(key, except) {
    if (this._pinnedRows) this._pinnedRows.delete(key);
    this._pinnedSignature = null;
    this._markHasSaved();
    for (const v of this._viewsWithKey(key)) {
      if (v !== except) v.goodbye({ duration: 0.2, timeout: 50, now: 1 });
    }
    this.postService(
      (SERVICE.activity && SERVICE.activity.bookmark_remove) || 'activity.bookmark_remove',
      { bookmark_key: key, hub_id: Visitor.id },
    ).catch((e) => this.warn('[activity] bookmark_remove after delete failed', e));
  }

  _dismissFromOpen(cmd, args = {}) {
    // Body-click on a row implies "I've handled this notification". Funnel
    // through `_dismissActivity` so we get the same server-side persistence
    // (UPDATE dismissed_at / advance read pointer) as the trash button.
    // Order matters: read the model + fire API BEFORE goodbye() — once
    // goodbye() runs the view is destroyed and `mget` returns undefined.
    const item = this._findActivityItem(cmd);
    if (item) {
      const p = this._dismissActivity(item, args);
      if (p && typeof p.catch === 'function') p.catch(() => { });
    }
    if (item && item.goodbye) item.goodbye({ duration: 0.3, timeout: 50, now: 1 });
  }

  /**
   * Turn a row from unread into read, in place.
   *
   * The styling already existed before this feature: item/skin/index.scss keys
   * the card fill on `&__row[data-unread="1"]`, so clearing the attribute is
   * the entire visual change and no CSS was added. The attribute lives on
   * `.activity-item__row`, a CHILD of the widget root (the skeleton puts it on
   * the inner Box.X, under a `__group` wrapper that also holds the day header),
   * which is why this searches rather than writing to cmd.el.
   *
   * The model is updated too. The DOM write is what the user sees now; `is_read`
   * is what the row skeleton reads if anything re-renders this item from its
   * model before the next fetch, and without it the tint would come back.
   *
   * Silent when the row is already gone -- a read that resolves after the list
   * restarted must not throw into the caller's catch and be logged as a failed
   * dismiss.
   */
  _markRowRead(cmd) {
    if (!cmd) return;
    try {
      if (cmd.mset) cmd.mset('is_read', 1);
      const el = cmd.el;
      if (!el || !el.isConnected) return;
      const row = el.matches && el.matches('[data-unread]') ? el : (el.querySelector && el.querySelector('[data-unread]'));
      if (row) row.dataset.unread = '0';
    } catch (e) {
      this.warn('[activity] could not mark row read', e);
    }
    // A pinned row and its hidden feed copy are the same notification: read
    // one, and the other must not come back unread when it is unsaved.
    if (!this._markingTwins && cmd.mget && parseInt(cmd.mget('is_saved'), 10) === 1) {
      this._markingTwins = 1;
      try {
        for (const v of this._viewsWithKey(cmd.mget('bookmark_key'))) {
          if (v !== cmd) this._markRowRead(v);
        }
      } finally {
        this._markingTwins = 0;
      }
    }
  }

  _decrementBadge(by = 1) {
    Desk.ensurePart('activity-count').then((p) => {
      if (!p || !p.el) return;
      const cur = parseInt(p.el.dataset.count || p.el.innerText || '0', 10) || 0;
      const next = Math.max(0, cur - by);
      const display = next > 99 ? '99+' : String(next);
      p.el.innerText = next === 0 ? '' : display;
      p.el.dataset.count = display;
    });
  }

  /**
   * Step the tab badges down for one row the user just read or trashed: the
   * row's own tab and All. Until this existed only the bell moved, so a Chat
   * badge of 2 still read 2 after both rows were opened.
   *
   * Local on purpose — a text write on two existing badges, no request and no
   * re-render. Re-fetching activity.unread_counts per click would run
   * notification_center_next (a loop over every hub) on each read. The next
   * regular refresh still replaces these numbers with the server's.
   */
  _decrementTabCount(bucket) {
    const buckets = [DEFAULT_BUCKET];
    if (bucket && bucket !== DEFAULT_BUCKET && TAB_BUCKETS.indexOf(bucket) !== -1) {
      buckets.push(bucket);
    }
    for (const b of buckets) {
      this.ensurePart(`tab-count-${b}`).then((p) => {
        if (!p || !p.el) return;
        const cur = parseInt(p.el.dataset.count || p.el.innerText || '0', 10) || 0;
        const next = Math.max(0, cur - 1);
        p.el.innerText = next > 99 ? '99+' : String(next);
        p.el.dataset.count = String(next);
        p.el.dataset.empty = next ? '0' : '1';
      });
    }
  }

  /**
   * 
   */
  // toggleState() {
  //   if (this.activityState == 0) {
  //     this.activityState = 1;
  //     // this.refreshActivity()
  //     // this.el.dataset.state = 1;
  //     // this.setState(1);
  //     return;
  //   }
  //   return this.closePanel();

  // }

  /**
   * 
   */
  // closePanel() {
  //   this.activityState = 0;
  //   // this.el.dataset.state = 0;
  //   this.setState(0);
  //   // if (!this.__content) return;
  //   // this.__content.clear();
  // }

  /**
   * 
   */
  updateactivityWindow() {
    if (!this.__content) return;
    Kind.waitFor('activity_window').then(() => {
      let notifier = this.__content.children.last();
      if (notifier && !notifier.isDestroyed()) {
        notifier.update(this.data());
        return;
      }
      this.__content.feed({
        kind: 'activity_window',
        media: this,
        activityData: this.data(), //this.data(),
        uiHandler: this,
      });
    })
  }

  /**
   * @param {Letc} cmd
   */
  deleteEntityResponse(cmd) {
    // this.updateactivityCount();
  }

  /**
   * @param  {number} count
   */
  updateactivityTitle() {
    let count = this.data().length;
    const pattern = /^\(\d+\)/;
    if (count === 0 || pattern.test(document.title)) {
      return document.title = document.title.replace(pattern, count === 0 ? '' : '(' + count + ')');
    }
    document.title = "(" + count + ") " + document.title;
  }




  /**
   * Select a Notification Center tab. `bucket` is one of TAB_BUCKETS; 'all'
   * means no scope.
   *
   * The panel shows TWO lists at once — the pinned `priority` section (rollups
   * from activity.list and friends) and the paginated smart list (get_feed) —
   * so a tab has to narrow both or the same event shows on the wrong tab.
   *
   * The old code hid the priority section outright on any tab but All, which
   * would now mean every pinned row (chat rollups, invites, meetings, access
   * requests) disappeared from the very tabs meant to show them. It is filtered
   * instead, re-rendered from the last fetched rows so switching tabs costs no
   * request.
   */
  _setTab(bucket) {
    this._filter = bucket || DEFAULT_BUCKET;
    this.updatePriorityListUnified(this._mergedRows || []);
    this.ensurePart(_a.list).then((list) => list.restart());
  }

  // ── Header Filter (All / Unread / Bookmarked) ──────────────────────
  //
  // Lexis 2026-09-28. Built on the two views the panel already had, so
  // nothing new is asked of the server:
  //  * ''         — no filter: full feed, bookmarked rows pinned on top.
  //  * unread     — exactly the old Unreads toggle ON.
  //  * all        — the unread feed with EVERY bookmarked row pinned on top
  //                 (snapshots included, read or unread).
  //  * bookmarked — the pinned block alone: the skin hides the feed and the
  //                 priority rows under data-view-filter="bookmarked". The feed
  //                 still loads its first page, whose saved rows replace their
  //                 snapshots with the live ones (true text and read state).

  // A part by name, synchronously; null while it is not rendered.
  _vfPart(name) {
    const part = this._branches && this._branches[name];
    return part && !part.isDestroyed() ? part : null;
  }

  _toggleViewFilter() {
    const popup = this._vfPart('view-filter-popup');
    if (!popup || !popup.el) return;
    if (popup.el.dataset.open === '1') return this._closeViewFilter();
    // Reopened, it shows the filter in force, not a choice left un-applied.
    popup.el.dataset.pick = this._viewFilter || VIEW_FILTERS[0];
    popup.el.dataset.open = '1';
  }

  _closeViewFilter() {
    const popup = this._vfPart('view-filter-popup');
    if (popup && popup.el) popup.el.dataset.open = '0';
  }

  _applyViewFilter(filter) {
    const next = VIEW_FILTERS.indexOf(filter) !== -1 ? filter : '';
    const button = this._vfPart('view-filter-button');
    if (button && button.el) button.el.dataset.active = next ? '1' : '0';
    const label = this._vfPart('view-filter-label');
    if (label && label.el) label.el.innerText = viewFilterLabel(next);
    if (next === this._viewFilter) return;
    this._viewFilter = next;
    if (this.el && this.el.dataset) this.el.dataset.viewFilter = next || 'none';
    this._unreadsOnly = (next === 'unread' || next === 'all') ? 1 : 0;
    return this.ensurePart(_a.list).then((list) => list.restart());
  }


  /**
   * 
   * @returns 
   */
  updateactivityCount() {
    this.updateSubactivityCount();
    this.ensurePart("activity-counter").then((p) => {
      let count = this.data().length;
      p.set({ content: count });
      if (!count) {
        p.el.hide();
      } else {
        p.el.show();
      }
      this._currentCount = count;

    })
  }

  /**
   *
   */
  updatePriorityList(invitations = [], messages = [], hubInvites = []) {
    const dismissed = this._dismissedKeys || new Set();
    const activeChats = (Wm.getItemsByKind('window_bigchat') || [])
      .filter((win) => win && !win.isDestroyed() && !win.mget(_a.minimize) && win.currentEntityId)
      .map((win) => win.currentEntityId);
    messages = messages.filter((message) => {
      if (message.category !== 'chat') return true;
      return !activeChats.includes(message.drumate_id);
    });
    let list = [];
    for (let e of invitations) {
      let f = e.firstname || ""
      let l = e.lastname || ""
      let contact = {
        ...e,
        event: 'contact.invite',
        id: e.drumate_id,
        fullname: `${f} ${l}`
      };
      e.kind = 'activity_item';
      e.contact = contact;
      e.type = "invitation";
      e.event_type = 'contact_invite';
      e.id = e.activity_id || e.id || null;
      e.item_key = `contact_invite:${e.id || e.drumate_id || ''}`;
      e.uiHandler = this;
      e.logicalParent = this;
      if (dismissed.has(e.item_key)) continue;
      list.push(e)
    }
    for (let e of hubInvites) {
      const fullname = (e.from_fullname || e.fullname || '').trim();
      const item = {
        ...e,
        kind: 'activity_item',
        type: 'hub-invitation',
        event: 'hub.invite_received',
        event_type: 'hub_invite',
        item_key: `hub_invite:${e.id || e.hub_id || ''}`,
        service: 'open-workspace-invitation',
        action: LOCALE.INVITED_YOU_TO_WORKSPACE || 'invited you to',
        link_label: e.hub_name,
        hub_id: e.hub_id,
        author_id: e.author_id,
        fullname,
        uiHandler: this,
        logicalParent: this,
      };
      if (dismissed.has(item.item_key)) continue;
      list.push(item);
    }
    for (let e of messages) {
      let f = e.firstname || ""
      let l = e.lastname || ""
      // Preserve the server-side category (chat | contact | media | teamchat | ticket)
      // so dismiss can route correctly. Default to 'chat' for legacy rows missing category.
      const category = e.category || 'chat';
      e.kind = 'activity_item';
      e.type = category;
      e.event_type = category;
      e.item_key = `${category}:${e.key_id || e.drumate_id || e.hub_id || ''}`;
      let contact = {
        ...e,
        event: 'chat.post',
        id: e.drumate_id,
        fullname: `${f} ${l}`
      };
      e.contact = contact;
      e.uiHandler = this;
      e.logicalParent = this;
      if (dismissed.has(e.item_key)) continue;
      list.push(e)
    }
    this.ensurePart('priority').then((p) => {
      if (!p) return;
      p.feed(list);
      if (this.el && this.el.dataset) {
        this.el.dataset.hasPriority = list.length ? '1' : '0';
      }
    })

  }

  async _fetchHubInvitations() {
    try {
      const rows = await this.postService(SERVICE.hub.invite_received_get, {
        hub_id: Visitor.id
      });
      if (!_.isArray(rows)) return [];
      const seen = new Set();
      const deduped = [];
      for (const row of rows) {
        const key = `${row.hub_id || ''}::${row.author_id || row.uid || ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(row);
      }
      return deduped;
    } catch (err) {
      this.warn('[panel_activity] fetch hub invitations failed', err);
      return [];
    }
  }

  /**
   * Single-fetch refresh via activity.list — the consolidated activity API.
   * Server returns one flat array containing every notification rollup
   * (chat, contact, media, teamchat, ticket, hub_invite). The badge count is
   * the sum of cnt across all undismissed rows.
   */
  // Re-fetch the chronological feed list (activity.get_feed). Called when the
  // bell is opened (desk toggle-activity) so a notification that arrived while
  // the panel was closed shows immediately — the panel is hidden, not destroyed,
  // on close, and the list is otherwise only restarted by refreshActivity WHILE
  // already open. Same restart the unread toggle uses; a cheap page-1 re-fetch
  // that respects the current filter/unread state. Safe no-op if the list part
  // isn't mounted yet (first open renders it fresh anyway).
  refreshFeed() {
    return this.ensurePart(_a.list).then((list) => {
      if (list && list.restart && !list.isDestroyed()) list.restart();
    });
  }

  /**
   * Per-workspace unread counts for the desk rail (see ./hub-counts), computed
   * from the rows refreshActivity already holds — no request of its own.
   * Kept on the panel too, so a listener that mounts later can read the last
   * value off window.ActivityHandler instead of waiting for the next refresh.
   */
  _publishHubCounts() {
    try {
      this._hubCounts = hubCounts(this._mergedRows, this._railSeenMarks(), this._filesByHub);
      RADIO_BROADCAST.trigger('workspace-unread', this._hubCounts);
    } catch (e) {
      this.warn('[panel_activity] hub counts failed', e);
    }
  }

  /**
   * Per-workspace "tab opened over" marks for the rail's Task / Meet pills
   * (see hub-counts.js): { [hub_id]: { task, meeting } }, server row times.
   * Kept per user in localStorage so a reload does not bring back what was
   * already looked at. Storage can throw or be empty (private window,
   * blocked site data) — then the marks live for the session only.
   */
  _railSeenKey() {
    return `drumee.rail-seen.${Visitor.id}`;
  }

  /** The Files marks alone, { [hub_id]: ts }, for unread_counts `files_since`. */
  _filesSinceMarks() {
    const out = {};
    const marks = this._railSeenMarks();
    for (const hub of Object.keys(marks)) {
      const t = Number(marks[hub] && marks[hub].files) || 0;
      if (t > 0) out[hub] = t;
    }
    return out;
  }

  _railSeenMarks() {
    if (this._railSeen) return this._railSeen;
    let marks = {};
    try {
      const raw = window.localStorage && window.localStorage.getItem(this._railSeenKey());
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object') marks = parsed;
    } catch (e) {
      marks = {};
    }
    this._railSeen = marks;
    return marks;
  }

  /**
   * The Task, Meeting or Files tab of a workspace is on screen (window_folder
   * showFolderTab, or the desk while it stays there): everything of that
   * kind that exists NOW is seen, so its rail pill clears; a newer row counts
   * again. Only moves forward, and republishes only on a change, so the desk
   * re-asking on every count update cannot loop.
   * @param {Object} args { hub_id, tab: 'task' | 'meeting' | 'files' }
   */
  _onWorkspaceTabSeen(args = {}) {
    const hub = args && args.hub_id != null ? String(args.hub_id) : null;
    const kind = args && ['task', 'meeting', 'files'].includes(args.tab) ? args.tab : null;
    if (!hub || !kind) return;
    const t = latestTime(this._mergedRows, hub, kind, this._filesByHub);
    if (!t) return;
    const marks = this._railSeenMarks();
    const cur = marks[hub] || {};
    if ((Number(cur[kind]) || 0) >= t) return;
    marks[hub] = { ...cur, [kind]: t };
    try {
      if (window.localStorage) window.localStorage.setItem(this._railSeenKey(), JSON.stringify(marks));
    } catch (e) { }
    this._publishHubCounts();
  }

  /**
   * A workspace team chat was just read in this client (widget_chat
   * markConversationRead). Its teamchat rollups are gone on the server, but
   * this socket never hears its own channel.acknowledge, so drop them here —
   * the Chat pill clears at once instead of on the next refresh.
   * @param {Object} args { hub_id }
   */
  _onWorkspaceChatRead(args = {}) {
    const hub = args && args.hub_id != null ? String(args.hub_id) : null;
    if (!hub || !_.isArray(this._mergedRows)) return;
    const before = this._mergedRows.length;
    this._mergedRows = this._mergedRows.filter(
      (r) => !(r && r.category === 'teamchat' && String(r.hub_id) === hub),
    );
    if (this._mergedRows.length !== before) this._publishHubCounts();
  }

  /**
   * Somebody outside the panel knows a notification just arrived that the
   * panel's own WS cases do not cover (room.scheduled is consumed by
   * wm/push.js for its toast). Coalesced like the chat path: one refresh per
   * burst, since a booking pushes once per invitee socket.
   */
  _onRefreshRequest() {
    if (this._refreshRequestTimer) return;
    this._refreshRequestTimer = setTimeout(() => {
      this._refreshRequestTimer = null;
      if (this.isDestroyed && this.isDestroyed()) return;
      this.refreshActivity();
    }, 1000);
  }

  /**
   * A row was read or trashed in the panel: take it out of the rail counts
   * straight away (the bell and tab badges are decremented the same way).
   * Keyed on the row's item_type, never on a bare id: a changelog id and a
   * contact_activity id live in different tables and can be equal.
   *   contact_invite — task / meeting rows, by contact_activity id
   *   teamchat       — the rollup of one workspace folder, by hub + nid
   */
  _forgetHubRow(cmd, args = {}, itemType, activityId) {
    if (!_.isArray(this._mergedRows)) return;
    const get = (k) => (args[k] != null ? args[k] : (cmd && cmd.mget ? cmd.mget(k) : null));
    let keep;
    if (itemType === 'contact_invite') {
      const ids = new Set(
        [activityId, get('key_id'), get('id'), get('last_id')]
          .filter((v) => v != null && v !== '')
          .map(String),
      );
      if (!ids.size) return;
      keep = (r) => !(r && r.category === 'contact_invite' && ids.has(String(r.key_id)));
    } else if (itemType === 'teamchat') {
      const hub = get('hub_id');
      if (hub == null) return;
      const nid = String(get('nid') || '');
      keep = (r) => !(r && r.category === 'teamchat'
        && String(r.hub_id) === String(hub) && String(r.nid || '') === nid);
    } else {
      return;
    }
    const before = this._mergedRows.length;
    this._mergedRows = this._mergedRows.filter(keep);
    if (this._mergedRows.length !== before) this._publishHubCounts();
  }

  async refreshActivity(timeout = 2000) {
    if (!Visitor.id || !Visitor.isOnline()) {
      Visitor.once('online', () => {
        this.refreshActivity();
      })
      return
    }
    let items = [];
    try {
      const res = await this.postService({
        service: (SERVICE.activity && SERVICE.activity.list) || 'activity.list',
        hub_id: Visitor.id,
      });
      items = _.isArray(res) ? res : (_.isArray(res?.data) ? res.data : []);
    } catch (e) {
      this.warn('[panel_activity] activity.list failed, falling back', e);
      items = [];
    }
    const dismissed = this._dismissedKeys || new Set();
    const live = items.filter((it) => {
      const key = `${it.category}:${it.key_id || it.drumate_id || it.hub_id || ''}`;
      if (dismissed.has(key)) {
        const dismissedAt = this._dismissedLastIds && this._dismissedLastIds.get(key);
        if (it.last_id && Number(it.last_id) > Number(dismissedAt || 0)) {
          dismissed.delete(key);
          if (this._dismissedLastIds) this._dismissedLastIds.delete(key);
          return true;
        }
        return false;
      }
      return true;
    });
    // Badge reflects the number of distinct notification rows the user
    // sees (one per grouped category × peer × hub), NOT the total event
    // count `cnt` accumulated inside each group. Otherwise "Tran sent 3
    // messages" + "Snake invited you" would render as 1 list row with
    // badge=4 — confusing. Matches Gmail/Slack convention.
    // Pending secure-share access requests addressed to this user (Figma 62).
    // Fetched separately from the persisted secure_share_access_request table and
    // merged in — keeps the shared activity feed proc untouched. Guarded so a
    // failure never affects the rest of the notification list.
    let accessReqs = [];
    try {
      const ar = await this.postService({
        service: (SERVICE.secure_share && SERVICE.secure_share.list_requests) || 'secure_share.list_requests',
        hub_id: Visitor.id,
      });
      const rows = _.isArray(ar) ? ar : (_.isArray(ar?.data) ? ar.data : []);
      // Skip rows the sender trashed this session (item_key = access_request:<id>),
      // so a snoozed pending request doesn't immediately re-appear on the next refresh.
      const dismissed = this._dismissedKeys || new Set();
      accessReqs = rows
        .filter((r) => !dismissed.has(`access_request:${r.request_id}`))
        .map((r) => ({
          ...r,
          category: 'access_request',
          key_id: r.request_id,
          last_id: r.ctime,
          // These rows come from secure_share.*, not from activity.*, so the
          // server never stamped a bucket on them. An access request is always
          // Other — fixed by construction, exactly like the `category` above,
          // and it matches what bucketOf returns for category 'access_request'.
          bucket: 'other',
        }));
    } catch (e) {
      this.warn('[panel_activity] secure_share.list_requests failed', e);
    }
    // Share-open notifications ("{email} opened {folder}") are no longer pinned
    // here — they now flow through activity.get_feed as ordinary, toggle-aware,
    // persistently-dismissable feed events (the server merges secure_share_open_feed
    // into the feed). Keeping them out of the pinned section is the whole point of
    // that move, so do NOT re-add an open-notifications fetch here.
    // Task @-mentions live in channel.list_notifications (type='mention'), NOT in
    // activity.list — so without merging them here the badge + default feed never
    // show them. Keep only event==='task_mention' rows: p2p mentions are already
    // represented by the 'chat' rollup from activity.list and would double-count.
    // category 'contact_invite' + key_id=id routes dismiss through
    // activity.dismiss_contact_event (same as the Mentions tab).
    let taskMentions = [];
    try {
      const tm = await this.postService({
        service: (SERVICE.channel && SERVICE.channel.list_notifications) || 'channel.list_notifications',
        hub_id: Visitor.id,
        type: 'mention',
        // Pinned to 1, deliberately NOT this._unreadsOnly. These rows are never
        // rendered -- updatePriorityListUnified keeps only access_request -- and
        // exist purely to feed the bell badge, which counts UNREAD only. Passing
        // the toggle here made the badge include already-read task mentions the
        // moment the panel's default flipped to showing read rows.
        unread_only: 1,
      });
      const rows = _.isArray(tm) ? tm : (_.isArray(tm?.data) ? tm.data : []);
      const dismissedTm = this._dismissedKeys || new Set();
      taskMentions = rows
        .filter((r) => r && r.event === 'task_mention')
        .filter((r) => !dismissedTm.has(`contact_invite:${r.id}`))
        .map((r) => ({
          ...r,
          category: 'contact_invite',
          key_id: String(r.id),
          last_id: r.id,
          // channel.list_notifications does not stamp buckets. These rows are
          // filtered to event === 'task_mention' just above, so they are always
          // Task — the same answer bucketOf gives for that event. Set explicitly
          // because the synthetic 'contact_invite' category assigned here (needed
          // for dismiss routing) would otherwise read as Other.
          bucket: 'task',
        }));
    } catch (e) {
      this.warn('[panel_activity] task mention fetch failed', e);
    }
    // Task assignments and watched-column create/move events share this endpoint.
    // Both are contact_activity rows, so category contact_invite routes dismissal
    // through activity.dismiss_contact_event.
    let taskNotifications = [];
    try {
      const ta = await this.postService({
        service: (SERVICE.activity && SERVICE.activity.list_task_assignments) || 'activity.list_task_assignments',
        hub_id: Visitor.id,
      });
      const rows = _.isArray(ta) ? ta : (_.isArray(ta?.data) ? ta.data : []);
      const dismissedTa = this._dismissedKeys || new Set();
      taskNotifications = rows
        // meeting_notice rides this endpoint too (see list_task_assignments):
        // without it the bell badge would under-count and read lower than the
        // Meeting tab's own badge. Nothing here is RENDERED — the pinned section
        // below keeps only access requests — so this only feeds the count.
        .filter((r) => r && ['task_assigned', 'task_column_change', 'meeting_notice'].includes(r.event))
        .filter((r) => !dismissedTa.has(`contact_invite:${r.id}`))
        .map((r) => ({
          ...r,
          category: 'contact_invite',
          key_id: String(r.id),
          last_id: r.id,
          // The server stamps this bucket; the fallback covers the rollout window
          // where this UI is live against a server that predates it. The default
          // is per event, not a blanket 'task' — a meeting notice defaulting to
          // Task would show a meeting under the wrong tab.
          bucket: r.bucket || (r.event === 'meeting_notice' ? 'meeting' : 'task'),
        }));
    } catch (e) {
      this.warn('[panel_activity] task assignment fetch failed', e);
    }
    const merged = accessReqs.concat(taskMentions, taskNotifications, live);

    // Kept so switching tabs can re-filter the pinned section without refetching.
    this._mergedRows = merged;
    // Same rows, per workspace, for the desk rail's Chat / Task / Meet pills.
    this._publishHubCounts();
    // The bell comes from activity.unread_counts' `all` (see _renderTabCounts),
    // so it can never disagree with the tab badges. `merged` is only the
    // FALLBACK for when that request fails: it holds access requests, task
    // mentions/assignments and the rollups, but no file notifications, so on its
    // own it under-counts.
    //
    // Fired from the .then rather than before it, deliberately: triggering both
    // made the bell paint the low number and then correct itself a moment later
    // (measured 2 -> 8). Not awaited, so nothing below is delayed.
    this._renderTabCounts().then((ok) => {
      if (ok) return;
      RADIO_BROADCAST.trigger('activity-update', { unread_count: merged.length });
    });
    this.updatePriorityListUnified(merged);
    if (!this.mget(_a.state)) return;
    if (this.__list && !this.__list.isDestroyed()) {
      this.__list.restart()
      return
    }
    this.feed(require('./skeleton')(this));
  }

  /**
   * Render the priority section directly from the unified activity.list output.
   * Each item already carries `category`, `key_id`, `hub_id`, `last_id`, etc.
   * so we can build activity_item models without category-specific branches.
   */
  updatePriorityListUnified(items = []) {
    const activeChats = (Wm.getItemsByKind('window_bigchat') || [])
      .filter((win) => win && !win.isDestroyed() && !win.mget(_a.minimize) && win.currentEntityId)
      .map((win) => win.currentEntityId);
    // Dedupe contact rows by peer — server returns both the invite and the
    // post-accept "informed" row; prefer the accepted one.
    const seenContactPeers = new Map();
    const dedupedItems = [];
    for (const it of items) {
      if (it.category === 'contact') {
        const peerKey = String(it.drumate_id || it.key_id || it.email || '');
        if (peerKey) {
          const existingIdx = seenContactPeers.get(peerKey);
          if (existingIdx !== undefined) {
            const existing = dedupedItems[existingIdx];
            const incomingAccepted = it.status === 'informed';
            const existingAccepted = existing.status === 'informed';
            if (incomingAccepted && !existingAccepted) dedupedItems[existingIdx] = it;
            continue;
          }
          seenContactPeers.set(peerKey, dedupedItems.length);
        }
      }
      dedupedItems.push(it);
    }
    const list = [];
    for (const it of dedupedItems) {
      // Everything except pending access-requests is no longer pinned here: the
      // server now interleaves the rollups (chat/media/teamchat/contact/ticket +
      // hub-invites + refused) AND the task @-mention / assignment notifications
      // chronologically into the activity feed (activity.get_feed), so the panel
      // shows one single time-sorted list (product request). Rendering any of
      // them in this pinned box too would double-show them. Only a pending
      // secure-share access request stays pinned (it's actionable — approve/deny
      // — with a lasting state). Live meeting invites are added separately below
      // (this._meetingItems). The unread badge is unchanged: refreshActivity
      // still fetches all of these (activity.list / list_task_assignments /
      // channel.list_notifications) for the count — this filter only changes what
      // renders in the pinned section.
      if (it.category !== 'access_request') continue;
      if (it.category === 'chat' && activeChats.includes(it.drumate_id)) continue;
      const e = { ...it };
      e.kind = 'activity_item';
      e.event_type = it.category;
      e.type = it.category;
      // item_type drives the dismiss routing in _dismissActivity: without it
      // every row falls back to 'mfs' and persists nothing on hub_invite / chat
      // / teamchat / etc. Keep this in sync with the category column.
      e.item_type = it.category;
      e.item_key = `${it.category}:${it.key_id || it.drumate_id || it.hub_id || ''}`;
      switch (it.category) {
        case 'hub_invite':
          e.event = 'hub.invite_received';
          // e.service = 'open-workspace-invitation';
          e.action = LOCALE.INVITED_YOU_TO_WORKSPACE || 'invited you to';
          e.link_label = it.hub_name;
          e.fullname = (it.surname || `${it.firstname || ''} ${it.lastname || ''}`).trim();
          break;
        case 'contact':
          // e.service = 'open-contact';
          e.event = (it.status === 'informed') ? 'contact.accept_informed' : 'contact.invite';
          e.status = it.status;
          e.fullname = (it.surname || `${it.firstname || ''} ${it.lastname || ''}`).trim();
          break;
        case 'contact_refused':
          e.event = 'contact.invite_refuse';
          e.fullname = (it.surname || `${it.firstname || ''} ${it.lastname || ''}`).trim();
          break;
        case 'access_request':
          // Secure-share access request addressed to this user (Figma 62).
          // Clicking opens the approve popup (handled in onUiEvent). The click
          // service is set on the row in the item skeleton (not on the model) so
          // it doesn't shadow the per-button services (bookmark/trash).
          e.event   = 'secure_share.access_requested';
          // Figma 62: "…is requesting Download access to <folder>". Weave the
          // requested level into the phrase; fall back to the plain wording.
          {
            const LV = {
              can_download: LOCALE.SECURE_SHARE_CAN_DOWNLOAD,
              can_chat    : LOCALE.SECURE_SHARE_CAN_CHAT,
              can_edit    : LOCALE.SECURE_SHARE_CAN_EDIT,
            };
            // requested_level is a SET (comma-list) — join the level labels.
            const lvls = String(it.requested_level || '').split(',').map(s => s.trim())
              .filter(Boolean).map(l => LV[l]).filter(Boolean);
            e.action = lvls.length
              ? LOCALE.SECURE_SHARE_REQUESTING_LEVEL_ACCESS.replace('{level}', lvls.join(', '))
              : LOCALE.SECURE_SHARE_REQUESTING_ACCESS;
          }
          // Prefer the shared node's own name (e.g. "vb") over the workspace root.
          e.link_label = it.node_name || it.workspace_name;
          e.sender     = it.requester_email;
          e.fullname   = it.requester_email;
          break;
        // share_open is intentionally NOT handled here anymore: share-open
        // notifications now render as ordinary activity.get_feed rows (unpinned),
        // mapped by the item skeleton's own 'share_open' case. See refreshActivity.
        // case 'media':
        //   e.service = 'open-folder';
        //   break;
        // case 'teamchat':
        //   e.service = 'open-channel';
        //   break;
        // case 'ticket':
        //   e.service = 'open-ticket';
        //   break;
        // default:
        //   e.service = 'open-chat';
      }
      e.uiHandler = this;
      e.logicalParent = this;
      list.push(e);
    }
    const dismissed = this._dismissedKeys || new Set();
    const meetingItems = (this._meetingItems || []).filter(m => !dismissed.has(m.item_key));
    let combined = [...meetingItems, ...list];
    // Narrow the pinned section to the selected tab. Today that means access
    // requests appear under Other and live meeting rows under Meeting; on 'All'
    // nothing is filtered, which is the pre-existing behaviour.
    //
    // A row with no bucket is KEPT rather than dropped: every producer stamps one
    // (server-side for activity.*, by construction for the client-built rows), so
    // a missing bucket means an unforeseen source — and showing it on the wrong
    // tab is a far smaller failure than making a notification unreachable.
    if (this._filter && this._filter !== DEFAULT_BUCKET) {
      combined = combined.filter((row) => !row || !row.bucket || row.bucket === this._filter);
    }
    this.ensurePart('priority').then((p) => {
      if (!p) return;
      p.feed(combined);
      if (this.el && this.el.dataset) this.el.dataset.hasPriority = combined.length ? '1' : '0';
    });
  }

  /**
   * 
  */
  resync(timeout = 2000) {
    if (document.hidden) return;
    this.refreshActivity()
  }



  /**
   * 
   * @param {*} service 
   * @param {*} data 
   * @param {*} options 
   */
  onWsMessage(args) {
    let { service, data, options } = args
    if (!data) return;
    if (!_.isArray(data)) {
      data = [data]
    }
    switch (options.service) {
      case "conference.start":
        this._addMeetingNotification(data[0] || data);
        break;
      case "contact.invite":
      case "hub.invite_received":
        this.refreshActivity()
        this.shouldNofity();
        break;
      case "task.assigned":
        // Live push when the caller is newly assigned to a task — refresh so the
        // notification appears in the feed without waiting for the next open.
        this.refreshActivity()
        this.shouldNofity();
        break;
      case "contact.invite_accept":
      case "contact.accept_informed":
        // Mark the peer dismissed before refreshing — activity.list still
        // includes pending 'informed' rows and would re-render the old
        // "wants to connect" line otherwise.
        this._dismissedKeys = this._dismissedKeys || new Set();
        for (const row of data) {
          const peerId = row && (row.drumate_id || row.uid || row.email);
          if (peerId) this._dismissedKeys.add(`contact:${peerId}`);
        }
        if (this.timer) {
          clearTimeout(this.timer);
          this.timer = null;
        }
        this.refreshActivity();
        this.shouldNofity();
        break;
      case "contact.invite_refuse":
        this.refreshActivity();
        break;
      case "share.track_event":
        // A secure-share access request just arrived for this user — refresh so
        // the notification appears in real time (Figma 62), without reopening.
        if (data.some((d) => d && d.event === 'secure_share_access_requested')) {
          this.refreshActivity();
          this.shouldNofity();
        }
        break;
      case "messages.read":
        this._buildactivities(data);
        this.updateactivityCount();
        if (this.activityState) {
          this.updateactivityWindow(data)
        }
        break;
      case "chat.post":
      case "channel.post":
        this._currentPayload = { data, options };
      case "activity.resync":
      case "drumate.activity_remove":
      case "channel.acknowledge":
      case "chat.acknowledge":
      case "contact.delete_contact":
      case "media.remove":
      case "media.new":
      case "media.workspace_move":
      case "task.column_change":
      // Task @-mention (server task._notifyMentions pushes options.service='task.mention').
      // Same debounced refresh as the chat/channel mention path — refreshActivity now
      // also pulls channel.list_notifications, where task mentions live.
      case "task.mention":
        if (this.timer) return;
        this.timer = setTimeout(() => {
          this.refreshActivity();
          this.shouldNofity();
          this.timer = null;
        }, 1000);
        break;
    }
  }

  /**
   * 
   * @param {*} r 
   * @returns 
   */
  _getKey(r) {
    if (!r) return null;
    let key = r.key_id;
    if (!key && r.entity && r.entity.contact_id) {
      key = r.entity.contact_id;
    } else {
      key = r.hub_id;
    }
    return key;
  }
  /**
   * 
   */
  _buildactivities(data) {
    return data;
  }


  /**
   * 
   */
  _addactivitys(data, k) {
    if (!this.summary[k]) {
      this.warn(`_addactivitys: unknown category "${k}"`);
      return;
    }
    for (let r of data) {
      let key = this._getKey(r);
      if (!key) {
        continue;
      }
      let item = this.details[key];
      if (!item) {
        if (!r.content) {
          r.content = {}
          r.cnt = 1;
          r.content[k] = {
            cnt: 1,
            ctime: Dayjs().valueOf()
          }
        }
        this.summary[k][key] = r;
      } else {
        let { content } = item;
        if (content && content[k] && content[k].cnt) {
          item.content[k].cnt += content[k].cnt;
        } else {
          if (!item.content) {
            item.content = {};
          }

          item.content[k] = {
            cnt: 1,
            ctime: Dayjs().valueOf()
          }
        }
        if (!this.summary[k][key]) {
          this.summary[k][key] = item;
        }
      }
      this.details[key] = item;
    }
  }

  /**
   * 
   */
  _removeactivitys(data, k) {
    if (!this.summary[k]) {
      this.warn(`_removeactivitys: unknown category "${k}"`);
      return;
    }
    for (let r of data) {
      let key = this._getKey(r);
      if (!key) {
        this.warn("_removeactivitys: no key");
        continue;
      }
      let item = this.details[key];
      if (!item) {
        this.warn("_removeactivitys: pending activity");
        continue;
      } else {
        let { content } = item;
        if (content && content[k] && content[k].cnt) {
          item.content[k].cnt -= 1;
        }
        if (!item.content[k].cnt) {
          delete item.content[k];
          delete this.summary[k][key];
        }
      }
      this.details[key] = item;
    }

  }
  /**
   *
   */
  _addMeetingNotification(data) {
    if (!data) return;
    const hub_id = data.hub_id;
    if (!hub_id) return;
    const key = `meeting:${hub_id}`;
    this._meetingItems = (this._meetingItems || []).filter(m => m.item_key !== key);
    this._meetingItems.unshift({
      ...data,
      kind: 'activity_item',
      category: 'meeting',
      type: 'meeting',
      event_type: 'meeting',
      item_type: 'meeting',
      item_key: key,
      // Client-built row (WS conference.start), so nothing stamped a bucket on
      // it. Always Meeting — the same answer bucketOf gives for category
      // 'meeting'. Without it the row would be filtered out of the Meeting tab.
      bucket: 'meeting',
      // NOTE: do NOT set a model-level `service` here. The item's onUiEvent
      // resolves `args.service || this.get('service') || cmd.get('service')`, so
      // a model `service` would SHADOW the per-element service and every click
      // (row + green button) would resolve to it. The two triggers carry their
      // own services in the skeleton — the row text = 'open-meeting-chat' (open
      // the folder chat), the green button = 'join-meeting' (join the call) —
      // so leaving this unset lets each element route correctly.
      timestamp: Math.floor(Date.now() / 1000),
      uiHandler: this,
      logicalParent: this,
    });
    this.refreshActivity(0);
  }

  /**
   *
   */
  _notify(data = {}) {
    let opt = data[0] || data;
    let meeting;
    // Captured BEFORE the switch: the MEETING:start branch below REWRITES
    // opt.message into "X joined the meeting Y", so by the time the chat card
    // is decided the "[[MEETING:" marker is gone and testing opt.message there
    // would let a meeting card through as a chat message.
    const rawMessage = String(opt.message || "");
    // NOTE: the `!window.Notification` bail-out used to stand here. It now
    // sits just above the permission checks that actually need it (nothing
    // between here and there touches Notification), so the in-app chat card
    // still appears in a browser with no Notification API — and, more to the
    // point, when the user has denied OS notifications. Moving it is what
    // makes the card independent of a permission it has nothing to do with.
    const now = Date.now();
    this.debug("AAA:766", data)
    let url = `#/desk/wm`;
    const { message_id, hub_id, nid, message, peer_id } = opt;
    switch (data.service) {
      case SERVICE.chat.post:
        url = `${url}/chat/?message_id=${message_id}&drumate_id=${peer_id}&ts=${now}`
        break;
      case SERVICE.channel.post:
        if (/MEETING:end/.test(opt.message)) return;
        if (/MEETING:start/.test(opt.message)) {
          meeting = opt.message.replace(/(^\[\[MEETING:(start):)|(\]\]$)/, '')
          meeting = meeting.replace(/(\]\]$)/, '')
          try {
            meeting = JSON.parse(meeting)
            // `meeting.by` may be "" (poster's profile not loaded yet) or a raw
            // email frozen by an older client — prefer the sender name the
            // server stamps on every channel.post payload so the notification
            // never shows a blank or an email address.
            const senderName =
              (meeting.by && !`${meeting.by}`.includes('@') && meeting.by) ||
              [opt.firstname, opt.lastname].filter(Boolean).join(' ') ||
              meeting.by || ''
            // "started", not "joined": this card is only ever posted by the
            // person who opened the room.
            opt.message = senderName
              ? LOCALE.X_STARTED_A_MEETING.format(senderName)
              : LOCALE.MEETING_STARTED
            const { hub_id, nid } = meeting;
            // Land on the card, NOT in the call. The old `/meeting/?nid=` link
            // routes to open-node + start_meeting, i.e. it JOINS the room — and
            // an OS notification can be clicked hours later (or reached again
            // with Back), when the meeting is over: the clicker then sat alone
            // in an empty room and, as its first joiner, "started a meeting"
            // for the whole workspace. The card shows whether the meeting is
            // still live and carries its own Join button.
            if (hub_id && nid) {
              url = `${url}/open/?hub_id=${hub_id}&nid=${nid}&filetype=folder&activeTab=${_a.chat}&message_id=${message_id}&ts=${now}`
            } else if (hub_id) {
              url = `${url}/channel/?hub_id=${hub_id}&ts=${now}`
            }
          } catch (e) {
            this.warn("Failed to parse", meeting)
          }
        } else if (nid) {
          // Folder-scoped post (payload carries the folder nid): open that
          // folder on its Chat tab so the notification lands in the conversation
          // it came from — matching the Mentions-tab item. Hub-level posts have
          // no nid and fall through to the workspace root via wm/channel.
          url = `${url}/open/?hub_id=${hub_id}&nid=${nid}&filetype=folder&activeTab=${_a.chat}&message_id=${message_id}&ts=${now}`
        } else {
          url = `${url}/channel/?hub_id=${hub_id}&nid=${nid}&ts=${now}`
        }
        break;
    }
    // Round 3 Phase 2 — the in-app chat card. Placed here, after the switch
    // has resolved `url` and taken its early exits (a MEETING:end post returns
    // above and never reaches this line), but BEFORE every OS-notification
    // guard below: the card is not an OS notification and must not inherit its
    // permission state or its 5 s self-throttle. Its own "replace and restart
    // the 30 s timer" rule is what paces it.
    //
    // Chat only, matched on the two services the switch above handles —
    // never files, task or other. A meeting card posted into a folder chat
    // arrives as channel.post too, and is excluded: the meeting popup is the
    // surface for that, and this would be a second card saying the same thing.
    if (
      (data.service === SERVICE.chat.post || data.service === SERVICE.channel.post) &&
      !/\[\[MEETING:/.test(rawMessage) &&
      !/^meeting\./.test(String(opt.message_type || ""))
    ) {
      showChatToast(this, opt, url);
    }

    if (!window.Notification) return;
    if (Notification.permission === "denied") return;
    if (Notification.permission === "default" && this._permission_asked) return;

    if ((now - this._last_notified) < 5000) return;
    this._last_notified = now;

    const title = opt.firstname || LOCALE.NEW_MESSAGE;
    const notif = {
      body: opt.message || "",
      icon: Visitor.avatar(opt.author_id),
    };

    const fire = () => {
      const n = new Notification(title, notif);
      n.onclick = () => {
        window.focus();
        location.hash = url
      };
      Visitor.playSound(_K.notifications.drip, 0);
    };

    if (Notification.permission === "granted") {
      fire();
      return;
    }

    this._permission_asked = true;
    Notification.requestPermission().then(permission => {
      if (permission === "granted") fire();
    });
  }

  /**
 * 
 */
  shouldNofity(delegate = 0) {
    let { options, data } = this._currentPayload;
    if (!options || !options.sender || _.isEmpty(data)) return;
    let content = data[0] || data;
    setTimeout(() => {
      this._currentPayload = {};
      this._lastSender = null;
    }, Visitor.timeout(5000));
    let sender = options.sender;
    let author_id = content.author_id || sender.uid || sender.id;
    if (!author_id) return;
    if (author_id == this._lastSender || author_id == Visitor.id) return;
    this._lastSender = author_id;
    let preview = content.message || options.service || content.action || options.action;
    if (preview) {
      if (preview.length > 60) {
        preview = preview.substring(0, 60) + '...';
      }
    }
    const title = sender.fullname || sender.firstname;
    let body = preview || "";
    const notif = {
      body,
      icon: Visitor.avatar(author_id)
    };
    if (delegate) {
      notif.title = title;
      return notif;
    }
    this.debug("AAA:911", options)
    if (_.isArray(data)) {
      this._notify({ ...data[0], service: options.service })
    } else {
      this._notify({ ...data, service: options.service })
    }
  }

  /**
   * 
   */
  updateSubactivityCount() {
    let res = {
      totalChatCount: 0,
      contactChatCount: 0,
      teamChatCount: 0,
      supportCount: 0,
      tags: {}
    }

    for (let item of this.data()) {
      if (item.tag_id) {
        if (_.isString(item.tag_id)) {
          item.tag_id = item.tag_id.split(',');
        }
        item.tag_id.forEach((r) => {
          res.tags[r] = (res.tags[r]) ? res.tags[r] + 1 : 1;
        })
      }
    }

    for (let k in this.summary) {
      res[k] = _.keys(this.summary[k]).length;
      res[CATEGORIES[k]] = res[k];
      res.totalChatCount += _.keys(this.summary[k]).length;
    }
    this.updateactivityTitle();
    res.allConversationsCount = res.contactChatCount + res.teamChatCount;
    RADIO_BROADCAST.trigger('activity:counts', res);
    RADIO_BROADCAST.trigger('activity:details', this.details);
    RADIO_BROADCAST.trigger('activity:summary', this.summary);
    this.shouldNofity();
    return res;
  }

  /**
   * 
   */
  data() {
    if (!this.details) return [];
    return _.values(this.details) || []
  }

  /**
   * Acting on one notification row.
   *
   * `mode` is the whole point of this function since 2026-08-28. The two
   * actions used to be one: a body click and the trash button both landed here
   * and both removed the row, which is what Lexis asked to stop.
   *
   *   'read'   — the user opened it. Persist the read state, drop the unread
   *              tint, decrement the badge, and LEAVE THE ROW IN PLACE.
   *   'delete' — the trash button. Persist a permanent deletion and remove the
   *              row, as before.
   *
   * Both modes walk the identical routing and key-resolution below, because the
   * two actions differ only in which endpoint they call and whether the row
   * survives. Splitting them into separate functions would have duplicated
   * ninety lines of per-category key resolution, and the copy that drifted
   * would have been the one nobody was testing.
   */
  async _dismissActivity(cmd, args = {}, mode = 'delete') {
    const read = mode === 'read';
    const itemKey = args.item_key
      || (cmd && cmd.mget && cmd.mget('item_key'));
    const itemType = args.item_type
      || (cmd && cmd.mget && cmd.mget('item_type'))
      || 'mfs';
    const changelogId = args.changelog_id
      || (cmd && cmd.mget && (cmd.mget('changelog_id') || cmd.mget(_a.id) || cmd.mget('id')));
    this.verbose('[activity] dismiss', { itemType, itemKey, changelogId });

    // Client-side hiding is for DELETE only. _dismissedKeys makes refreshActivity
    // skip the row for the rest of the session; applying it on read would hide
    // the very row that is now meant to stay, undoing the feature at the first
    // background refresh.
    if (itemKey && !read) {
      this._dismissedKeys = this._dismissedKeys || new Set();
      this._dismissedKeys.add(itemKey);
      const lastId = args.last_id
        || (cmd && cmd.mget && cmd.mget('last_id'))
        || 0;
      this._dismissedLastIds = this._dismissedLastIds || new Map();
      this._dismissedLastIds.set(itemKey, Number(lastId));
    }
    // Only an UNREAD row was ever counted, so only an unread row may decrement.
    //
    // This guard is new with the read/delete split and it is not defensive
    // padding: a read row now STAYS in the list and stays clickable, so a user
    // who opens the same notification twice used to walk the badge down once
    // per click. The same applies to trashing something already read. `is_read`
    // is absent on live rollups and on client-built rows, which are unread by
    // construction, so an absent flag counts as unread.
    const wasUnread = !(cmd && cmd.mget && parseInt(cmd.mget('is_read'), 10) === 1);
    if (wasUnread) {
      this._decrementBadge(1);
      this._decrementTabCount(cmd && cmd.mget && cmd.mget('bucket'));
      this._forgetHubRow(cmd, args, itemType, changelogId);
    }

    if (itemType === 'access_request') {
      // Pending secure-share request: no server-side dismiss endpoint (resolved via
      // approve/deny). Client-only — its key is tracked in _dismissedKeys above so
      // refreshActivity skips it this session; it reappears only on a full reload.
      if (!read && cmd && cmd.goodbye) cmd.goodbye();
      return;
    }

    if (itemType === 'share_open') {
      // Both actions address the same (token + recipient) group, scoped
      // server-side to the caller's own shares. They differ only in which marker
      // they write:
      //   read   -> creator_seen_at    ("I have looked at this"); the row stays
      //   delete -> creator_deleted_at (the trash button); the row goes for good
      // Until 2026-08-28 there was only the first, and because the panel opened
      // unread-only, marking seen LOOKED like deleting. Now that read rows stay,
      // the two need separate markers.
      const tokenId = args.token_id || (cmd && cmd.mget && cmd.mget('token_id'));
      const recipientEmail = (args.recipient_email != null)
        ? args.recipient_email
        : (cmd && cmd.mget && cmd.mget('recipient_email'));
      const svc = read
        ? ((SERVICE.secure_share && SERVICE.secure_share.mark_open_seen) || 'secure_share.mark_open_seen')
        : ((SERVICE.secure_share && SERVICE.secure_share.delete_open) || 'secure_share.delete_open');
      if (tokenId) {
        try {
          await this.postService({
            service: svc,
            hub_id: Visitor.id,
            token_id: tokenId,
            recipient_email: recipientEmail || null,
          });
          if (read) this._markRowRead(cmd); else if (cmd && cmd.goodbye) cmd.goodbye();
        } catch (e) {
          this.warn('[activity] share_open ' + mode + ' failed', e);
        }
      } else {
        // No token means the row cannot be addressed on the server at all. Fall
        // back to the local effect only, rather than silently doing nothing.
        if (read) this._markRowRead(cmd);
        else if (cmd && cmd.goodbye) cmd.goodbye();
      }
      return;
    }

    if (itemType === 'mfs' && changelogId) {
      // activity.dismiss records "read" and leaves the event in the feed;
      // activity.delete_activity records a permanent removal. Two endpoints
      // rather than a flag on one, because the server had to add the second
      // without changing the arity of the procedure behind the first.
      const svc = read
        ? ((SERVICE.activity && SERVICE.activity.dismiss) || 'activity.dismiss')
        : ((SERVICE.activity && SERVICE.activity.delete_activity) || 'activity.delete_activity');
      this.verbose('[activity] → POST', { svc, changelog_id: changelogId, mode });
      try {
        await this.postService({
          service: svc,
          hub_id: Visitor.id,
          changelog_id: changelogId,
        });
        if (read) this._markRowRead(cmd); else cmd.goodbye();
      } catch (e) {
        this.warn('dismiss-activity failed', e);
      }
    } else if (itemType === 'hub_invite' || itemType === 'contact_invite' || itemType === 'contact_refused') {
      // Resolve the contact_activity row id. activity.list returns it via
      // `key_id` (string) and `last_id` (number); legacy paths used `id` /
      // `changelog_id`. Use the first non-empty.
      const activityId = changelogId
        || (cmd && cmd.mget && (cmd.mget(_a.id) || cmd.mget('id') || cmd.mget('last_id') || cmd.mget('key_id')));
      if (activityId) {
        // READ goes through read_contact_event (dismissed_at only). It used to
        // be dismiss_contact_event, which also stamps hidden_at — removal, the
        // meaning mobile relies on — so a notification the user merely opened
        // vanished from the list on the next reload.
        const svc = read
          ? ((SERVICE.activity && SERVICE.activity.read_contact_event) || 'activity.read_contact_event')
          : ((SERVICE.activity && SERVICE.activity.delete_contact_event) || 'activity.delete_contact_event');
        this.verbose('[activity] → POST', { svc, activity_id: activityId, mode });
        try {
          await this.postService({
            service: svc,
            hub_id: Visitor.id,
            activity_id: activityId,
          });
          if (read) this._markRowRead(cmd); else cmd.goodbye();
        } catch (e) {
          this.warn('dismiss contact_activity failed', e);
        }
      } else {
        console.warn('[activity] dismiss skipped — no activity_id on row', { itemType, itemKey });
      }
    } else if (['chat', 'media', 'teamchat', 'contact', 'ticket'].includes(itemType)) {
      // Unified notification dismiss for any rollup from drumate.notification_center.
      // Server-side `notification_dismiss` routes by category to the correct
      // read-pointer / status update. The semantic meaning of `key_id` differs
      // per category (peer_id for chat, hub_id for teamchat/media, contact.id
      // for contact, ticket_id for ticket), so resolve it explicitly.
      const m = (k) => (cmd && cmd.mget && cmd.mget(k));
      let keyId;
      switch (itemType) {
        case 'chat':
          // p2p_read.peer_id is the peer's drumate_id, NOT the contact_id.
          keyId = args.key_id || m('drumate_id') || m('peer_id') || m('key_id');
          break;
        case 'media':
          // notification_center_next keys media rollups per folder (nid = the
          // folder a file lives in). notification_dismiss(media) marks `_seen_`
          // on the files under that folder nid, so send the folder nid — not
          // hub_id (which the dismiss can't use). Falls back to hub_id/key_id.
          keyId = args.key_id || m('nid') || m('hub_id') || m('key_id');
          break;
        case 'teamchat':
          // notification_center_next now keys teamchat per folder: key_id = folder
          // nid (or hub_id for a hub-level/legacy chat with no _scope_nid).
          // notification_dismiss matches on that, so prefer the row's key_id/nid
          // over hub_id — otherwise a folder mention never clears.
          keyId = args.key_id || m('key_id') || m('nid') || m('hub_id');
          break;
        case 'contact':
          keyId = args.key_id || m('contact_id') || m('key_id');
          break;
        case 'ticket':
        default:
          keyId = args.key_id || m('key_id') || m('hub_id');
      }
      const hubId = m('hub_id') || Visitor.id;
      const lastId = m('last_id') || 0;
      if (!keyId) {
        console.warn('[activity] notification_dismiss skipped — no key_id', { itemType, itemKey });
      } else {
        // READ advances the underlying read pointer, which is all "I have read
        // this" means for a rollup. The row survives because the server keeps a
        // copy in notification_rollup and renders it back with is_read = 1 --
        // the live rollup itself is recomputed from unread state and simply
        // stops existing once read, which is why it used to vanish.
        //
        // DELETE does that AND flags the stored copy. Both writes are required:
        // flagging alone leaves the live rollup regenerating on the next
        // refresh, and dismissing alone is exactly today's behaviour, where the
        // row returns as a read row instead of staying gone.
        const svc = read
          ? ((SERVICE.activity && SERVICE.activity.dismiss_rollup)
            || (SERVICE.activity && SERVICE.activity.notification_dismiss)
            || 'activity.dismiss_rollup')
          : ((SERVICE.activity && SERVICE.activity.delete_rollup) || 'activity.delete_rollup');
        this.verbose('[activity] → POST', { svc, category: itemType, key_id: keyId, hub_id: hubId, last_id: lastId, mode });
        try {
          await this.postService({
            service: svc,
            category: itemType,
            key_id: keyId,
            hub_id: hubId,
            last_id: lastId,
          });
          if (read) this._markRowRead(cmd); else cmd.goodbye();
        } catch (e) {
          this.warn('notification_dismiss failed', e);
        }
      }
    } else {
      this.verbose('[activity] dismiss UI-only (no API)', { itemType, itemKey });
    }
  }


}

module.exports = __panel_activity;
