/* ==================================================================== *
*   Copyright Xialia.com  2011-2020
*   FILE : /src/drumee/modules/welcome/signup/index.js
*   TYPE : Component
* ==================================================================== */
// <reference path="../../../../../@types/index.d.ts" />

const __welcome_interact = require('../interact');

/**
 * Class representing signup page in Welcome module.
 * @class __welcome_signup
 * @extends __welcome_interact
 */

class __welcome_signup extends __welcome_interact {

  /**
   ** @param {object} opt
  */
  initialize (opt = {}) {
    // @ts-ignore
    require('./skin');
    super.initialize(opt);
    this._secret = this.mget(_a.secret) || ''
    this._type = '';
    this._method = {};
    this.declareHandlers();
  }

  /**
   *
  */
  onDomRefresh() {
    if (this.mget(_a.secret)) {
      this.postService({
        service : SERVICE.butler.check_token,
        secret  : this._secret,
      })
    } else {
      return this.triggerHandlers({service: 'redirect-to-home'})
    }
  }

  /**
   * @param {LetcBox} child
   * @param {LetcBox} pn
  */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.header:
        child.feed(require('./skeleton/header').default(this));
        break
      
      default:
        return super.onPartReady(child, pn);
    }
  }

  /**
   *
  */
  route () {
    let _content;
    switch (this._method) {
      case 'company':
        _content = require('./skeleton/company').default(this)
        break
    
      case _a.password:
        if (this._type === _a.signup) {
          _content = require('./skeleton/b2csignup').default(this)
          break
        }

        _content = require('./skeleton/password').default(this)
        break
      
      case 'personaldata':
        _content = require('./skeleton/personal').default(this)
        break
      
      case 'otpverify':
      case 'otpresend':
        _content = require('./skeleton/otp').default(this)
        let a = () => {
          this.__noCodeOptions.el.dataset.mode = _a.open
        }
        _.delay(a, Visitor.timeout(15000))
        break
      
      case 'change-mobile-number':
        _content = require('./skeleton/change-mobile-number').default(this)
        break
      
      case 'get-mobile-number':
        _content = require('./skeleton/get-mobile-number').default(this)
        break
      
      case 'complete':
        //return this.initLoader();
        //location.hash = _K.module.welcome_intro;
        return this.gotSignedIn(_K.module.welcome_intro)
        //return location.reload();
      
      default:
        return Welcome.say('invalid_step')
    }

    this.__header.feed(require('./skeleton/header').default(this))
    return this.__content.feed(_content)
  }

  /**
   * @param {LetcBox} cmd
   * @param {any} args
  */
  onUiEvent (cmd, args) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    this.debug(`onUiEvent service = ${service}`, cmd, this);

    switch(service) {
      case 'create-company':
        return this.createCompany();
      
      case 'create-password':
        return this.createPassword();
      
      case 'create-b2c-signup-data':
        return this.createB2CSignupData(cmd)
      
      case 'create-b2c-user':
        return this.createB2CUser(cmd);
      
      case 'create-personal-data':
        return this.createPersonalData();
      
      case 'verify-code':
        return this.verifyCode();

      case 'skip-mobile-otp':
        return this.skipMobileOtp()
      
      case 'resend-otp':
        return this.resendOTP()
      
      case 'change-mobile-number':
        return this.changeMobileNumber()

      case 'update-mobile-number':
        return this.updateMobileNumber()
      
      case 'open-terms-and-conditions':
        return this.loadTermsAndConditions()
      
      case _e.download:
        return this.downloadTermsAndConditions()
      
      case 'accept-conditions':
        return this.acceptConditions()
      
      default:
        this.debug("Created by kind builder");
    }
  }

  /**
   *
  */
  createCompany () {
    this.validateData()
    if (this.formStatus == _a.error) {
      this.debug('invalid data', this)
      return
    }

    const data = this.getData(_a.formItem)

    return this.postService({
      service : SERVICE.butler.b2b_signup_company,
      secret  : this._secret,
      name    : data.company_name,
      ident   : data.url_address
    })
  }

  /**
   *
  */
  createPassword () {
    if (! this.checkSanity()) {
      this._input.showError()
      const msg = LOCALE.CREATE_A_PASSWORD
      return this.renderMessage(msg)
    }

    const data = this._input.getData()

    return this.postService({
      service  : SERVICE.butler.b2b_signup_password,
      secret   : this._secret,
      password : data.value
    })
  }

  /**
   * @param {LetcBox} cmd
  */
  createB2CSignupData (cmd) {
    this.validateData()
    if (this.formStatus == _a.error) {
      let msg = LOCALE.FILL_REQUIRED_FIELDS
      return this.renderMessage(msg)
    }

    if (! this.checkSanity()) {
      this._input.showError()
      let msg = '';
      if(!this._input.getValue()){
        msg = LOCALE.CREATE_A_PASSWORD
      } else {
        msg = LOCALE.PASSWORD_NOT_STRONG
      }
      return this.renderMessage(msg)
    }

    const data = this.getData(_a.formItem)
    data.passData = this._input.getData().value

    if(!data.condition) {
      const msg = LOCALE.CLICK_AND_ACCEPT_CONDITIONS
      return this.renderMessage(msg)
    }

    this._b2cData = data;
    // Skip by default when B2C
    //this._method = 'get-mobile-number';
    //return this.route()
    let api = {
      service   : SERVICE.butler.b2c_signup_password,
      secret    : this._secret,
      firstname : data.firstname,
      lastname  : data.lastname,
      password  : data.passData
    }
    this.postService(api);
  }


  /**
   * @param {LetcBox} cmd
  */
  createB2CUser (cmd) {
    return;
    // SKIPPED ON B2C USER
    // let api = {
    //   service   : SERVICE.butler.b2c_signup_password,
    //   secret    : this._secret,
    //   firstname : this._b2cData.firstname,
    //   lastname  : this._b2cData.lastname,
    //   password  : this._b2cData.passData
    // }
    
    //   const data = this.getData(_a.formItem);
    // if (cmd.mget(_a.type) != 'skip-mobile') {
    //   this.validateData();
    //   if (this.formStatus == _a.error) {
    //     if(!data.areacode || !data.mobile){
    //       return this.renderMessage(LOCALE.VALID_PHONE_NO)
    //     }
    //   }

    //   if (!/^\+/.test(data.areacode)) {
    //     data.areacode = `+${data.areacode}`  // to add + to the area code --  do not change/remove
    //   }
    //   api.areacode = data.areacode
    //   api.mobile = data.mobile
    // }

    // return this.postService(api);
  }

  /**
   *
  */
  createPersonalData () {
    this.validateData()
    if (this.formStatus == _a.error) {
      const msg = LOCALE.FILL_REQUIRED_FIELDS
      return this.renderMessage(msg)
    }

    const data = this.getData(_a.formItem)

    if(!data.condition) {
      const msg = LOCALE.CLICK_AND_ACCEPT_CONDITIONS
      return this.renderMessage(msg)
    }
    
    if (!data.areacode.includes('+')) {
      data.areacode = '+' + data.areacode  // to add + to the area code --  do not change/remove
    }

    this.postService({
      service   : SERVICE.butler.b2b_signup_personaldata,
      secret    : this._secret,
      firstname : data.firstname,
      lastname  : data.lastname,
      city      : data.city,
      areacode  : data.areacode,
      mobile    : data.mobile
    })
  }

  /**
   * 
  */
  verifyCode () {
    this.validateData()
    if (this.formStatus == _a.error) {
      const msg = LOCALE.ENTER_CODE_RECEIVED//'Please enter the code received  on your mobile.'
      return this.renderMessage(msg)
    }

    const data = this.getData(_a.formItem)
    
    let _service = SERVICE.butler.b2c_signup_otpverify;
    if (this._type == 'b2bsignup') {
      _service = SERVICE.butler.b2b_signup_otpverify;
    }
    
    return this.postService({
      service : _service,
      secret  : this._secret,
      code    : data.code
    })
  }

  /**
   * 
   */

  skipMobileOtp(){
    this.postService({
      service : SERVICE.butler.b2c_signup_skip_otpverify,
      secret  : this._secret
    }).then((data)=>{
      this.debug(data)
      this.initLoader()
    });
  }

  /**
   *
  */
  resendOTP () {
    let _service = SERVICE.butler.b2c_signup_otpresend;
    if (this._type == 'b2bsignup') {
      _service = SERVICE.butler.b2b_signup_otpresend;
    }
    
    return this.postService({
      service : _service,
      secret  : this._secret
    })
  }

  /**
   *
  */
  changeMobileNumber () {
    this.debug('changeMobileNumber', this)
    this._method = 'change-mobile-number'
    return this.route()
  }

  /**
   *
  */
  updateMobileNumber () {
    this.validateData()
    if(this.formStatus == _a.error){
      this.debug("invalid data")
      return
    }

    const data = this.getData(_a.formItem)
    
    let _service = SERVICE.butler.b2c_signup_otpresend;
    if (this._type == 'b2bsignup') {
      _service = SERVICE.butler.b2b_signup_otpresend;
    }

    if (!data.areacode.includes('+')) {
      data.areacode = '+' + data.areacode  // to add + to the area code --  do not change/remove
    }

    return this.postService({
      service  : _service,
      secret   : this._secret,
      areacode : data.areacode,
      mobile   : data.mobile,
    })
  }

  /**
   *
  */
  loadTermsAndConditions () {
    Welcome.getPart('wrapper-modal').feed(require('./skeleton/terms-and-conditions/main').default(this))
    return
  }
  
  /**
   *
  */
  downloadTermsAndConditions () {
    this.debug('downloadTermsAndConditions', this)
    return
  }

  /**
   *
  */
  acceptConditions () {
    this.debug('acceptConditions', this)
    const checkBox = this.getPart('conditions-checkbox')
    const currState = checkBox.el.dataset.state

    if(currState == 0) {
      checkBox.el.click()
    }
    this.service = _e.close
    this.triggerHandlers()
    return
  }

  /**
   *
  */
  renderMessage (msg) {
    this.debug('renderMessage', msg, this)
    const msgBox = Skeletons.Note({
      className  : `${this.fig.family}__note error-msg`,
      content    : msg
    })

    if(!this.__buttonWrapper || !this.__buttonWrapper) return;
    this.__buttonWrapper.el.dataset.mode = _a.closed;
    this.__messageBox.el.dataset.mode = _a.open;
    this.__messageBox.feed(msgBox);

    const f = () => {
      this.__messageBox.el.dataset.mode = _a.closed
      this.__messageBox.clear()
      this.__buttonWrapper.el.dataset.mode = _a.open
    }
    return _.delay(f, Visitor.timeout(3000))
  }


  /**
   * @param {string} code
  */
  handleError(code) {
    switch(code){
      case 'IDENT_NOT_AVAILABLE':
        this.renderMessage(LOCALE.DOMAIN_ALREADY_EXISTS);
        return;
      case 'INVALID_IDENT':
        this.renderMessage(LOCALE.REQUIRE_IDENT);
        return;
      default:
        this.renderMessage(LOCALE.SOMETHING_WENT_WRONG + ` (${code})`);
    }
  }

  /**
   * @param {_SVC} service
   * @param {object} data
  */
  __dispatchRest(service, data) {
   switch(service) {
      case SERVICE.butler.check_token:
        if (data) {
          if (data.status == 'INVALID_STEP') {
            return this.handleError(data.status);
          }
          
          this.data = data
          this._type = data.method
          this._method = data.metadata.step

          this.feed(require('./skeleton').default(this));
          return this.route()
        }
        this.handleError(data.status);
        return
      
      case SERVICE.butler.b2b_signup_company:
        if (data.status) {
          //const msg = LOCALE.DOMAIN_ALREADY_EXISTS//'Ooops... This domain is already used. Try another one.'
          return this.handleError(data.status);
        }
        this.data = data
        this._method = data.metadata.step
        this.debug('b2b_signup_company', data, this._method, this)
        return this.route()
      
      case SERVICE.butler.b2b_signup_password:
      case SERVICE.butler.b2c_signup_password:
      case SERVICE.butler.b2b_signup_personaldata:
      case SERVICE.butler.b2b_signup_otpresend:
      case SERVICE.butler.b2c_signup_otpresend:
        this.debug(`service = ${service} ---`, data, this)
        this.data = data;
        this._method = data.metadata.step
        return this.route();
      
      case SERVICE.butler.b2b_signup_otpverify:
      case SERVICE.butler.b2c_signup_otpverify:
        if (data.status == 'INVALID_STEP') {
          return this.renderMessage(LOCALE.SOMETHING_WENT_WRONG)
        }
        this.data = data;
        this._method = data.metadata.step
        if (this._method == 'otpresend') {
          return this.renderMessage(LOCALE.ENTER_VALID_CODE_AND_RETRY)
        }
        this.debug(`service = ${service} ---`, data, this)
        return this.route();
      
      
      default:
        return this.debug(`${service} not found.!`)
    }
  }
}

//__welcome_signup.initClass()

module.exports = __welcome_signup
