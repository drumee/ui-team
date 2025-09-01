const specials = new RegExp(/[\[\]\{\}\'\"\ \-\_\+\=\|\!\:\;\,\?\.\/\*\%\$\&\#\(\)]/);

class __drumee_api_signup extends LetcBox {
  constructor(...args) {
    super(...args);
    this.clearMessage = this.clearMessage.bind(this);
    this.showMessage = this.showMessage.bind(this);
    this.showSuccessMessage = this.showSuccessMessage.bind(this);
    this.setErrorButton = this.setErrorButton.bind(this);
    this.checkSanity = this.checkSanity.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.signup = this.signup.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
  }

  static initClass() {
    this.prototype.figName  = "api_signup";
  }

// >>=========================================================
//
// >>=========================================================
  initialize(opt) {
    require('./skin');
    this.mset({ 
      flow : _a.y}); 
    super.initialize(opt);
    return this.declareHandlers();
  }

// ===========================================================
//
// ===========================================================
  clearMessage() {
    return this.__errorMessage.set({content: ""});
  }

// ===========================================================
//
// ===========================================================
  showMessage(msg) {
    return this.__errorMessage.set({content: msg});
  }
  
  showSuccessMessage(msg) {
    this.getPart('ref-input-row').feed(require('./skeleton/correct')(this));
    this.__signinWrapper.el.dataset.mode = _a.closed;
    this.__errorMessage.set({content: msg});
    return this.__errorMessage.el.dataset.success=1;
  }

// >>===========================================================
// 
// >>===========================================================
  setErrorButton(error) {
    this.__wrapperButton.clear();
    if (error === 0) {
      this.__wrapperButton.feed(require('./skeleton/go')(this, 0));
      return this.__refEmail.mset({ 
        service : "signup"});
    } else { 
      return this.__wrapperButton.feed(require('./skeleton/go')(this, 1));
    }
  }

// ===========================================================
//
// ===========================================================
  checkSanity() {
    if (this._sent) {
      return false;
    }
    const emailContent = this.__refEmail.getValue();
    if (!Validator.require(emailContent)) {
      this.showMessage(LOCALE.REQUIRE_EMAIL);
      this.setErrorButton(1);
      return false; 
    }

    if (!this.__refEmail.getValue().isEmail()) {
      this.showMessage(LOCALE.ENTER_A_VALID_EMAIL);
      this.setErrorButton(1);
      return false; 
    } else { 
      this.clearMessage();
      this.setErrorButton(0);
      return true;  
    }
  }
    // @__refEmail.mset
    //   service : null
    

// >>===========================================================
//
// >>===========================================================
  onDomRefresh() {
    return this.feed(require("./skeleton")(this));
  }


// ===========================================================
//
// ===========================================================
  signup() {
    // 
    if (!this.checkSanity()) {
      return;
    }
    const email = this.__refEmail.getValue();
    const a = email.split('@');
    const b = a[0].split('.');
    const firstname = b[0];
    //@debug "zzzzz", email
    // @debug "zzzzz", @getPart(_a.firstname).getValue()
    this.__refButton.set({content:"&#10003"});
    this._sent = 1;
    return this.postService({
      service   : SERVICE.butler.signup, 
      email,
      firstname
    });
  }
      
  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args) {
    if (args == null) { args = {}; }
    const service = cmd.model.get(_a.service);
    if (cmd.status === _e.click) {
      this.clearMessage();
      if (this.__refEmail.getValue().isEmail()) {
        this.setErrorButton(0);
        this.__refButton.el.dataset.error=0;
      }
      this._sent =0;
      return;
    }
    switch (service) {
      case 'clear':
        if (this.__refButton.isDestroyed()) {
          this.setErrorButton(0);
          this.clearMessage();
        }
        this.__refButton.el.dataset.error=1;
        break;

       case 'signup':
        switch (args.__inputStatus) {
          case _e.commit:
            this.signup();      
            break;

          case _a.interactive: 
            if (cmd.status === _a.error) {
              this.__refButton.el.dataset.error=1;
              this.setErrorButton(1);
            } else { 
              if (this.__refButton.isDestroyed()) {
                this.setErrorButton(0);
                this.clearMessage();
              }
              this.__refButton.el.dataset.error=0;
            }
            break;
        }
         break;
            //@checkSanity() 

      case 'send':
        this.signup();
        break;

      case _e.close:
        this.triggerHandlers({service});
        break;
    }
    return cmd = null;
  }

  /**
   * 
   * @param {*} method 
   * @param {*} data 
   * @returns 
   */
  __dispatchRest(method, data) {
    switch (method) {
      case SERVICE.butler.signup:
        if (data.rejected) {
          this.showMessage(data.email.printf(LOCALE.EMAIL_ALREADY_EXISTS));
          this.setErrorButton(1);
          return this.__refButton.set({content:"GO"});
        } else { 

          return this.showSuccessMessage(data.email.printf(LOCALE.VALIDATION_SENT_TO));
        }
    }
  }
}
__drumee_api_signup.initClass();

module.exports = __drumee_api_signup;
