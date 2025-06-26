class include_howto extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.initialize = this.initialize.bind(this);
    this._click = this._click.bind(this);
  }

  static initClass() {
    this.prototype.templateName = _T.picto.label;
    this.prototype.className = "btn-how-to";
    this.prototype.events =
      {click : '_click'};
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
  initialize(opt) {
    if ((this.model == null)) {
      this.model = new Backbone.Model();
    }
    const attr = {
      label : _LOCALE(_I.HOW_TO),
      picto   : _p.question_circle,
      source  : `${protocol}://home.drumee.com/#faq`
    };
    _.extend(attr, this.model.attributes);
    return this.model.set(attr);
  }
// ========================
//
// ========================

// ===========================================================
// _click
//
// ===========================================================
  _click() {
    const source =  this.model.get(_a.source) || this.getOption(_a.source);
    if (source != null) {
      const content = new require('Include')({
        source});
      content.addListener(this);
      const popup = new require('UI.Popup')({
        className : "bg-white absolute",
        content
      });
      return dui.fullscreenRegion.show(popup);
    } else {
      return RADIO_BROADCAST.trigger(_e.info, _I.NO_TUTORIAL);
    }
  }
}
include_howto.initClass();
module.exports = include_howto;
