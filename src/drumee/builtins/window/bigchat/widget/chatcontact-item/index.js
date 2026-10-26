class ___widget_chatcontactItem extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.resetNotification = this.resetNotification.bind(this);
    this.updateNotification = this.updateNotification.bind(this);
  }

  initialize(opt) {
    if (opt == null) {
      opt = {};
    }
    require("./skin");
    super.initialize();
    this.declareHandlers();
    this.mset({ escapeContextmenu: true });
    RADIO_BROADCAST.on(
      "notification:details",
      this.updateNotificationCount.bind(this)
    );
  }

  /**
   * 
   */
  onBeforeDestroy() {
    RADIO_BROADCAST.off(
      "notification:details",
      this.updateNotificationCount.bind(this)
    );
  }

  /**
   * 
   */
  getAvatarHtml(){
    return this.__profile?.__imageBox?.el.innerHTML
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @param {*} section 
   */
  onPartReady(child, pn, section) {
    switch (pn) {
      case _a.profile:
        child.on("status_changed", (data) => {
          this.mset({ online: data.status });
        });
        this.waitElement(child.el, () => {
          child.el.dataset.online = this.mget(_a.online);
        });
    }
  }

  /**
   *
   */
  updateNotificationCount(args) {
    let id = this.mget(_a.drumate_id) || this.mget(_a.entity_id);
    if (args[id]) {
      this.mset({ room_count: args[id].cnt });
      this.updateNotification();
    }
  }

  /**
   * 
   */
  onDomRefresh() {
    this.feed(require("./skeleton")(this));
    this.waitElement(this.el, () => {
      this.el.dataset.online = this.mget(_a.online);
    });
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   */
  onUiEvent(cmd, args) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    this.source = cmd;
    this.service = service;
    this.triggerHandlers({ ...args, service });
  }

  /**
   * 
   */
  resetNotification() {
    this.mset("room_count", 0);
    this.mset("has_mention", 0);
    this.updateNotification();
  }

  /**
   * 
   */
  updateNotification() {
    const count = ~~(this.mget("room_count") || 0);
    if (this.__counter) {
      this.__counter.set(_a.content, this.unreadLabel(count));
      this.__counter.el.dataset.state = count ? _a.open : _a.closed;
    }
    this.trigger(_e.update);
  }

  /**
   * Badge text for an unread count, capped so it stays a pill.
   * @param {Number} count
   * @returns {String}
   */
  unreadLabel(count) {
    if (!count) return "";
    return count > 99 ? "99+" : `${count}`;
  }
}

module.exports = ___widget_chatcontactItem;
