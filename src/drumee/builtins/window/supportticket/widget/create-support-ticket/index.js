class ___create_supportTicket extends LetcBox {
  initialize(opt) {
    if (opt == null) { opt = {}; }
    require('./skin');
    super.initialize();
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
    return this.feed(require('./skeleton')(this));
  }

// ===========================================================
// 
// ===========================================================
  onUiEvent(cmd) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    const status = cmd.get(_a.status);
    this.debug(`onUiEvent service = ${service}`, cmd, this);

    switch (service) {
      case _a.none:
        return this.debug("Created by kind builder");
      default:
        return this.debug("Created by kind builder");
    }
  }
}

// ===========================================================
//
// ===========================================================
  // __dispatchPush: (service, data)->
  //   switch service
  //     when SERVICE.no_service
  //       @debug "Created by kind builder"


module.exports = ___create_supportTicket;
