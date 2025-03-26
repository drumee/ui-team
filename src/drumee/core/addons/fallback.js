
const _msg = function(_ui_, msg){
  let a;
  return a = `\
<div class=\"${_ui_.fig.family}__header\"> \
<svg data-service=\"close\"  class=\"${_ui_.fig.family}__close error__close\"> \
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-cross\"></use> \
</svg> \
</div> \
<div class=\"${_ui_.fig.family}__text\"><p>${msg}</p></div>\
`;
};


// -----------------------------------------------------------
//
// -----------------------------------------------------------
class __core_failover extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.initialize = this.initialize.bind(this);
    this.dispatchUiEvent = this.dispatchUiEvent.bind(this);
  }

  static initClass() {
    this.prototype.events =
      {click       : 'dispatchUiEvent'};
  
    this.prototype.figName        = "core_failover";
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    this.model = this.model || new Backbone.Model();
    this.style = this.style || new Backbone.Model();
    this.model.atLeast({
      innerClass : _a.error});
    console.trace();
    return this.fig = 
      {family : 'core-failover'};
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    const msg = this.getOption(_a.content) || `Snippet **${this.getOption(_a.kind)}** was not found`;
    this.el.innerHTML = _msg(this, msg);
    return this.el.onclick = this.dispatchUiEvent;
  }
    
  dispatchUiEvent(e) {
    if (mouseDragged) {
      return;
    }
    return this.softDestroy();
  }
}
__core_failover.initClass();

module.exports = __core_failover;
