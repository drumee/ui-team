class ___email_input_item extends LetcBox {

// ===========================================================
//
// ===========================================================
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onValidateError = this.onValidateError.bind(this);
    this.onValidateSuccess = this.onValidateSuccess.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
  }

  initialize(opt) {
    if (opt == null) { opt = {}; }
    require('./skin');
    super.initialize();
    this.declareHandlers();
    this._errors = {};
    return this._valid  = {};
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
// onValidateError 
// ===========================================================
  onValidateError(cmd){ 
    // @debug "onValidateError",cmd,@
    this.source =  cmd.source;
    this.service = 'is-error';
    return this.triggerHandlers();
  }
// ===========================================================
// onValidateSuccess
// ===========================================================
  onValidateSuccess(cmd){
    // @debug "onValidateSuccess",cmd,@
    this.service = 'is-valid';
    this.source =  cmd.source;
    return this.triggerHandlers();
  }

// ===========================================================
// 
// ===========================================================
  onUiEvent(cmd) {
    const service = cmd.service || cmd.get(_a.service) || cmd.get(_a.name);
    const status = cmd.get(_a.status);
    // @debug "SERVI CE=#{service}"
    this.debug(`___email_input_item onUiEvent SERVICE=${service}`,cmd, this);

    switch (service) {
      case _e.destroy:
        return this.goodbye();
      case 'tick':
        this.service = 'is-default';
        this.triggerHandlers();
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


module.exports = ___email_input_item;
