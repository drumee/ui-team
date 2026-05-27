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
   * @param {*} e 
   */
  _onOutsideClick(e, source) {
    const svc = source && source.mget && source.mget(_a.service);
    if (typeof svc === "string" && svc.startsWith("toggle-")) return;
    if (this.activityState && !this.el.contains(e.target)) {
      Desk.closeAllPanels()
    }
  }

  /**
   * 
   */
  onDestroy() {
    RADIO_BROADCAST.off(_e.click, this._onOutsideClick);
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
        this.activityState = 0;
        this.setState(0);
        return '';

      case 'delete-entity':
        cmd.goodbye();
        return this.deleteEntityResponse(cmd);

      case 'dismiss-activity':
        return this._dismissActivity(cmd, args);

      case 'toggle-favorite':
        return this._toggleFavorite(cmd, args);

      case 'open-contact':
        this._dismissFromOpen(cmd, args);
        this.activityState = 0;
        this.setState(0);
        return Desk.togglePanel('address_book', 'chat-panel');

      case 'open-chat': {
        const drumate_id = args && args.drumate_id;
        const message_id = args && args.message_id;
        this._dismissFromOpen(cmd, args);
        this.activityState = 0;
        this.setState(0);
        Desk.openP2Pchat(args)
        return;
      }

      case 'open-activity':
        this._dismissFromOpen(cmd, args);
        return;

      case 'open-workspace-invitation':
      case 'open-folder':
      case 'open-channel':
      case 'open-ticket': {
        // For any "open the underlying entity" service we (1) dismiss the
        // notification (in-memory + server-side persistence), (2) close
        // the activity panel, and (3) navigate the desk to the target hub.
        // Acting on a notification implies "I've seen this" — keeps the
        // panel and badge in sync with what the user has actually engaged
        // with, no matter which row category fired the open.
        const item = this._findActivityItem(cmd);
        const hubId = (args && args.hub_id)
          || (item && item.mget && item.mget('hub_id'));
        this._dismissFromOpen(cmd, args);
        this.activityState = 0;
        this.setState(0);
        if (hubId && typeof Wm !== 'undefined' && Wm.loadWorkspace) {
          try { Wm.loadWorkspace({ hub_id: hubId }); }
          catch (e) { this.warn('loadWorkspace failed', e); }
        }
        return;
      }

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

      case 'join-meeting': {
        const item = this._findActivityItem(cmd);
        const hub_id = (args && args.hub_id) || (item && item.mget && item.mget('hub_id'));
        const details = (item && item.mget && item.mget('details')) || {};
        const room_id = (item && item.mget && item.mget('room_id')) || details.nid;
        const room_type = (item && item.mget && item.mget('room_type')) || 'meeting';
        if (hub_id && typeof Wm !== 'undefined' && Wm.addWindow) {
          const folderNid = details.nid || details.actual_home_id || room_id;
          try {
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
    if (cmd.mget && cmd.mget('kind') === 'activity_item') return cmd;
    if (cmd.getParentByKind) return cmd.getParentByKind('activity_item');
    return null;
  }

  async _toggleFavorite(cmd, args = {}) {
    const item = this._findActivityItem(cmd);
    const messageId = args.message_id
      || (item && item.mget && (item.mget('message_id') || item.mget(_a.id) || item.mget('id')));
    const hubId = args.hub_id
      || (item && item.mget && item.mget('hub_id'))
      || Visitor.id;
    const favorited = args.favorited ? 1 : 0;
    console.log('[activity] toggle-favorite', { favorited, messageId, hubId, item_key: args.item_key });
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
      e.service = "open-contact";
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
      e.service = category === 'media' ? 'open-folder'
        : category === 'teamchat' ? 'open-channel'
          : category === 'contact' ? 'open-contact'
            : category === 'ticket' ? 'open-ticket'
              : 'open-chat';
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
    const unread_count = live.length;
    RADIO_BROADCAST.trigger('activity-update', { unread_count });
    this.updatePriorityListUnified(live);
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
          e.service = 'open-workspace-invitation';
          e.action = LOCALE.INVITED_YOU_TO_WORKSPACE || 'invited you to';
          e.link_label = it.hub_name;
          e.fullname = (it.surname || `${it.firstname || ''} ${it.lastname || ''}`).trim();
          break;
        case 'contact':
          e.service = 'open-contact';
          e.event = (it.status === 'informed') ? 'contact.accept_informed' : 'contact.invite';
          e.status = it.status;
          e.fullname = (it.surname || `${it.firstname || ''} ${it.lastname || ''}`).trim();
          break;
        case 'media':
          e.service = 'open-folder';
          break;
        case 'teamchat':
          e.service = 'open-channel';
          break;
        case 'ticket':
          e.service = 'open-ticket';
          break;
        default:
          e.service = 'open-chat';
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
      service: 'join-meeting',
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
            opt.message = LOCALE.X_JOINED_MEETING_X.format(meeting.by, meeting.filename)
            const { hub_id, nid } = meeting;
            if (hub_id) {
              url = `${url}/meeting/?nid=${hub_id}&ts=${now}`
            }
          } catch (e) {
            this.warn("Failed to parse", meeting)
          }
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
    console.log('[activity] dismiss', { itemType, itemKey, changelogId });

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

    if (itemType === 'mfs' && changelogId) {
      console.log('[activity] → POST activity.dismiss', { changelog_id: changelogId });
      try {
        await this.postService(SERVICE.activity.dismiss, {
          hub_id: Visitor.id,
          changelog_id: changelogId,
        });
      } catch (e) {
        this.warn('dismiss-activity failed', e);
      }
    } else if (itemType === 'hub_invite' || itemType === 'contact_invite') {
      // Resolve the contact_activity row id. activity.list returns it via
      // `key_id` (string) and `last_id` (number); legacy paths used `id` /
      // `changelog_id`. Use the first non-empty.
      const activityId = changelogId
        || (cmd && cmd.mget && (cmd.mget(_a.id) || cmd.mget('id') || cmd.mget('last_id') || cmd.mget('key_id')));
      if (activityId) {
        console.log('[activity] → POST activity.dismiss_contact_event', { activity_id: activityId });
        try {
          await this.postService({
            service: (SERVICE.activity && SERVICE.activity.dismiss_contact_event) || 'activity.dismiss_contact_event',
            hub_id: Visitor.id,
            activity_id: activityId,
          });
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
          keyId = m('drumate_id') || m('peer_id') || m('key_id');
          break;
        case 'media':
        case 'teamchat':
          keyId = m('hub_id') || m('key_id');
          break;
        case 'contact':
          keyId = m('contact_id') || m('key_id');
          break;
        case 'ticket':
        default:
          keyId = m('key_id') || m('hub_id');
      }
      const hubId = m('hub_id') || Visitor.id;
      const lastId = m('last_id') || 0;
      if (!keyId) {
        console.warn('[activity] notification_dismiss skipped — no key_id', { itemType, itemKey });
      } else {
        console.log('[activity] → POST activity.dismiss_rollup', { category: itemType, key_id: keyId, hub_id: hubId, last_id: lastId });
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
        } catch (e) {
          this.warn('notification_dismiss failed', e);
        }
      }
    } else {
      console.log('[activity] dismiss UI-only (no API)', { itemType, itemKey });
    }
  }


}

module.exports = __panel_activity;
