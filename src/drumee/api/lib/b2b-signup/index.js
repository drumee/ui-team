// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/api/lib/b2b-signup/index.coffee
//   TYPE :  
// ==================================================================== *


class __drumee_api_b2b_signup extends LetcBox {
  constructor(...args) {
    super(...args);
  }

  static initClass() {
    this.prototype.figName  = "api_b2b_signup";
    this.prototype.isStream   = 1;
  }

// >>=========================================================
//
// >>=========================================================
  initialize(opt) {
    require('./skin');
    this.mset({flow : _a.y}); 
    super.initialize(opt);
    this.declareHandlers();
    this.debug("STARTING", this.fig.family);
    return
  }

// ===========================================================
//
// ===========================================================
  clearMessage() {
    this.getPart('error-message-wrapper').el.dataset.state = _a.closed
    this.getPart('error-message').set({content: ''})
    this.getPart('go-button-wrapper').el.dataset.state = _a.open 
  }

// ===========================================================
//
// ===========================================================
  showErrorMessage(msg) {
    this.getPart('go-button-wrapper').el.dataset.state = _a.closed
    this.getPart('error-message-wrapper').el.dataset.state = _a.open
    this.getPart('error-message').set({content: msg})
    _.delay(this.clearMessage.bind(this),2500)
    return;
  }

  showSuccessMessage(msg) {
    this.getPart('body-container').feed(require('./skeleton/success-message')(this,msg))
  }

// >>===========================================================
// 
// >>===========================================================
  updateError(error) { return null; }
// ===========================================================
//
// ===========================================================
  checkSanity() { 
    return null;
  }

// >>===========================================================
//
// >>===========================================================
  onDomRefresh() {
    return this.feed(require("./skeleton")(this));
  }


// ===========================================================
//
// ===========================================================
  b2bSignup() {
    const data = this.getData(_a.formItem); 
    this.debug(data);
    if (!this.validateData()) {
      if(this.formError.name.errorList.length){
        this.showErrorMessage(this.formError.name.errorList[0].reason);
        return
      }
      if(this.formError.email.errorList.length){
        this.showErrorMessage(this.formError.email.errorList[0].reason);
        return
      }
      return;
    }
    
    return this.postService({
      service   : SERVICE.butler.signup, 
      email     : data.email,
      name      : data.name,
      method    : 'b2bsignup'
    });
  }


// >>===========================================================
// 
// >>===========================================================
  onUiEvent(cmd, args) {
    let service = cmd.get(_a.service) || cmd.get(_a.name);
    const status = cmd.get(_a.status);
    this.debug("onUiEvent",service,status, this)
    switch (service) {
      case 'b2b-signup-submit':
        this.b2bSignup();
        break;
    }

    return cmd = null; 
  }

// >>===========================================================
// 
//
// >>===========================================================
  __dispatchRest(method, data) {
    // this.debug("SOOOOOOOOOOOO 96 0", method, data);
    switch (method) {
      case SERVICE.butler.signup:
        if (data.rejected) {
          let email = data.email || "";
          this.showErrorMessage(email.printf(LOCALE.EMAIL_ALREADY_EXISTS));
        } else {
          this.showSuccessMessage(LOCALE.B2B_REGISTRATION_SUCCESS_MESSAGE);
        }
    }
  }
}
__drumee_api_b2b_signup.initClass();


module.exports = __drumee_api_b2b_signup;