class __pulldown extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onBeforeDestroy = this.onBeforeDestroy.bind(this);
    this._select = this._select.bind(this);
    this.getData = this.getData.bind(this);
  }

  static initClass() {
  //   templateName: _T.wrapper.raw
  //   className : "widget select-box"
  // 
  //   behaviorSet
  //     bhv_renderer : _K.char.empty
  //     bhv_trigger : _K.char.empty
  // 
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.className  = "widget select-box";
    behaviorSet({
      bhv_renderer : _K.char.empty,
      bhv_trigger : _K.char.empty
    });
  }
// ============================
//
// ===========================

// ===========================================================
// onAfterInitialize
//
// @param [Object] opt
//
// ===========================================================
  onAfterInitialize(opt) {
    //Type.setMapName(_a.reader)
    this.model.atLeast({
      state   : 0,
      justify : _a.center,
      picto   : _K.char.arrow.down,
      listFlow  : _a.vertical,
      slide     : _a.vertical,
      flow      : _a.vertical,
      sliding   : 'pulldown'
    });
    this.declareHandlers(); //s {part:@, ui:@}, {fork:yes, recycle:yes}
    return RADIO_BROADCAST.on(_e.document.click, this._reset);
  }
// ========================
//
// ========================

// ===========================================================
// onBeforeDestroy
//
// ===========================================================
  onBeforeDestroy() {
    return RADIO_BROADCAST.off(_e.document.click, this._reset);
  }
// ============================================
//
// ============================================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    const args = this.get(_a.values) || this.get(this.get(_a.name));
    if (args != null) {
      this.model.set(_a.content, args.content);
      this.model.set(_a.value, args.value);
      this.render();
    } else if (_.isString(this.get(_a.value))) {
      this.model.set(_a.content, this.get(_a.content));
      this.model.set(_a.value, this.get(_a.value));
    }
    if ((this.get(_a.kids) == null)) {
      this.collection.set(SKL_Note(_e.error, "Should sahehave a skeleton"));
    }
    if (this.model.get(_a.values) != null) {
      return Env.set(this.get(_a.name),  this.model.get(_a.values));
    }
  }
// ============================================
//
// ============================================

// ===========================================================
// _select
//
// @param [Object] child
//
// ===========================================================
  _select(child) {
    this.model.set(_a.values, {value:child.get(_a.value), content:child.get(_a.content)});
    if (this.get(_a.name) != null) {
      return Env.set(this.get(_a.name),  this.model.get(_a.values));
    }
  }
// ========================
//
// ========================

// ===========================================================
// getData
//
// @return [Object] 
//
// ===========================================================
  getData(){
    this.debug("HGFD", {name:this.get(_a.name), values:(this.get(_a.values))}, this);
    return {name:this.get(_a.name), values:(this.get(_a.values))};
  }
}
__pulldown.initClass();
module.exports = __pulldown;
