// ==================================================================== *
class __notifier_share extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDestroy = this.onDestroy.bind(this);
    this.getNotification = this.getNotification.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.update = this.update.bind(this);
    this.__dispatchPush = this.__dispatchPush.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this.model.set({
      flow: _a.none
    });

    return this.bindEvent(this.fig.name);
  }

  /**
   * 
   * @param {*} cmd 
   */
  onDestroy(cmd) { }
  //#@unbindEvent()


  /**
   * 
   * @param {*} data 
   * @returns 
   */
  getNotification(data) {
    return this.fetchService({
      service: SERVICE.sharebox.notification_count,
      hub_id: Visitor.id
    });
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
    this._icon = this.children.first();
    this.counter = this.children.last();
    this.getNotification();
    if (!window.Notification) return;
    Notification.requestPermission(function (status) {
      if (Notification.permission !== status) {
        return Notification.permission = status;
      }
    });
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd) {
    this.model.set({
      way: cmd.mget('way'),
      mode: cmd.mget(_a.mode)
    });
    return this.triggerHandlers();
  }


  /**
   * 
   * @param {*} data 
   * @returns 
   */
  update(data) {
    let count;
    if ((data == null) || (data.count == null) || (~~data.count === 0)) {
      count = "";
    } else {
      count = `${data.count}`;
    }
    this.counter.model.set(_a.content, count);
    if (_.isEmpty(count)) {
      this.counter.el.hide();
    } else {
      this.counter.render();
      this.counter.el.show();
    }

    return this.trigger(_e.update);
  }

  /**
   * 
   * @param {*} service 
   * @param {*} data 
   * @returns 
   */
  __dispatchPush(service, data) {
    this.debug("aaa 71__dispatchPush", service, data);
    switch (service) {
      case SERVICE.sharebox.assign_permission:
        return this.getNotification();
    }
  }

  /**
   * 
   * @param {*} service 
   * @param {*} data 
   * @returns 
   */
  __dispatchRest(service, data) {
    this.debug("aaa 71__dispatchRest ", service, data);
    switch (service) {
      case SERVICE.sharebox.notification_count:
        return this.update(data);
    }
  }
}

module.exports = __notifier_share;
