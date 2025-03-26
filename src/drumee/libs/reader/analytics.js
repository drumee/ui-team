class __analytics extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onAfterInitialize = this.onAfterInitialize.bind(this);
    this.onBeforeAddChild = this.onBeforeAddChild.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this._setData = this._setData.bind(this);
  }

  static initClass() {
    this.prototype.className  = "widget analytics";
    this.prototype.behaviorSet =
      {socket:1};
  }

// ===========================================================
// onAfterInitialize
//
// @return [Object] 
//
// ===========================================================
  onAfterInitialize() {
    this.model.atLeast({
      flow        : this.getOption(_a.flow)    || _a.horizontal});
    if (this.get(_a.api) != null) {
      this.triggerMethod(this.get(_a.api));
      return;
    }
    const ref = this.get(_a.reference);
    if (ref != null) {
      if (_.isString(ref)) {
        try {
          this._setData(eval(ref));
        } catch (error) {
          this.warn(WARNING.invalidArg.format(r));
          return;
        }
      } else {
        this._setData(ref);
      }
    }
    return this.declareHandlers(); //s({part:@})
  }
// ========================
//
// ========================

// ===========================================================
// onBeforeAddChild
//
// @param [Object] child
//
// ===========================================================
  onBeforeAddChild(child) {
    return child.initHandlers({part:this});
  }
// =================== *
//
// =================== *

// ===========================================================
// onPartReady
//
// @param [Object] child
// @param [Object] pn
//
// ===========================================================
  onPartReady(child, pn) {
    //@debug ">>343 onPartReady", child.get(_a.value)
    const name = child.get(_a.name) || pn;
    if (this._data[name] != null) {
      return child.model.set(_a.value, this._data[name]);
    }
  }
// ==================================================================== *
//
// ==================================================================== *

// ===========================================================
// _setData
//
// @param [Object] args
//
// @return [Object] 
//
// ===========================================================
  _setData(args) {
    if ((args == null)) {
      this.warn(WARNING.arguments.bad_value);
      return;
    }
    if (_.isObject(args)) {
      return this._data = args;
    } else if (args.hasOwnProperty(_a.model)) {
      return this._data = args.model.toJSON();
    } else if (args.hasOwnProperty(_a.attributes)) {
      return this._data = args.toJSON();
    }
  }
}
__analytics.initClass();
module.exports = __analytics;
