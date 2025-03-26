class __notifier_generic extends LetcBox {
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
// ===========================================================
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this.model.set({ 
      flow    : _a.none});
    return this.bindEvent(this.fig.name, "signaling.dial");
  }
    //@bindEvent "my_module"

// ===========================================================
//
// ===========================================================
  onDestroy(cmd) {}
    //#@unbindEvent()

// ===========================================================
//
// ===========================================================
  getNotification(data) {
    if (this.mget(_a.api)) { 
      this.fetchService(this.mget(_a.api));
      return; 
    }

    return this.fetchService({
      service     : SERVICE.contact.invite_count,
      hub_id : Visitor.id
    });
  }
      
    //@fetchService
    //  service     : "my_module.do_this"

// ===========================================================
//
// ===========================================================
  onDomRefresh(){
    this.feed(require('./skeleton')(this));
    return this.getNotification();
  }

// ===========================================================
//
// ===========================================================
  onUiEvent(cmd) {
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
    this.__counter.model.set(_a.content, count);
    if (_.isEmpty(count)) {
      this.__counter.el.hide();
    } else { 
      this.__counter.render();
      this.__counter.el.show();
    }

    return this.trigger(_e.update);
  }

// ===========================================================
//
// ===========================================================
  __dispatchPush(service, data){
    return this.debug("generic notifier __dispatchPush", service, data);
  }

// ===========================================================
//
// ===========================================================
  __dispatchRest(service, data){
    this.debug("generic notifier __dispatchRest ", service, data);
    return this.update(data);
  }
}
__notifier_generic.initClass();
    
  
module.exports = __notifier_generic;
