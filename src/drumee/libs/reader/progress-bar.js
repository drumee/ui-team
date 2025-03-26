const { toPercent } = require("core/utils")

class __progress_bar extends LetcBox {
  constructor(...args) {
    this.__dispatchRest = this.__dispatchRest.bind(this);
    this._onBusEvent = this._onBusEvent.bind(this);
    this.percent = this.percent.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    super(...args);
  }

  static initClass() {
    this.prototype.nativeClassName  = "widget pb-box";
    this.prototype.behaviorSet =
      {socket : 1};
  }
// ============================
//
// ===========================

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    super.initialize(opt);
    //Type.setMapName(_a.reader)
    this.model.atLeast({
      total     : 100,
      available : 60,
      min       : 0,
      max       : 100,
      flow      : _a.horizontal,
      master : this,
      unit   : "MB",
      api    : {
        api : _RPC.req.ping,
        value : {
          total : 100,
          available : 83
        }
      }
    });
    return this.declareHandlers(); //s {part:@, ui:@, api:@}, {fork:yes, recycle:yes}
  }
// ============================================
//
// ============================================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    this.debug("onPartRegister", this.parent._handler);
    if (!_.isEmpty(this.get(_a.api))) {
      this.triggerMethod(_e.rpc.read, this.get(_a.api));
    }
    try {
      return this.parent._handler.part.triggerMethod("part:register", this, this.get(_a.sys_pn));
    } catch (error) {}
  }
// ============================
//
// ============================

// ===========================================================
// __dispatchRest
//
// @param [Object] method
// @param [Object] data
//
// ===========================================================
  __dispatchRest(method, data) {
    this.model.set(data);
    const total = this.get('total');
    const available = this.get('available');
    const $full = this.getPart('full-bar').$el;
    //@debug "__dispatchRest available=#{available}", $full, method, data,@
    TweenMax.set($full, {width:0});
    TweenMax.to($full, .8, {width:toPercent((total-available)/total)});
    this.getPart('empty-bar').$el.width(toPercent(available/total));
    try {
      return this.getPart('title').$el.find('.value').html(available);
    } catch (error) {}
  }
// ============================
//
// ============================

// ===========================================================
// _onBusEvent
//
// ===========================================================
  _onBusEvent() {
    return this.debug("_onBusEvent", method, data);
  }
// ============================
//
// ============================

// ===========================================================
// percent
//
// @param [Object] value
//
// ===========================================================
  percent(value) {
    value = parseInt(value);
    if (value > 100) {
      value = 100;
    }
    if ((value < 0) || !_.isFinite(value)) {
      value = 0;
    }
    const $full = this.getPart('full-bar').$el;
    TweenMax.to($full, .8, {width:toPercent(value)});
    return this.getPart('empty-bar').$el.width(toPercent(100-value));
  }
// ==================== *
//
// ==================== *

// ===========================================================
// onPartReady
//
// @param [Object] child
// @param [Object] pn
// @param [Object] section
//
// ===========================================================
  onPartReady(child, pn, section) {
    switch (pn) {
      case 'full-bar':
        return child.$el.width(0); //toPercent((total-available)/total)
      case 'empty-bar':
        return child.$el.width("100%");
    }
  }
}
__progress_bar.initClass();
module.exports = __progress_bar;
