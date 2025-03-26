class __composite_visitor extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onBeforeAddChild = this.onBeforeAddChild.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
  }

  static initClass() {
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.className  = "widget visitor";
  }

// ===========================================================
// onAfterInitialize
//
// @param [Object] opt
//
// ===========================================================
  onAfterInitialize(opt) {
    //Type.setMapName(_a.reader)
    return this.model.atLeast({
      justify : _a.top,
      picto   : _a.rss,
      innerClass : _K.char.empty,
      flow : _a.vertical
    });
  }
// ========================
//
// ========================

// ===========================================================
// onBeforeAddChild
//
// @param [Object] child
// @param [Object] pn
// @param [Object] section
//
// ===========================================================
  onBeforeAddChild(child, pn, section) {
    //@debug "DSDSDSDSD onBeforeAddChild", child, child.get('sys_pn')
    if (child.get('sys_pn') === _a.image) {
      const bg = require('options/css/background')(this, `url('?m=drumate.photo&id=${Visitor.get(_a.id)}')`);
      let style = child.get(_a.styleOpt);
      style = _.merge(style, bg);
      child.model.extend(_a.styleOpt, style);
      return child.refresh();
    }
  }
// ============================================
//
// ============================================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    if (!this.get(_a.kids)) {
      return this.feed(require('skeleton/visitor')(this));
    }
  }
}
__composite_visitor.initClass();
module.exports = __composite_visitor;
