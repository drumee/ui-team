const CATEGORIES = {
  ticket: "supportCount",
  chat: "contactChatCount",
  teamchat: "teamChatCount",
  media: "mediaCount",
}

//#########################################

class __notification_panel extends LetcBox {
  constructor(...args) {
    super(...args);
    this.updateSubNotificationCount = this.updateSubNotificationCount.bind(this);
    this.updateNotificationCount = this.updateNotificationCount.bind(this);
    this.getNotificationData = this.getNotificationData.bind(this);
  }

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt = {}) {
    super.initialize(opt);
    require('./skin');
    this.declareHandlers();
    this.notificationState = 0;

    window.NotificationCenter = this;

    this._onOutsideClick = (e, origin) => {
      if (pointerDragged) return;
      if (e && !this.el.contains(e.currentTarget)) {
        this.closeNotificationPanel();
      }
    }

    RADIO_CLICK.on(_e.click, this._onOutsideClick)
    this._currentCount = 0;
    this._currentPayload = {};
    this.details = {};
    this.onVisibilityChange = this.onVisibilityChange.bind(this)
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    this.bindWsEvents();
  }

  /**
   * 
   */
  bindWsEvents() {
    let events = wsRouter.hasListener(this);
    if (events) {
      return;
    }
    if (!window.Notification) return;
    Notification.requestPermission(() => {
      uiRouter.ensureWebsocket().then(() => {
        let timer = setInterval(() => {
          events = wsRouter.hasListener(this);
          if (events) {
            clearInterval(timer);
          } else {
            this.bindEvent("live", "notificationcenter");
          }
        }, 2000)
      });
    })
  }


  /**
   * 
   */
  onDestroy() {
    RADIO_BROADCAST.off(_e.click, this._onOutsideClick);
    RADIO_BROADCAST.off('notification:request', this.updateSubNotificationCount);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
  }

  /**
   * 
   * @param {*} e 
   */
  onVisibilityChange(e) {
    if (!this.visible) {
      this.getNotificationData(100);
    }
    this.visible = !document.hidden;
  }

  /**
   * 
   */
  onDomRefresh() {
    RADIO_BROADCAST.on('notification:request', this.updateSubNotificationCount);
    RADIO_NETWORK.on(_e.online, this.getNotificationData);
    this.visible = !document.hidden;
    this.getNotificationData();
  }


  /**
   * @param {*} cmd 
   * @param {*} args 
  */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.mget(_a.service);
    switch (service) {
      case 'open-notification-panel':
        if (this.notificationState == 0) {
          this.notificationState = 1;
          this.updateNotificationWindow();
          if (this.parent) {
            this.parent.el.dataset.state = 1;
          }
          this.setState(1);
          return '';
        }
        return this.closeNotificationPanel();

      case 'close-notification-panel':
        if (this.notificationState == 0) {
          return;
        }
        this.closeNotificationPanel();
        return '';

      case 'delete-entity':
        cmd.goodbye();
        return this.deleteEntityResponse(cmd);
    }
  }

  /**
   * 
   */
  closeNotificationPanel() {
    this.notificationState = 0;
    if (this.parent) {
      this.parent.el.dataset.state = 0;
    }
    this.setState(0);
    if (!this.__wrapperNotificationOverlay) return;
    this.__wrapperNotificationOverlay.clear();
  }

  /**
   * 
   */
  updateNotificationWindow() {
    if (!this.__wrapperNotificationOverlay) return;
    Kind.waitFor('notification_window').then(() => {
      let notifier = this.__wrapperNotificationOverlay.children.last();
      if (notifier && !notifier.isDestroyed()) {
        notifier.update(this.data());
        return;
      }
      this.__wrapperNotificationOverlay.feed({
        kind: 'notification_window',
        media: this,
        notificationData: this.data(), //this.data(),
        uiHandler: this,
      });
    })
  }

  /**
   * @param {Letc} cmd
   */
  deleteEntityResponse(cmd) {
    // this.updateNotificationCount();
  }

  /**
   * @param  {number} count
   */
  updateNotificationTitle() {
    let count = this.data().length;
    const pattern = /^\(\d+\)/;
    if (count === 0 || pattern.test(document.title)) {
      return document.title = document.title.replace(pattern, count === 0 ? '' : '(' + count + ')');
    }
    document.title = "(" + count + ") " + document.title;
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
    Visitor.playSound(_K.notifications.drip, 0);
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
    if (!window.Notification) return;
    new Notification(title, notif);
  }

  /**
   * 
   */
  updateSubNotificationCount() {
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
    this.updateNotificationTitle();
    res.allConversationsCount = res.contactChatCount + res.teamChatCount;
    RADIO_BROADCAST.trigger('notification:counts', res);
    RADIO_BROADCAST.trigger('notification:details', this.details);
    RADIO_BROADCAST.trigger('notification:summary', this.summary);
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
   * 
   * @returns 
   */
  updateNotificationCount() {
    this.updateSubNotificationCount();
    this.ensurePart("notification-counter").then((p) => {
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
  getNotificationData(timeout = 2000) {
    if (!Visitor.id || !Visitor.isOnline()) {
      Visitor.once('online', () => {
        this.getNotificationData();
      })
      return
    }
    this.bindWsEvents();
    let opt = { hub_id: Visitor.id }
    this.postService(SERVICE.drumate.notification_center, opt)
      .then((data) => {
        this._buildNotifications(data);
        this.feed(require('./skeleton')(this));
        setTimeout(() => {
          this.updateNotificationCount();
        }, timeout);
      })
  }

  /**
   * 
  */
  resync(timeout = 2000) {
    if (document.hidden) return;
    return this.postService(SERVICE.drumate.notification_center, {
      hub_id: Visitor.id
    }).then((data) => {
      this._buildNotifications(data);
      this.updateNotificationCount();
      if (this.notificationState) {
        this.updateNotificationWindow(data)
      }
    })
  }



  /**
   * 
   * @param {*} service 
   * @param {*} data 
   * @param {*} options 
   */
  onWsMessage(service, data, options) {
    if (!data) return;
    if (!_.isArray(data)) {
      data = [data]
    }
    switch (options.service) {
      case "messages.read":
        this._buildNotifications(data);
        this.updateNotificationCount();
        if (this.notificationState) {
          this.updateNotificationWindow(data)
        }
        break;
      case "chat.post":
      case "channel.post":
      case "contact.invite":
        this._currentPayload = { data, options };
      case "notification.resync":
      case "drumate.notification_remove":
      case "channel.acknowledge":
      case "chat.acknowledge":
      case "contact.delete_contact":
      case "contact.accept_informed":
      case "media.remove":
      case "media.new":
        if (this.timer) return;
        this.timer = setTimeout(() => {
          this.resync();
          this.timer = null;
        }, 1000);
        return;
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
  _buildNotifications(data) {
    if (!_.isArray(data)) data = [data];
    this.summary = {
      chat: {},
      contact: {},
      media: {},
      teamchat: {},
      ticket: {},
    };
    this.details = {};



    for (let item of data) {
      let key = this._getKey(item);
      if (!key) {
        continue;
      }
      let category = item.category;
      if (!this.summary[category]) continue;
      if (!item.display_name) item.display_name = item.surname || item.fullname || item.firstname;
      if (!item.content) item.content = {};
      if (!this.details[key]) {
        item.content[category] = {
          cnt: parseInt(item.cnt) || 0,
          ctime: item.ctime
        }
        this.details[key] = item;
      } else {
        let c = this.details[key].content[category];
        if (!item.content[category]) item.content[category] = {};
        if (c) {
          let cnt = c.cnt;
          let ctime = item.ctime;
          if (c.ctime > ctime) ctime = c.ctime;
          item.content[category] = {
            cnt: parseInt(item.cnt) + cnt,
            ctime
          }
        } else {
          item.content = this.details[key].content;
          item.content[category] = {
            cnt: parseInt(item.cnt) || 0,
            ctime: item.ctime
          }
          this.details[key] = item;
        }
      }
    }

    for (let key in this.details) {
      let item = this.details[key];
      for (let c in item.content) {
        if (!this.summary[c]) continue;
        let cur = this.summary[c][key];
        if (!cur) {
          this.summary[c][key] = item;
          this.summary[c][key].cnt = item.content[c].cnt;
        } else {
          item.content[c].cnt += cur.cnt;
        }
      }
    }
  }


  /**
   * 
   */
  _addNotifications(data, k) {
    if (!this.summary[k]) {
      this.warn(`AAA:333 -- unknown category "${k}"`);
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
  _removeNotifications(data, k) {
    if (!this.summary[k]) {
      this.warn(`AAA:339 -- unknown category "${k}"`);
      return;
    }
    for (let r of data) {
      let key = this._getKey(r);
      if (!key) {
        this.warn("_removeNotifications: no key");
        continue;
      }
      let item = this.details[key];
      if (!item) {
        this.warn("_removeNotifications: pending notification");
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

}

module.exports = __notification_panel
