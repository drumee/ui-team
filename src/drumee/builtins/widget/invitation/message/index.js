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
class __invitation_message extends LetcBox {
  static initClass() {
    this.prototype.figName ="invitation_message";
  }

// ===========================================================
//
// ===========================================================
  initialize(opt) {
    require("./skin");
    super.initialize();
    this.declareHandlers();
    return this.model.set({ 
      flow : _a.y});
  }

// ===========================================================
// onDomRefresh
// ===========================================================
  onDomRefresh() {
    return this.feed(require("./skeleton/main")(this));
  }
    
// ===========================================================
// 
// ===========================================================
  onUiEvent(cmd) {
    const service = cmd.service || cmd.mget(_a.service);
    switch (service) {
      case _e.update:
        this.service = service;
        this.mget(_a.trigger).mset(_a.state, 0);
        this.triggerHandlers();
        return this.suppress();
    }
  }

// ===========================================================
// 
// ===========================================================
  getData() {
    const a = 
      {message : this.getPart("ref-message").getData().value};
    return a;
  }
}
__invitation_message.initClass();

module.exports = __invitation_message;