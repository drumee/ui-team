const signal = 'channel:event';
class __bhv_channel extends Marionette.Behavior {
  constructor(...args) {
    super(...args);
    this.initialize = this.initialize.bind(this);
    this.onBeforeRender = this.onBeforeRender.bind(this);
    this.onDestroy = this.onDestroy.bind(this);
    this._onReceive = this._onReceive.bind(this);
    this._channelEvent = this._channelEvent.bind(this);
  }

  initialize(opt){
    return this._started = false;
  }
// ============================
//
// ============================

// ===========================================================
// onBeforeRender
//
// @return [Object] 
//
// ===========================================================
  onBeforeRender() {
    if (this._started) {
      return;
    }
    const c = this.view.model.get(_a.channel);
    this._channel = c;
    if (c != null) {
      const selector = c.selector || _a.selector;
      this._property     = c.name || this.view.get(_a.name);
      this._channelName = `${selector}:${this._property}`;
      RADIO_BROADCAST.on(this._channelName, this._onReceive);
      return this._started = true;
    }
  }
// ======================================================
//
// ======================================================

// ===========================================================
// onDestroy
//
// ===========================================================
  onDestroy() {
    if (this._channelName != null) {
      return RADIO_BROADCAST.off(this._channelName, this._onReceive);
    }
  }
// ======================================================
//
// ======================================================

// ===========================================================
// _onReceive
//
// @param [Object] data
//
// @return [Object] 
//
// ===========================================================
  _onReceive(data) {
    if (!_.isObject(this._channel)) {
      this.warn("Invalid channel definiton", this.view);
      return;
    }
    if (_.isFunction(this.view._channelEvent)) {
      return this.view._channelEvent(data);
    } else {
      return this._channelEvent(data);
    }
  }
// ========================
//
// ========================

// ===========================================================
// _channelEvent
//
// @param [Object] data
//
// ===========================================================
  _channelEvent(data){
    let e, k, val;
    this.debug(">> _click _AA Channel Return : ", data , this._channel);
    const {
      fields
    } = this._channel;
    switch (this._channel.action) {
      case _a.setData:
        if (_.isArray(fields)) {
          const cast = this.view.get('cast') || {};
          for (k of Array.from(fields)) {
            try {
              val = data[this._property];
            } catch (error) {
              e = error;
              val = data;
            }
            if (cast[k] != null) {
              if (_.isFunction(cast[k])) {
                val = cast[k](data[this._property]);
              } else {
                try {
                  val = eval(cast[k])(data[this._property]);
                } catch (error2) {}
              }
            }
            this.view.model.set(k, val);
          }
        } else {
          this.view.model.set(data);
        }
        break;
      case "setStyle":
        var obj = this.view.model.get(_a.styleOpt);
        obj = _.merge(obj, data);
        this.view.model.set(_a.styleOpt,obj);
        break;
      case _a.exec:
        try {
          this.view[this._channel.method](this._channel.options);
        } catch (error1) {
          e = error1;
          this.warn("abnormal exec results", e);
        }
        break;
      case _a.regexp:
        if (_.isObject(data)) {
          val = data[this._property];
        } else {
          val = data;
        }
        if ((val != null) && val.match(this._channel.expect)) {
          val = 1;
        } else {
          val = 0;
        }
        if (_.isArray(fields)) {
          for (k of Array.from(fields)) {
            this.view.model.set(k, val);
          }
        } else if (_.isString(fields)) {
          this.view.model.set(fields, val);
        }
        break;
      default:
        val = data[this._property] === this._channel.expect;
        if (_.isArray(fields)) {
          for (k of Array.from(fields)) {
            this.view.model.set(k, val);
          }
        } else if (_.isString(fields)) {
          this.view.model.set(fields, val);
        }
    }
    if (this._channel.refresh) {
      let r;
      if (_.isFunction(this.view.mould)) {
        r = this.view.mould();
      } else {
        r = this.view.render();
      }
      if (!r) {
        return this.view.refresh();
      }
    }
  }
}
module.exports = __bhv_channel;
