class __lookup extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDataFound = this.onDataFound.bind(this);
    this.onBubble = this.onBubble.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onUpdate = this.onUpdate.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.onError = this.onError.bind(this);
    this.onReject = this.onReject.bind(this);
    this.onReset = this.onReset.bind(this);
    this.getData = this.getData.bind(this);
  }

  static initClass() {
  //   templateName: _T.wrapper.raw
  //   className : "widget select-box"
  // 
  //   behaviorSet
  //     bhv_trigger : _K.char.empty
  //     bhv_renderer :
  //       eval_code  : _a.yes
  //     bhv_spin     :
  //       auto       : _a.off
  // 
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.className  = "widget select-box";
    behaviorSet({
      bhv_trigger : _K.char.empty,
      bhv_renderer : {
        eval_code  : _a.yes
      },
      bhv_spin     : {
        auto       : _a.off
      }
    });
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
      state   : 0,
      justify : _a.center,
      picto   : _K.char.arrow.down,
      listFlow  : _a.vertical,
      slide     : _a.vertical,
      flow      : _a.vertical,
      value     : _K.char.empty
    });
    this._api = _.clone(this.get(_a.api));
    return this.declareHandlers(); //s {part:@, ui:@}, {fork:yes, recycle:yes}
  }
// ============================================
//
// ============================================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    if ((this.get(_a.kids) == null)) {
      this.collection.set(SKL_Note(_e.error, "Should sahehave a skeleton"));
    }
    if (this.model.get(_a.values) != null) {
      return Env.set(this.get(_a.name),  this.model.get(_a.values));
    }
  }
// ==================== *
//
// ==================== *

// ===========================================================
// onDataFound
//
// @param [Object] method
// @param [Object] data
//
// @return [Object] 
//
// ===========================================================
  onDataFound(method, data) {
    this.debug(">>AA>>24 >>22 11 onDataFound", data, this, this.getPart('lookup'));
    const c = _.map(data, el=> {
      if ((this._api == null)) {
        return el;
      }
      for (var k in this._api) {
        var v = this._api[k];
        if (k !== 'method') {
          el[k] = v;
        }
      }
      return el;
    });
    if (data != null ? data.length : undefined) {
      this.getPart(_a.list).collection.set(data);
      return this.triggerMethod(_a.open);
    }
  }
// ==================== *
//
// ==================== *

// ===========================================================
// onBubble
//
// @param [Object] child
//
// ===========================================================
  onBubble(child) {
    return this.debug(">>22 toogle",
    this.triggerMethod(_e.toggle, child));
  }
// ==================== *
//
// ==================== *

// ===========================================================
// onClick
//
// @param [Object] child
//
// ===========================================================
  onClick(child) {
    return this.debug(">>1222 onClick",
    this.triggerMethod(_e.toggle));
  }
// ==================== *
//
// ==================== *

// ===========================================================
// onUpdate
//
// @param [Object] child
//
// ===========================================================
  onUpdate(child) {
    return this.debug(">>22 onUpdate", child);
  }
    //@triggerMethod _e.toggle, child
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
    //@debug ">>1222_select", child
    this.model.set(_a.values, {value:child.get(_a.value), content:child.get(_a.content)});
    if (this.get(_a.name) != null) {
      return Env.set(this.get(_a.name),  this.model.get(_a.values));
    }
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
    let val;
    try {
      val = this.get(_a.values).content || this.get(_a.values).value || this.get(_a.value);
    } catch (e) {
      val = _K.char.empty;
    }
    switch (pn) {
      case 'lookup':
        var opt = {
          method : this._api.method,
          value  : this._api.value,
          values : this.get(_a.values)
        };
        child.model.set(_a.api, opt);
        child.model.set(_a.name, this.get(_a.name));
        return this.set(val);
      case _a.list:
        var map = __guard__(this.get(_a.api), x => x.map);
        if (map != null) {
          return child.options.kidsMap = JSON.parse(map.replace(/\'/g, '"'));
        }
        break;
    }
  }
// ========================
//
// ========================

// ===========================================================
// onError
//
// @param [Object] xhr
//
// ===========================================================
  onError(xhr){
    this.triggerMethod(_e.spinner.stop);
    return RADIO_BROADCAST.trigger(_e.error, xhr);
  }
// ========================
//
// ========================

// ===========================================================
// onReject
//
// @param [Object] msg
//
// ===========================================================
  onReject(msg){
    this.triggerMethod(_e.spinner.stop);
    this.collection.add({kind:KIND.note, content:msg, className: _a.error});
    return this._flag = this.children.findByIndex(this.collection.length-1);
  }
// ========================
//
// ========================

// ===========================================================
// onReset
//
// ===========================================================
  onReset(){
    try {
      return this._flag.destroy();
    } catch (error) {}
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
    const val = this.get(_a.values) || _K.char.empty;
    this.debug("getData", {name:this.get(_a.name), values:val}, this);
    return {name:this.get(_a.name), values:val};
  }
}
__lookup.initClass();
module.exports = __lookup;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
