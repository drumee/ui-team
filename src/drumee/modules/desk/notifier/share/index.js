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

  static initClass() {
    this.prototype.fig = 1;
    this.prototype.behaviorSet = {
      bhv_socket   : 1,
      bhv_toggle   : 1
    };
  }
    
// ===========================================================
// 
//
// ===========================================================
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this.model.set({ 
      flow    : _a.none});

    return this.bindEvent(this.fig.name);
  }

// ===========================================================
//
// ===========================================================
  onDestroy(cmd) {}
    //#@unbindEvent()

// ===========================================================
//
// ===========================================================
  getNotification(data) {
    return this.fetchService({
      service     : SERVICE.sharebox.notification_count,
      hub_id : Visitor.id
    });
  }

// ===========================================================
// 
//
// ===========================================================
  onDomRefresh(){
    this.feed(require('./skeleton')(this));
    this._icon    = this.children.first();
    this.counter = this.children.last();
    Notification.requestPermission(function(status){
      if (Notification.permission !== status) { 
        return Notification.permission = status;
      }
    });
    return this.getNotification();
  }

// ===========================================================
//
// ===========================================================
  onUiEvent(cmd) {
    this.model.set({ 
      //service : cmd.model.get(_a.service)
      way  : cmd.mget('way'),
      mode : cmd.mget(_a.mode)
    });
    return this.triggerHandlers();
  }

// ===========================================================
//
// ===========================================================
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

// ===========================================================
//
// ===========================================================
  __dispatchPush(service, data){
    this.debug("aaa 71__dispatchPush", service, data);
    switch (service) {
      case SERVICE.sharebox.assign_permission:
        return this.getNotification();
    }
  }

// ===========================================================
//
// ===========================================================
  __dispatchRest(service, data){
    this.debug("aaa 71__dispatchRest ", service, data);
    switch (service) {
      case SERVICE.sharebox.notification_count:
        return this.update(data);
    }
  }
}
__notifier_share.initClass();
    //   # when 'share.hub'
    //   #   n = new Notification(title, notif)
    //   #   @update data
    //   #   Wm.join_hub(data)

    //   # when 'leave.hub'
    //   #   @update data
    //   #   Wm.leave_hub(data)

    //   when _WS.notifier.get_count
    //     @update data

    //   when _WS.chat.ring
    //     n = new Notification(title, notif)

module.exports = __notifier_share;
