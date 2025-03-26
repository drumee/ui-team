
const __welcome_interact = require('../interact');

/**
 * Class representing reset page in Welcome module.
 * @class ___welcome_reset
 * @extends __welcome_interact
 */

class __welcome_reset extends __welcome_interact {


  /**
   ** @param {object} opt
  */
  initialize(opt = {}) {
    // @ts-ignore
    require('./skin');
    super.initialize(opt);
    this._secret = this.mget(_a.secret)
    this._type = '';
    this._method = {};
    this.declareHandlers();
  }

  /**
   *
  */
 onDomRefresh() {
    let sid = bootstrap().maiden_session;
    if (this._secret) {
      this.postService({
        service : SERVICE.butler.check_token,
        secret  : this._secret,
        sid
      }, {async:1}).then((data)=>{
        this.checkTokenResponse(data);
      }).catch(()=>{
        return this.feed(require('./skeleton').default(this));
      });
      return;
    }
    return this.feed(require('./skeleton').default(this));

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
      
      case _a.content:
        child.feed(require('./skeleton/main').default(this));
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
      case _a.password:
        _content = require('./skeleton/password').default(this)
        break
      
      case 'otpverify':
        _content = require('./skeleton/otp').default(this)
        let a = () => {
          this.__noCodeOptions.el.dataset.mode = _a.open
        }
        _.delay(a, 15000)
        break
      
      case 'complete':
        this.feed({kind: 'spinner', mode: 'welcome'});
        _.delay(()=>{location.hash = ''; location.reload()}, 2000);
        return;
      
      default:
        _content = require('./skeleton/password').default(this)
    }

    this.__header.feed(require('./skeleton/header').default(this))
    return this.__content.feed(_content)
  }
  
  /**
   * @param {LetcBox} cmd
   * @param {any} args
  */
  onUiEvent(cmd, args) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);

    switch (service) {
      case _e.submit: 
        return this.submit();
      
      case 'create-password':
        return this.createPassword();
      
      case 'verify-code':
        return this.verifyCode();
      
      case 'resend-otp':
        return this.resendOTP()
      
      default: 
        return this.debug(`${service} not found.`)
    }
  }

  /**
   *
  */
  submit () {
    if (!this.checkSanity()) {
      this._input.showError()
      const msg = LOCALE.PLEASE_ENTER_EMAIL_TO_CONTINUE
      return this.renderMessage(msg)
    }
    
    this.postService({
      service : SERVICE.butler.get_reset_token,
      email   : this._input.getValue()
    }).then((data)=>{
      this.resetTokenResponse(data)
    })
  }
  
  /**
   *
  */
  createPassword () {
    if (! this.checkSanity()) {
      this._input.showError()
      return this.renderMessage(LOCALE.DMZ_PASSWORD_TO_CONTINUE);
    }

    const data = this._input.getData()

    this.postService({
      service  : SERVICE.butler.set_password,
      secret   : this._secret,
      password : data.value,
      id       : this.mget(_a.uid)
    }).then(async (resp)=>{
      let params = await this.fetchService(SERVICE.yp.get_env);
      if(params.user && params.user.signed_in){
        Visitor.set(params.user);
        location.hash = '#/desk';
        setTimeout(()=>{
          location.reload()
        }, 1000);
      }else{
        this.responseRouter(resp);
      }
    }).catch((e)=>{
      this.renderMessage(LOCALE.DMZ_PASSWORD_TO_CONTINUE);
    })
  }

  /**
   * 
  */
  verifyCode () {
    this.validateData()
    if (this.formStatus == _a.error) {
      const msg = LOCALE.ENTER_CODE_RECEIVED//'Please enter the code received on your mobile.'
      return this.renderMessage(msg)
    }
    
    const data = this.getData(_a.formItem)

    this.postService({
      service : SERVICE.butler.password_otpverify,
      secret  : this._secret,
      code    : data.code
    }, {async:1}).then(async (resp)=>{
      let params = await this.fetchService(SERVICE.yp.get_env);
      if(params.user && params.user.signed_in){
        Visitor.set(params.user);
        location.hash = '#/desk';
      }else{
        this.otpVerifyResponse(resp);
      }
    }).catch(()=>{
      this.otpVerifyResponse(resp);
    })
  }
  
  /**
   *
  */
  resendOTP () {
    return this.postService({
      service : SERVICE.butler.password_otpresend,
      secret  : this._secret
    }).then((data)=>{
      this.renderMessage(LOCALE.CODE_RESENT_SUCCESSFULLY)
    })
  }

  /**
   *
  */
  renderMessage (msg = '', type = '') {
    const msgBox = require('./skeleton/acknowledgment').default(this, msg, type)

    this.__buttonWrapper.el.dataset.mode = _a.closed
    this.__messageBox.el.dataset.mode = _a.open
    this.__messageBox.feed(msgBox)
    
    const f = () => {
      if (type == 'reset_token') {
        return location.href = `https://${bootstrap().main_domain}${location.pathname}${ _K.module.signin}`
      }
      this.__messageBox.el.dataset.mode = _a.closed
      this.__messageBox.clear()
      return this.__buttonWrapper.el.dataset.mode = _a.open
    }
    return _.delay(f, 5000)
  }

  /**
   * @param {object} data
  */
  responseRouter(data) {
    if (_.isEmpty(data.metadata)) {
      return Welcome.say('reset_password');
    }

    if (data.status == 'INVALID_STEP') {
      return Welcome.say(LOCALE.SOMETHING_WENT_WRONG);
    }

    this.data = data;
    this._type = data.method;
    this._method = ''
    if (data.metadata) {
      this._method = data.metadata.step;
    }
    return this.route()
  }

  /**
   * @param {object} data
  */
  checkTokenResponse(data) {
    if (_.isEmpty(data.metadata)) {
      return Welcome.say('reset_password');
    }
    this.feed(require('./skeleton').default(this));
    return this.responseRouter(data)
  }

  /**
   * @param {object} data
  */
  resetTokenResponse(data) {
    if (_.isEmpty(data)) {
      return this.renderMessage(LOCALE.OOPS_EMAIL_NOT_FOUND)
    }
    return this.renderMessage('', 'reset_token')
  }

  /**
   * @param {object} data
  */
  otpVerifyResponse(data) {
    if (data.status == 'INVALID_STEP') {
      return this.renderMessage(LOCALE.OMETHING_WENT_WRONG)//'Something went wrong. Try resend code below.')
    }
    if (_.isEmpty(data.metadata)) {
      return Welcome.say('reset_password');
    }
    if (data.metadata.step == 'otpresend') {
      return this.renderMessage(LOCALE.ENTER_VALID_CODE_AND_RETRY)//'Please enter a valid code and retry.')
    }
    return this.responseRouter(data)
  }


}


module.exports = __welcome_reset;
