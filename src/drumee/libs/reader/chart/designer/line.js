
const chart_line = require('Chart.Line');
class designer_chart_line extends chart_line {
  constructor(...args) {
    super(...args);
    this._onClick = this._onClick.bind(this);
    this.onPromptSrc = this.onPromptSrc.bind(this);
  }

  static initClass() {
    behaviorSet({
      bhv_interact:_K.char.empty});
  }
// ==================================================================== *
// _contentClick
// click on myself, called from designer bahavior
// ==================================================================== *

// ===========================================================
// _onClick
//
// @param [Object] e
//
// ===========================================================
  _onClick(e) {
    e.stopPropagation();
    //_MSGBUS.trigger _e.designer.item.click, @
    this._menuOpt = dui.request(_REQ.designer.contextmenu.iframe, this);
    //@triggerMethod _e.select, e  # open context menu
    return this._currentEvent = e;
  }
// ==================================================================== *
// Callback from contextmenu
// ==================================================================== *

// ===========================================================
// onPromptSrc
//
// @param [Object] model
//
// ===========================================================
  onPromptSrc(model) {
    this.model.set(_a.name, _a.source);  // set field name used in the form
    const opt = dui.request(_REQ.ui.form.inline, this.model);
    opt.persistent = _a.none;
    opt.draggable  = true;
    _dbg("onUpdateSrc QQQQ", opt, this.model);
    this._menuOpt = {
      widget : FormPrompt,
      opt
    };
    return this.triggerMethod(_e.menu.inner, this._currentEvent);
  }
}
designer_chart_line.initClass();  // open context menu
module.exports = designer_chart_line;
