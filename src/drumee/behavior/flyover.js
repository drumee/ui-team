class __bhv_flyover extends Marionette.Behavior {
  constructor(...args) {
    super(...args);
    this.onRender = this.onRender.bind(this);
    this._shouldContinue = this._shouldContinue.bind(this);
    this._trigger = this._trigger.bind(this);
  }

  static initClass() {
    this.prototype.events = {
      mouseenter : '_trigger',
      mouseleave : '_trigger',
      mousemove  : '_trigger',
      mouseout   : '_trigger',
      mouseover  : '_trigger'
    };
  }

  onRender() {
    this._timer = {};
    this._flyOpt = this.view.get(_a.flyover) || {};
    this._flyOpt.mouseenter = this._flyOpt.mouseenter || {};
    this._flyOpt.mouseover  = this._flyOpt.mouseover || {};
    return this._flyOpt.mouseleave = this._flyOpt.mouseleave || {};
  }


  /**
   * 
   * @param {*} e 
   * @returns 
   */
  _shouldContinue(e) {
    if (this._timer[e.type]) {
      clearTimeout(this._timer[e.type]);
    }
    const r = this.view.get(_a.active) && (this.view._handler != null ? this.view._handler.ui : undefined) && this._flyOpt[e.type];
    if (this.view.model.get(_a.tooltips)) {
      try { 
        if (e.type === _e.mouseenter) {
          this.view.tooltips.style.visibility = ""; 
          this.view.tooltips.dataset.over = _a.on; 
        } else if (e.type === _e.mouseleave) {
          this.view.tooltips.style.visibility = _a.hidden; 
          this.view.tooltips.dataset.over = _a.off;
        }
      } catch (error) {}
    }

    return r;
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  _trigger(e) {
    if (!this._shouldContinue(e)) {
      return true;
    }
    const delay    = parseInt(this._flyOpt[e.type].delay);
    const signal   = this._flyOpt.signal || this.view.get(_a.signal) || _e.flyover;
    const {
      service
    } = this._flyOpt[e.type]; 
    const stoper   = this._flyOpt[e.type].stoper  || _e.mouseleave;
    this.view.status  = e.type;
    this.view.service = service;
    this.view.evt     = e; 
    if ((service == null)) {
      return; 
    }
    if (delay > 0) {
      const f = ()=> {
        return this.view.triggerHandlers();
      };
      return this._timer[stoper] = _.delay(f, delay);
    } else {
       return this.view.triggerHandlers();
     }
  }
}
__bhv_flyover.initClass();
module.exports = __bhv_flyover;
