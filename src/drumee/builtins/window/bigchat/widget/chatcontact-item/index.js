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
    //this.debug("AAA:62", id, args[id], this, this.el);
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
    this.debug(`SERVICE=${service}`);
    this.source = cmd;
    this.service = service;
    this.triggerHandlers({ ...args, service });
  }

  /**
   * 
   */
  resetNotification() {
    this.mset("room_count", 0);
    this.updateNotification();
  }

  /**
   * 
   */
  updateNotification() {
    let count = this.mget("room_count") || 0;
    if (count > 99) {
      count = "99+";
    }
    this.__counter.set({ content: count });
    if (count === 0) {
      this.__counter.el.hide();
    } else {
      this.__counter.el.show();
    }

    this.trigger(_e.update);
  }
}

module.exports = ___widget_chatcontactItem;
