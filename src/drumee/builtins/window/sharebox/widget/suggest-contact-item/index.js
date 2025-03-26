// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : src/drumee/builtins/window/sharebox/widget/contact-item/index.js
//   TYPE : Component
// ==================================================================== *

class ___suggestion_contact_item extends LetcBox {

// ===========================================================
//
// ===========================================================
  initialize(opt) {
    if (opt == null) { opt = {}; }
    super.initialize();
    require('./skin');
    return this.declareHandlers();
  }

// ===========================================================
// 
// ===========================================================
  onPartReady(child, pn, section) {
    switch (pn) {
      case _a.none:
        return this.debug("Created by kind builder");
      default:
        return this.debug("Created by kind builder");
    }
  }

// ===========================================================
// 
// ===========================================================
  onDomRefresh(){
    return this.feed(require('./skeleton').default(this));
  }

// ===========================================================
// 
// ===========================================================
  onUiEvent(cmd) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    this.debug(`onUiEvent service = ${service}`, cmd, this)
    this.source = cmd;
    this.service = service;
    return this.triggerHandlers();
  }

}


module.exports = ___suggestion_contact_item;
