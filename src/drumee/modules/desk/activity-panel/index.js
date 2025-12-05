const CATEGORIES = {
  ticket: "supportCount",
  chat: "contactChatCount",
  teamchat: "teamChatCount",
  media: "mediaCount",
}

require('./skin');

//#########################################

class __activity_panel extends LetcBox {
  constructor(...args) {
    super(...args);
    this.updateSubactivityCount = this.updateSubactivityCount.bind(this);
    this.updateactivityCount = this.updateactivityCount.bind(this);
    this.refreshActivity = this.refreshActivity.bind(this);
  }

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    this.activityState = 0;
    this.model.set({ state: this.activityState });

    window.ActivityHandler = this;

    this._onOutsideClick = (e, origin) => {
      if (pointerDragged || e?.getService() == 'toggle-activity-panel') return;
      if (e && !this.el.contains(e.currentTarget)) {
        this.closeactivityPanel();
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
    if (!window.activity) return;
    activity.requestPermission(() => {
      uiRouter.ensureWebsocket().then(() => {
        let timer = setInterval(() => {
          events = wsRouter.hasListener(this);
          if (events) {
            clearInterval(timer);
          } else {
            this.bindEvent("live", "activitycenter");
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
    this.bindWsEvents();
    RADIO_BROADCAST.on('activity:request', this.updateSubactivityCount);
    RADIO_NETWORK.on(_e.online, this.refreshActivity);
    this.visible = !document.hidden;
    this.feed(require('./skeleton')(this));
    this.ensurePart(_a.list).then((p) => {
      this.refreshActivity()
    })

  }


  /**
   * @param {*} cmd 
   * @param {*} args 
  */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.mget(_a.service);
    switch (service) {
      case 'open-activity-panel':
        return this.togglePannel();

      case 'close-activity-panel':
        if (this.activityState == 0) {
          return;
        }
        this.closeactivityPanel();
        return '';

      case 'clear-all':
        return this.postService(SERVICE.activity.mark_all_read, { hub_id: Visitor.id }).then((data) => {
          this.__list.clear();
          this.togglePannel();
        })

      case 'delete-entity':
        cmd.goodbye();
        return this.deleteEntityResponse(cmd);
    }
  }

  /**
   * 
   */
  togglePannel() {
    if (this.activityState == 0) {
      this.activityState = 1;
      this.refreshActivity()
      this.el.dataset.state = 1;
      this.setState(1);
      return '';
    }
    return this.closeactivityPanel();

  }

  /**
   * 
   */
  closeactivityPanel() {
    this.activityState = 0;
    this.el.dataset.state = 0;
    this.setState(0);
    // if (!this.__content) return;
    // this.__content.clear();
  }

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
  refreshActivity(timeout = 2000) {
    let opt = { hub_id: Visitor.id }
    this.postService(SERVICE.activity.get_unread_count, opt)
      .then((data = {}) => {
        this.debug("AAA:321", data)
        this.triggerHandlers(data)
      })
    if (!Visitor.id || !Visitor.isOnline()) {
      Visitor.once('online', () => {
        this.refreshActivity();
      })
      return
    }
    if (this.__list && !this.__list.isDestroyed()) {
      return this.__list.restart()
    }
    this.feed(require('./skeleton')(this));
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
  onWsMessage(service, data, options) {
    if (!data) return;
    if (!_.isArray(data)) {
      data = [data]
    }
    switch (options.service) {
      case "messages.read":
        this._buildactivities(data);
        this.updateactivityCount();
        if (this.activityState) {
          this.updateactivityWindow(data)
        }
        break;
      case "chat.post":
      case "channel.post":
      case "contact.invite":
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
  _buildactivities(data) {
    this.debug("AAA:_buildactivities", data)
    return data;
  }


  /**
   * 
   */
  _addactivitys(data, k) {
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
  _removeactivitys(data, k) {
    if (!this.summary[k]) {
      this.warn(`AAA:339 -- unknown category "${k}"`);
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

}

module.exports = __activity_panel
