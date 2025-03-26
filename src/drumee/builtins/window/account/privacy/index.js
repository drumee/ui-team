require('./skin');
class __account_privacy extends LetcBox {

  static initClass() {
    this.prototype.figName  ="account_privacy";
    this.prototype.behaviorSet  = 
      {bhv_socket:1};
  }

// ===========================================================
// initialize
// ===========================================================

  initialize(opt) {
    super.initialize(opt);
    return this.declareHandlers();
  }

// ===========================================================
// onDomRefresh
// ===========================================================
  onDomRefresh() {
    this.declareHandlers(); //s {part: @, ui: @}, {fork: yes, recycle: yes}
    return this.feed(require('./skeleton')(this));
  }

// ===========================================================
// 
// ===========================================================
  onUiEvent(cmd, args) {
    return this.debug("SSSS");
  }
}
__account_privacy.initClass();
module.exports = __account_privacy;
