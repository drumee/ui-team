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
  initialize(opt = {}) {
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
        service: SERVICE.butler.check_token,
        secret: this._secret,
      })
    } else {
      if (!Platform.get('isPublic')) {
        return this.triggerHandlers({ service: 'redirect-to-home' })
      } else {
        this._method = "maiden-signup";
        this.data = {}
        this.feed(require('./skeleton').default(this));
        return this.route()
      }
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
  route() {
    let content;
    let header = require('./skeleton/header').default(this)
    switch (this._method) {
      case 'company':
        content = require('./skeleton/company').default(this)
        break

      case "maiden-signup":
        content = require('./skeleton/maiden-signup').default(this);
        break;

      case _a.password:
        if (this._type === _a.signup) {
          content = require('./skeleton/b2csignup').default(this)
          break
        }

        content = require('./skeleton/password').default(this)
        break

      case 'personaldata':
        content = require('./skeleton/personal').default(this)
        break

      case 'otpverify':
      case 'otpresend':
        content = require('./skeleton/otp').default(this)
        let a = () => {
          this.__noCodeOptions.el.dataset.mode = _a.open
        }
        _.delay(a, Visitor.timeout(15000))
        break

      case 'change-mobile-number':
        content = require('./skeleton/change-mobile-number').default(this)
        break

      case 'get-mobile-number':
        content = require('./skeleton/get-mobile-number').default(this)
        break

      case 'complete':
        //return this.initLoader();
        //location.hash = _K.module.welcome_intro;
        return this.gotSignedIn(_K.module.welcome_intro)
      //return location.reload();

      default:
        return Welcome.say('invalid_step')
    }
    this.ensurePart(_a.header).then((p) => {
      p.feed(header)
    })
    this.ensurePart(_a.content).then((p) => {
      p.feed(content);
    })

    // return this.__content.feed(content)
  }

  /**
   * @param {LetcBox} cmd
   * @param {any} args
  */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    this.debug(`onUiEvent service = ${service}`, cmd, this);

    switch (service) {
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
        return this.acceptConditions(cmd, args)

      case 'decline-conditions':
        return this.declineConditions(cmd, args)

      case 'direct-signup':
        return this.directSignup(cmd, args)

      default:
        this.debug("Created by kind builder");
    }
  }

  /**
   *
  */
  createCompany() {
    this.validateData()
    if (this.formStatus == _a.error) {
      this.debug('invalid data', this)
      return
    }

    const data = this.getData(_a.formItem)

    return this.postService({
      service: SERVICE.butler.b2b_signup_company,
      secret: this._secret,
      name: data.company_name,
      ident: data.url_address
    })
  }

  /**
   *
  */
  createPassword() {
    if (!this.checkSanity()) {
      this._input.showError()
      const msg = LOCALE.CREATE_A_PASSWORD
      return this.renderMessage(msg)
    }

    const data = this._input.getData()

    return this.postService({
      service: SERVICE.butler.b2b_signup_password,
      secret: this._secret,
      password: data.value
    })
  }

  /**
   * @param {LetcBox} cmd
  */
  createB2CSignupData(cmd) {
    this.validateData()
    if (this.formStatus == _a.error) {
      let msg = LOCALE.FILL_REQUIRED_FIELDS
      return this.renderMessage(msg)
    }

    if (!this.checkSanity()) {
      this._input.showError()
      let msg = '';
      if (!this._input.getValue()) {
        msg = LOCALE.CREATE_A_PASSWORD
      } else {
        msg = LOCALE.PASSWORD_NOT_STRONG
      }
      return this.renderMessage(msg)
    }

    const data = this.getData(_a.formItem)
    data.passData = this._input.getData().value

    if (!data.condition) {
      const msg = LOCALE.CLICK_AND_ACCEPT_CONDITIONS
      return this.renderMessage(msg)
    }

    this._b2cData = data;
    // Skip by default when B2C
    //this._method = 'get-mobile-number';
    //return this.route()
    let api = {
      service: SERVICE.butler.b2c_signup_password,
      secret: this._secret,
      firstname: data.firstname,
      lastname: data.lastname,
      password: data.passData
    }
    this.postService(api);
  }


  /**
   * @param {LetcBox} cmd
  */
  createB2CUser(cmd) {
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
  createPersonalData() {
    this.validateData()
    if (this.formStatus == _a.error) {
      const msg = LOCALE.FILL_REQUIRED_FIELDS
      return this.renderMessage(msg)
    }

    const data = this.getData(_a.formItem)

    if (!data.condition) {
      const msg = LOCALE.CLICK_AND_ACCEPT_CONDITIONS
      return this.renderMessage(msg)
    }

    if (!data.areacode.includes('+')) {
      data.areacode = '+' + data.areacode  // to add + to the area code --  do not change/remove
    }

    this.postService({
      service: SERVICE.butler.b2b_signup_personaldata,
      secret: this._secret,
      firstname: data.firstname,
      lastname: data.lastname,
      city: data.city,
      areacode: data.areacode,
      mobile: data.mobile
    })
  }

  /**
   * 
  */
  verifyCode() {
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
      service: _service,
      secret: this._secret,
      code: data.code
    })
  }

  /**
   * 
   */

  skipMobileOtp() {
    this.postService({
      service: SERVICE.butler.b2c_signup_skip_otpverify,
      secret: this._secret
    }).then((data) => {
      this.debug(data)
      this.initLoader()
    });
  }

  /**
   *
  */
  resendOTP() {
    let _service = SERVICE.butler.b2c_signup_otpresend;
    if (this._type == 'b2bsignup') {
      _service = SERVICE.butler.b2b_signup_otpresend;
    }

    return this.postService({
      service: _service,
      secret: this._secret
    })
  }

  /**
   *
  */
  changeMobileNumber() {
    this.debug('changeMobileNumber', this)
    this._method = 'change-mobile-number'
    return this.route()
  }

  /**
   *
  */
  updateMobileNumber() {
    this.validateData()
    if (this.formStatus == _a.error) {
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
      service: _service,
      secret: this._secret,
      areacode: data.areacode,
      mobile: data.mobile,
    })
  }

  /**
   *
  */
  loadTermsAndConditions() {
    Welcome.getPart('wrapper-modal').feed(require('./skeleton/terms-and-conditions').default(this))
    return
  }

  /**
   *
  */
  downloadTermsAndConditions() {
    this.debug('downloadTermsAndConditions', this)
    return
  }

  /**
   *
  */
  async acceptConditions(cmd, args) {
    const checkBox = await this.ensurePart('conditions-checkbox')
    const button = await this.ensurePart('button-confirm');
    const wrapper = Welcome.getPart('wrapper-modal')
    this.debug("AAA:acceptConditions", cmd, cmd.mget(_a.sys_pn), checkBox, button, args)
    if (cmd.mget(_a.sys_pn) == 'conditions') {
      checkBox.setState(1)
      wrapper.softClear()
    }
    button.setState(checkBox.mget(_a.state))
  }

  /**
   *
  */
  async declineConditions() {
    const checkBox = await this.ensurePart('conditions-checkbox')
    const button = await this.ensurePart('button-confirm');
    const wrapper = Welcome.getPart('wrapper-modal')
    button.el.dataset.confirm = checkBox.mget(_a.state)
    checkBox.setState(0)
    button.setState(checkBox.mget(_a.state))
    wrapper.softClear()
  }

  /**
   * 
   * @param {*} data 
   */
  _handleResponse(data) {
    switch (data.status) {
      case "user_exists":
        return this.renderMessage(`${LOCALE.EMAIL_ALREADY_EXISTS} (${data.email})`)
      case "not_bound":
        Butler.once("close-content", () => {
          this.debug("AAA", "4444")
          uiRouter.ensureWebsocket().then((e) => {
            this.directSignup()
          })
        })
        return Butler.say(LOCALE.NOT_A_BOT)
      case "server_busy":
        return Butler.say(LOCALE.SERVER_BUSY)
      case _a.ok:
        location.reload();
        return
      default:
        return this.renderMessage(LOCALE.TRY_AGAIN_LATER)
    }
  }
  /**
   *
  */
  async directSignup(cmd, args) {
    this.debug("AAA:directSignup", this.getData())
    this.postService(SERVICE.butler.signup, this.getData()).then((data) => {
      this.debug("AAA:472", data)
      this._handleResponse(data)
    }).catch((e) => {
      this.warn("EEE:474", e)
    })
  }

  /**
   *
  */
  renderMessage(msg) {
    this.debug('renderMessage', msg, this)
    const msgBox = Skeletons.Note({
      className: `${this.fig.family}__note error-msg`,
      content: msg
    })

    if (!this.__buttonWrapper || !this.__buttonWrapper) return;
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
    switch (code) {
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
    switch (service) {
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

    }
  }
}

//__welcome_signup.initClass()

module.exports = __welcome_signup
