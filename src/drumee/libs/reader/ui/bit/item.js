const _pictos = {
  0         : _p.circle_o,
  1         : _p.dot_circle_o,
  false     : _p.circle_o,
  true      : _p.dot_circle_o,
  no        : _p.circle_o,
  yes       : _p.dot_circle_o,
  1         : _p.dot_circle_o,
  undefined : _p.circle_o
};
const _boolean = {
  0: _a.false,
  1: _a.true
};
const _state = {
  0         : 0,
  1         : 1,
  false     : 0,
  true      : 1,
  no        : 0,
  yes       : 1,
  undefined : 0
};
//-------------------------------------
//
// bit_item
//-------------------------------------
class __bit_item extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.initialize = this.initialize.bind(this);
    this._createPictos = this._createPictos.bind(this);
    this._click = this._click.bind(this);
    this.onRender = this.onRender.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.getState = this.getState.bind(this);
  }

  static initClass() {
  //   templateName: _T.box.check
  //   className : "box-check"
  //   tagName: _K.tag.li
  // 
  //   events:
  //     mousemove  : '_hover'
  //     mouseleave : '_leave'
  //     click      : '_click'
  // 
  //   ui:
  //     label      : '.label'
  //     value      : '.value'
  // 
  //   behaviorSet
  //     bhv_renderer  : _K.string.empty
  // 
  // 
    this.prototype.templateName = _T.box.check;
    this.prototype.className  = "box-check";
    this.prototype.tagName = _K.tag.li;
    this.prototype.events = {
      mousemove  : '_hover',
      mouseleave : '_leave',
      click      : '_click'
    };
    this.prototype.ui = {
      label      : '.label',
      value      : '.value'
    };
    behaviorSet({
      bhv_renderer  : _K.string.empty});
  }
// ========================
//
// ========================

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt){
    this.model.atLeast({
      state     : 0,
      label     : _K.char.empty
    });
    const state = this.model.get(_a.state);
    this._createPictos();
    //@_pictos = _pictos
    this.model.set(_a.picto, this._pictos[state]);
    return this.model.set(_a.state, _state[state]);  // Set to binary value
  }
    //@extendFromModel [_a.template]
    //_dbg ">>bits Bit initialize", @
// ========================
//
// ========================

// ===========================================================
// _createPictos
//
// ===========================================================
  _createPictos(){
    const pictos = this.get(_a.pictos);
    this._pictos = {};
    if (pictos != null) {
      let i = 0;
      return (() => {
        const result = [];
        const object = [0, 1, _a.yes, _a.no, _a.false, _a.true, 1, 'undefined'];
        for (var k in object) {
          var p;
          var v = object[k];
          if (_.isArray(pictos)) {
            p = pictos[i%2];
            i++;
          } else {
            p = pictos;
          }
          result.push(this._pictos[k] = p);
        }
        return result;
      })();
    } else {
      return this._pictos = _pictos;
    }
  }
    //_dbg ">>bits Bit initialize", @
// ========================
//
// ========================

// ===========================================================
// _click
//
// @param [Object] e
//
// @return [Object] 
//
// ===========================================================
  _click(e){
    e.stopPropagation();
    _dbg("Bit _click", this);
    if (!this.get(_a.active)) {
      return;
    }
    const state = parseInt(this.model.get(_a.state));
    this.model.set(_a.state, 1^state);
    //_dbg "Bit _trigger #{state} => #{@model.get(_a.state)}"
    return this.trigger(_e.update, this);
  }
// ========================
//
// ========================

// ===========================================================
// onRender
//
// ===========================================================
  onRender(){
    const state = this.model.get(_a.state);
    this.$el.attr(_a.data.state, state);
    this.$el.attr(_a.data.flow, this.model.get(_a.flow));
    return this.model.set(_a.picto, this._pictos[state]);
  }
// ========================
//
// ========================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh(){
    //_dbg "Bit Ready DQDQDS"
    const subClasses = this.getOption(_a.subClasses) || this.model.get(_a.subClasses);
    //_dbg "Item _setup = template = #{@template}", @, @getOption _a.subClasses
    let lclass = _C.flexgrid;
    if (subClasses != null) {
      lclass = subClasses.label;
      this.ui.value.addClass(subClasses.value);
    }
    this.ui.label.addClass(lclass);
    this.$el.attr(_a.data.flow, this.model.get(_a.flow));
    return this.trigger(_e.ready);
  }
// ========================
//
// ========================

// ===========================================================
// getState
//
// @return [Object] 
//
// ===========================================================
  getState(){
    const state = this.model.get(_a.state);
    if (_state[state] != null) {
      return _state[state];
    }
    return 0;
  }
}
__bit_item.initClass();
module.exports = __bit_item;
