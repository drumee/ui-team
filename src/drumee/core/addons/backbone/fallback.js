const _msg = function(_ui_, msg){
  let a;
  return a = `
    <div class="${_ui_.fig.family}__header"> 
      <svg data-service="close"  class="${_ui_.fig.family}__close error__close"> 
        <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#--icon-cross"></use> 
      </svg> 
    </div> 
    <div class="${_ui_.fig.family}__text"><p>${msg}</p></div> 
    <div class="${_ui_.fig.family}__report error__report">
      <a href="/#/report">Report</a>
    </div>`;
};

/**
 * 
 */
class __core_failover extends Marionette.View {

  static initClass() {
    this.prototype.events =
      {click : 'dispatchUiEvent'};
    this.prototype.figName  = "core_failover";
  }

  /**
   * 
   * @returns 
   */
  initialize() {
    this.model = this.model || new Backbone.Model();
    this.model.atLeast({
      innerClass : _a.error});
    console.trace();
    const msg = this.getOption(_a.content) || "Snippet not found";
    this.fig = 
      {family : 'core-failover'};
    return this.model.set({  
      templateName: "#--wrapper-content",
      kind    : KIND.note, 
      content : _msg(this, msg)
    });
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  dispatchUiEvent(e) {
    switch (e.getService(this.el)) {
      case _e.close:
        return this.softDestroy();
    }
  }
}
__core_failover.initClass();

module.exports = __core_failover;
