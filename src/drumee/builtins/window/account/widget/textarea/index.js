/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/invitation/message/message
// ==================================================================== *

class __account_textarea extends LetcBox {
  static initClass() {
  // ===========================================================
  //
  // ===========================================================
    this.prototype.figName  = "account_textarea";
  }

// ===========================================================
//
// ===========================================================
  initialize(opt) {
    super.initialize();
    return this.model.set({ 
      flow : _a.y});
  }

// ===========================================================
// onDomRefresh
// ===========================================================
  onDomRefresh() {
    this.declareHandlers(); //s { part: @, ui: @}
    return this.feed(require("./skeleton")(this));
  }

// ===========================================================
// 
// ===========================================================
  onUiEvent(cmd) {
    const service = cmd.service || cmd.mget(_a.service);
    this.debug(`AAAAAA FFF 96service=${service}`, cmd, cmd.mget(_a.state), cmd);
    switch (service) {
      case _e.update:
        this.service = service;
        this.mget(_a.trigger).mset(_a.state, 0);
        return this.triggerHandlers();
    }
  }
        //@softDestroy()
// ===========================================================
// 
// ===========================================================
  getData() {
    const a = 
      {message : this.getPart("ref-message").getData().value};
    return a;
  }
}
__account_textarea.initClass();

module.exports = __account_textarea;