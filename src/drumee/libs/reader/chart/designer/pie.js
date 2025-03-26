const chart_pie = require('Chart.Pie');
class designer_chart_pie extends chart_pie {
  constructor(...args) {
    super(...args);
    this._onClick = this._onClick.bind(this);
    this.onPromptSrc = this.onPromptSrc.bind(this);
    this.onSelectType = this.onSelectType.bind(this);
    this._respawn = this._respawn.bind(this);
  }

  static initClass() {
    behaviorSet({
      bhv_interact: _K.dummyArgs});
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
    this._menuOpt = dui.request(_REQ.designer.contextmenu.chart.data, this);
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
    this._menuOpt = {
      widget : FormPrompt,
      opt
    };
    return this.triggerMethod(_e.menu.inner, this._currentEvent);  // open context menu
  }
// ==================================================================== *
// Callback from contextmenu
// ==================================================================== *

// ===========================================================
// onSelectType
//
// @param [Object] model
//
// ===========================================================
  onSelectType(model) {
    return _dbg("onSelectType", opt, this.model);
  }
// ==================================================================== *
//
// ==================================================================== *

// ===========================================================
// _respawn
//
// @param [Object] e
//
// ===========================================================
  _respawn(e) {
    return this._draw();
  }
}
designer_chart_pie.initClass();
module.exports =  designer_chart_pie;
