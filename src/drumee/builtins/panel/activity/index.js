const CATEGORIES = {
  ticket: "supportCount",
  chat: "contactChatCount",
  teamchat: "teamChatCount",
  media: "mediaCount",
}
const WS_EVENT = "ws:event";
require('./skin');

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
  }

  /**
   *
   * @param {*} opt 
   */
  initialize(opt = {}) {
    this.activityState = 0;
    opt.state = 0;
    super.initialize(opt);
    this.declareHandlers();

    window.ActivityHandler = this;

    this._onOutsideClick = this._onOutsideClick.bind(this);
    this._currentCount = 0;
    this._currentPayload = {};
    this._unreadsOnly = 1;
    this._dismissedKeys = new Set();
    this._meetingItems = [];
    this.details = {};
    this.onVisibilityChange = this.onVisibilityChange.bind(this)
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    this.onWsMessage = this.onWsMessage.bind(this)
    this._last_notified = 0;
  }

  /**
   * 
   */
  _hide() {
    this.el.dataset.anim = "out";
    this.setState(0)
    this.activityState = 0
  }
  /**
   * 
   * @param {*} e 
   */
  _onOutsideClick(e, source) {
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
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
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
    RADIO_BROADCAST.on('activity:request', this.updateSubactivityCount);
    RADIO_BROADCAST.on('activity:notify', this._notify);
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
   * 
   * @returns 
   */
  getCurrentApi() {
    if (this._filter === 'mentions') {
      return {
        service: (SERVICE.channel && SERVICE.channel.list_notifications) || 'channel.list_notifications',
        hub_id: Visitor.id,
        type: 'mention',
        unread_only: this._unreadsOnly,
      };
    }
    if (this._filter === 'shares') {
      return {
        service: (SERVICE.channel && SERVICE.channel.list_notifications) || 'channel.list_notifications',
        hub_id: Visitor.id,
        type: 'share',
        unread_only: this._unreadsOnly,
      };
    }
    return {
      service: SERVICE.activity.get_feed,
      hub_id: Visitor.id,
      filter: this._filter,
      unread_only: this._unreadsOnly,
    };
  }

  /**
   * @param {*} cmd 
   * @param {*} args 
  */
  async onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.mget(_a.service);
    switch (service) {
      case 'open-activity-panel':
        this.activityState = 1;
        this.setState(1);
        return '';

      case 'close-activity-panel':
        this._hide()
        return '';

      case 'delete-entity':
        cmd.goodbye();
        return this.deleteEntityResponse(cmd);

      case 'dismiss-activity':
        return this._dismissActivity(cmd, args);

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

      case 'toggle-unreads':
        this._unreadsOnly = this._unreadsOnly ? 0 : 1;
        this.ensurePart('unread-toggle').then((p) => {
          if (p && p.el) p.el.dataset.state = this._unreadsOnly ? '1' : '0';
        });
        return this.ensurePart(_a.list).then((list) => list.restart());

      case 'tab-all':
        return this._setTab('all');

      case 'tab-mentions':
        return this._setTab('mentions');

      case 'tab-shares':
        return this._setTab('shares');

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
  // for fixed descendants, so the overlay would otherwise stay trapped in the 450px
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

  async _toggleFavorite(cmd, args = {}) {
    const item = this._findActivityItem(cmd);
    const messageId = args.message_id
      || (item && item.mget && (item.mget('message_id') || item.mget(_a.id) || item.mget('id')));
    const hubId = args.hub_id
      || (item && item.mget && item.mget('hub_id'))
      || Visitor.id;
    const favorited = args.favorited ? 1 : 0;
    this.verbose('[activity] toggle-favorite', { favorited, messageId, hubId, item_key: args.item_key });
    if (!messageId) {
      console.warn('[activity] toggle-favorite skipped — no message_id on row');
      return;
    }
    try {
      if (favorited) {
        await this.postService(SERVICE.channel.bookmark_add, { message_id: messageId, hub_id: hubId });
      } else {
        // ACL `scope:hub` requires hub_id for the permission check even
        // though the proc itself ignores it (uniqueness is uid+message_id).
        await this.postService(SERVICE.channel.bookmark_remove, { message_id: messageId, hub_id: hubId });
      }
    } catch (e) {
      this.warn('toggle-favorite failed', e);
    }
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
   *
   * @param {*} filter 
   */
  _setTab(filter) {
    this._filter = filter || 'all';
    this.ensurePart('priority').then((p) => {
      if (!p || !p.el) return;
      p.el.style.display = (this._filter === 'all') ? '' : 'none';
    });
    this.ensurePart(_a.list).then((list) => list.restart());
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
        unread_only: this._unreadsOnly,
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
        .filter((r) => r && ['task_assigned', 'task_column_change'].includes(r.event))
        .filter((r) => !dismissedTa.has(`contact_invite:${r.id}`))
        .map((r) => ({
          ...r,
          category: 'contact_invite',
          key_id: String(r.id),
          last_id: r.id,
        }));
    } catch (e) {
      this.warn('[panel_activity] task assignment fetch failed', e);
    }
    const merged = accessReqs.concat(taskMentions, taskNotifications, live);

    const unread_count = merged.length;
    RADIO_BROADCAST.trigger('activity-update', { unread_count });
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
    const combined = [...meetingItems, ...list];
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
    if (!window.Notification) return;
    let opt = data[0] || data;
    let meeting;
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
            opt.message = LOCALE.X_JOINED_MEETING_X.format(senderName, meeting.filename)
            const { hub_id, nid } = meeting;
            if (hub_id) {
              url = `${url}/meeting/?nid=${hub_id}&ts=${now}`
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

  async _dismissActivity(cmd, args = {}) {
    const itemKey = args.item_key
      || (cmd && cmd.mget && cmd.mget('item_key'));
    const itemType = args.item_type
      || (cmd && cmd.mget && cmd.mget('item_type'))
      || 'mfs';
    const changelogId = args.changelog_id
      || (cmd && cmd.mget && (cmd.mget('changelog_id') || cmd.mget(_a.id) || cmd.mget('id')));
    this.verbose('[activity] dismiss', { itemType, itemKey, changelogId });

    if (itemKey) {
      this._dismissedKeys = this._dismissedKeys || new Set();
      this._dismissedKeys.add(itemKey);
      const lastId = args.last_id
        || (cmd && cmd.mget && cmd.mget('last_id'))
        || 0;
      this._dismissedLastIds = this._dismissedLastIds || new Map();
      this._dismissedLastIds.set(itemKey, Number(lastId));
    }
    this._decrementBadge(1);

    if (itemType === 'access_request') {
      // Pending secure-share request: no server-side dismiss endpoint (resolved via
      // approve/deny). Client-only — its key is tracked in _dismissedKeys above so
      // refreshActivity skips it this session; it reappears only on a full reload.
      if (cmd && cmd.goodbye) cmd.goodbye();
      return;
    }

    if (itemType === 'share_open') {
      // Persistent dismiss: mark THIS open-notification group (token + recipient)
      // seen on the server so it stays out of the Unread feed and survives a reload
      // (still shows under Unread OFF). Scoped server-side to the caller's own
      // shares. Best-effort: goodbye() the row regardless so the UI feels instant.
      const tokenId = args.token_id || (cmd && cmd.mget && cmd.mget('token_id'));
      const recipientEmail = (args.recipient_email != null)
        ? args.recipient_email
        : (cmd && cmd.mget && cmd.mget('recipient_email'));
      if (tokenId) {
        try {
          await this.postService({
            service: (SERVICE.secure_share && SERVICE.secure_share.mark_open_seen) || 'secure_share.mark_open_seen',
            hub_id: Visitor.id,
            token_id: tokenId,
            recipient_email: recipientEmail || null,
          });
        } catch (e) {
          this.warn('[activity] mark_open_seen failed', e);
        }
      }
      if (cmd && cmd.goodbye) cmd.goodbye();
      return;
    }

    if (itemType === 'mfs' && changelogId) {
      this.verbose('[activity] → POST activity.dismiss', { changelog_id: changelogId });
      try {
        await this.postService(SERVICE.activity.dismiss, {
          hub_id: Visitor.id,
          changelog_id: changelogId,
        });
        cmd.goodbye()
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
        this.verbose('[activity] → POST activity.dismiss_contact_event', { activity_id: activityId });
        try {
          await this.postService({
            service: (SERVICE.activity && SERVICE.activity.dismiss_contact_event) || 'activity.dismiss_contact_event',
            hub_id: Visitor.id,
            activity_id: activityId,
          });
          cmd.goodbye()
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
        this.verbose('[activity] → POST activity.dismiss_rollup', { category: itemType, key_id: keyId, hub_id: hubId, last_id: lastId });
        try {
          await this.postService({
            service: (SERVICE.activity && SERVICE.activity.dismiss_rollup)
              || (SERVICE.activity && SERVICE.activity.notification_dismiss)
              || 'activity.dismiss_rollup',
            category: itemType,
            key_id: keyId,
            hub_id: hubId,
            last_id: lastId,
          });
          cmd.goodbye()
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
