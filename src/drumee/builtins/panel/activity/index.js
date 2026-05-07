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


    // RADIO_CLICK.on(_e.click, this._onOutsideClick)
    this._currentCount = 0;
    this._currentPayload = {};
    this._unreadsOnly = 1;
    this.details = {};
    this.onVisibilityChange = this.onVisibilityChange.bind(this)
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    this.onWsMessage = this.onWsMessage.bind(this)
  }



  /**
   * 
   */
  onDestroy() {
    // RADIO_BROADCAST.off(_e.click, this._onOutsideClick);
    RADIO_BROADCAST.off('activity:request', this.updateSubactivityCount);
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
    RADIO_NETWORK.on(_e.online, this.refreshActivity);
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
        return this._dismissActivity(cmd);

      case 'open-contact':
        this.activityState = 0;
        this.setState(0);
        return Desk.togglePanel('address_book', 'chat-panel');

      case 'open-chat':
        this.activityState = 0;
        this.setState(0);
        return Desk.togglePanel('chat_p2p', 'chat-panel');

      case 'toggle-unreads':
        this._unreadsOnly = this._unreadsOnly ? 0 : 1;
        return this.ensurePart(_a.list).then((list) => list.restart());

      case 'tab-all':
        return this._setTab('all');

      case 'tab-mentions':
        return this._setTab('mentions');

      case 'tab-shares':
        return this._setTab('shares');

      case 'clear-all':
        return this.postService(SERVICE.activity.mark_all_read, { hub_id: Visitor.id }).then(() => {
          this.ensurePart(_a.list).then((list) => list.restart());
          this.postService(SERVICE.activity.get_unread_count, { hub_id: Visitor.id }).then(({ unread_count }) => {
            RADIO_BROADCAST.trigger('activity-update', { unread_count: unread_count || 0 });
          });
        });

    }
    const { unread_count } = await this.postService(
      SERVICE.activity.get_unread_count,
      { hub_id: Visitor.id }
    );
    RADIO_BROADCAST.trigger('activity-update', { unread_count: unread_count || 0 });
    if (this.__list && !this.__list.isDestroyed()) {
      this.__list.restart();
      return;
    }
    this.feed(require('./skeleton')(this));
  }

  /**
   * 
   */
  // toggleState() {
  //   this.debug("AAA:179", this.activityState, this.mget(_a.state))
  //   if (this.activityState == 0) {
  //     this.activityState = 1;
  //     // this.refreshActivity()
  //     // this.el.dataset.state = 1;
  //     // this.setState(1);
  //     this.debug("AAA:185", this.activityState)
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
      e.uiHandler = [this]
      list.push(e)
    }
    for (let e of hubInvites) {
      const fullname = (e.from_fullname || e.fullname || '').trim();
      const item = {
        ...e,
        kind: 'activity_item',
        type: 'hub-invitation',
        event: 'hub.invite_received',
        service: 'open-workspace-invitation',
        action: LOCALE.INVITED_YOU_TO_WORKSPACE || 'invited you to',
        link_label: e.hub_name,
        hub_id: e.hub_id,
        author_id: e.author_id,
        fullname,
        uiHandler: [this]
      };
      list.push(item);
    }
    for (let e of messages) {
      let f = e.firstname || ""
      let l = e.lastname || ""
      e.kind = 'activity_item';
      e.service = "open-chat";
      e.type = "chat";
      let contact = {
        ...e,
        event: 'chat.post',
        id: e.drumate_id,
        fullname: `${f} ${l}`
      };
      e.contact = contact;
      e.uiHandler = [this]
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
   * 
  */
  async refreshActivity(timeout = 2000) {
    if (!Visitor.id || !Visitor.isOnline()) {
      Visitor.once('online', () => {
        this.refreshActivity();
      })
      return
    }

    let opt = { hub_id: Visitor.id }
    let { unread_count } = await this.postService(SERVICE.activity.get_unread_count, opt);
    let invitations = await this.postService(SERVICE.contact.invite_get, { hub_id: Visitor.id });
    let messages = await this.postService(SERVICE.drumate.notification_center, { hub_id: Visitor.id });
    let hubInvites = await this._fetchHubInvitations();
    unread_count =
      parseInt(messages.length) +
      parseInt(invitations.length) +
      parseInt(hubInvites.length) +
      parseInt(unread_count);
    // this.triggerHandlers({ unread_count })
    RADIO_BROADCAST.trigger('activity-update', { unread_count });
    this.updatePriorityList(invitations, messages, hubInvites)
    if (!this.mget(_a.state)) return;
    if (this.__list && !this.__list.isDestroyed()) {
      this.__list.restart()
      return
    }
    this.feed(require('./skeleton')(this, invitations));
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
      case "contact.invite":
      case "hub.invite_received":
        this.refreshActivity()
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
      case "contact.accept_informed":
      case "media.remove":
      case "media.new":
        if (this.timer) return;
        this.timer = setTimeout(() => {
          this.refreshActivity();
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
    Visitor.playSound(_K.activitys.drip, 0);
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
    if (!window.activity) return;
    new activity(title, notif);
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

  async _dismissActivity(cmd) {
    const changelogId = cmd.mget('changelog_id') || cmd.mget(_a.id) || cmd.mget('id');
    if (!changelogId) return;
    try {
      await this.postService(SERVICE.activity.dismiss, {
        hub_id: Visitor.id,
        changelog_id: changelogId,
      });
      if (this.__list && !this.__list.isDestroyed()) {
        this.__list.restart();
      }
      this.refreshActivity();
    } catch (e) {
      this.warn('dismiss-activity failed', e);
    }
  }


}

module.exports = __panel_activity;
