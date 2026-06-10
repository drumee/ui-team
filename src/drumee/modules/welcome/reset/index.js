
const __welcome_interact = require('../interact');
const specials = require('assets/special-chars');

// Live password rules shown as pills. Each maps a sys_pn (the pill box) to a
// predicate evaluated against the new-password value on every keystroke.
const PW_RULES = [
  { sys_pn: 'pill-min', test: (v) => v.length >= 8 },
  { sys_pn: 'pill-uppercase', test: (v) => /[A-Z]/.test(v) },
  { sys_pn: 'pill-number', test: (v) => /[0-9]/.test(v) },
  { sys_pn: 'pill-symbol', test: (v) => Array.from(v).some((c) => specials.test(c)) }
];

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
    this.model.set({ flow: _a.y })
    this.declareHandlers();
  }

  /**
   *
  */
  onDomRefresh() {
    let sid = bootstrap().maiden_session;
    // if (this._secret) {
    //   this.postService({
    //     service: SERVICE.butler.check_token,
    //     secret: this._secret,
    //     sid
    //   }, { async: 1 }).then((data) => {
    //     this.checkTokenResponse(data);
    //   }).catch(() => {
    //     return this.feed(require('./skeleton').default(this));
    //   });
    //   return;
    // }
    return this.feed(require('./skeleton').default(this));

  }

  /**
   * @param {LetcBox} child
   * @param {LetcBox} pn
  */
  onPartReady(child, pn) {
    switch (pn) {
      // Both password fields drive live validation on every keystroke. We
      // handle them here (instead of via the inherited strength-meter wiring)
      // so the requirement pills and confirm-match logic stay in one place.
      case 'ref-password':
        this._pwNew = child;
        child.on(_e.keyup, () => this.liveValidate());
        return child.on(_e.blur, () => this.clearMessage());

      case 'ref-confirm':
        this._pwConfirm = child;
        child.on(_e.keyup, () => this.liveValidate());
        return child.on(_e.blur, () => this.clearMessage());

      default:
        return super.onPartReady(child, pn);
    }
  }

  /**
   * Evaluate the password against every rule + the confirm-match, repaint the
   * pills (cross/grey -> check/green) and enable the button only when all pass.
   * @returns {boolean} true when the form is valid and submittable.
  */
  liveValidate() {
    const value = (this._pwNew && this._pwNew.getValue()) || '';
    const confirm = (this._pwConfirm && this._pwConfirm.getValue()) || '';

    let allRulesPass = true;
    for (const rule of PW_RULES) {
      const ok = rule.test(value);
      allRulesPass = allRulesPass && ok;

      const pill = this.getPart(rule.sys_pn);
      if (!pill || !pill.el) {
        continue;
      }
      pill.el.dataset.state = ok ? 1 : 0;
      const use = pill.el.querySelector('svg use');
      if (use) {
        use.setAttribute('xlink:href', ok ? '#--icon-app-check' : '#--icon-cross');
      }
    }

    const matches = value.length > 0 && value === confirm;
    const valid = allRulesPass && matches;

    // Live confirm feedback: show the mismatch error as soon as the confirm
    // field has a value that differs from the new password.
    this.showConfirmError(confirm.length > 0 && value !== confirm);

    if (this._button) {
      this._button.el.dataset.state = valid ? 1 : 0;
    }
    return valid;
  }

  /**
   * Show/hide the "passwords don't match" message under the confirm field.
   * Guarded so we only feed/clear the box on a state transition (not on every
   * keystroke), which avoids flicker.
   * @param {boolean} show
  */
  showConfirmError(show) {
    if (!this.__messageBox) {
      return;
    }
    if (show) {
      if (this._confirmErrorShown) {
        return;
      }
      this._confirmErrorShown = true;
      this.__messageBox.el.dataset.mode = _a.open;
      this.__messageBox.feed(
        require('./skeleton/acknowledgment').default(this, LOCALE.CONFIRM_PASSWORDS_DONT_MATCH)
      );
    } else {
      if (!this._confirmErrorShown) {
        return;
      }
      this._confirmErrorShown = false;
      this.__messageBox.el.dataset.mode = _a.closed;
      this.__messageBox.clear();
    }
  }

  /**
   * The inherited clearMessage() force-enables the button (dataset.state = 1)
   * whenever a field blurs or a child bubbles. Re-assert the validated state
   * afterwards so the button stays disabled until the form is actually valid.
  */
  clearMessage() {
    super.clearMessage();
    return this.liveValidate();
  }

  /**
   *
  */
  route() {
    let _content;
    switch (this._method) {
      case _a.password:
        _content = require('./skeleton/password').default(this)
        break

      // OTP verification screen disabled — reset now goes straight to the
      // set-a-new-password form. Re-enable this case to restore SMS OTP.
      // case 'otpverify':
      //   _content = require('./skeleton/otp').default(this)
      //   let a = () => {
      //     this.__noCodeOptions.el.dataset.mode = _a.open
      //   }
      //   setTimeout(a, 15000)
      //   break

      case 'complete':
        this.feed({ kind: 'spinner', mode: 'welcome' });
        setTimeout(() => { location.hash = ''; location.reload() }, 2000);
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
      case 'toggle-password-visibility': {
        const row = cmd.el.closest(`.${this.fig.family}__entry-row`);
        const input = row && row.querySelector('input');
        if (!input) break;
        const isVisible = input.type === 'text';
        input.type = isVisible ? 'password' : 'text';
        const use = cmd.el.querySelector('svg use');
        if (use) {
          use.setAttribute('xlink:href', isVisible ? '#--icon-eye_closed' : '#--icon-eye');
        }
        cmd.el.dataset.state = isVisible ? 0 : 1;
        return;
      }

      case _e.submit:
        return this.submit();

      case 'create-password':
        return this.createPassword();

      // OTP handlers disabled alongside the OTP screen.
      // case 'verify-code':
      //   return this.verifyCode();

      // case 'resend-otp':
      //   return this.resendOTP()

      default:
        return this.debug(`${service} not found.`)
    }
  }

  /**
   *
  */
  submit() {
    if (!this.checkSanity()) {
      this._input.showError()
      const msg = LOCALE.PLEASE_ENTER_EMAIL_TO_CONTINUE
      return this.renderMessage(msg)
    }

    this.postService({
      service: SERVICE.butler.get_reset_token,
      email: this._input.getValue()
    }).then((data) => {
      this.resetTokenResponse(data)
    })
  }

  /**
   *
  */
  createPassword() {
    if (!this.liveValidate()) {
      const value = (this._pwNew && this._pwNew.getValue()) || '';
      // Rules failing -> strength hint; rules OK but confirm empty/mismatched
      // -> match hint. Avoids the "not strong enough" message on a match issue.
      const msg = PW_RULES.every((r) => r.test(value))
        ? LOCALE.CONFIRM_PASSWORDS_DONT_MATCH
        : LOCALE.DMZ_PASSWORD_TO_CONTINUE;
      return this.renderMessage(msg);
    }
    if (!this._secret) {
      location.hash = "#/welcome/signin"
      return
    }
    this._newPassword = this._pwNew.getValue();
    let sid = bootstrap().maiden_session;
    this.postService({
      service: SERVICE.butler.check_token,
      secret: this._secret,
      sid
    }, { async: 1 }).then((data) => {
      this.checkTokenResponse(data);
    }).catch((e) => {
    });
  }

  /**
   * 
  */
  verifyCode() {
    this.validateData()
    if (this.formStatus == _a.error) {
      const msg = LOCALE.ENTER_CODE_RECEIVED//'Please enter the code received on your mobile.'
      return this.renderMessage(msg)
    }

    const data = this.getData(_a.formItem)

    this.postService({
      service: SERVICE.butler.password_otpverify,
      secret: this._secret,
      code: data.code
    }, { async: 1 }).then(async (resp) => {
      let params = await this.fetchService(SERVICE.yp.get_env);
      if (params.user && params.user.signed_in) {
        Visitor.set(params.user);
        location.hash = '#/desk';
      } else {
        this.otpVerifyResponse(resp);
      }
    }).catch(() => {
      this.otpVerifyResponse(resp);
    })
  }

  /**
   *
  */
  resendOTP() {
    return this.postService({
      service: SERVICE.butler.password_otpresend,
      secret: this._secret
    }).then((data) => {
      this.renderMessage(LOCALE.CODE_RESENT_SUCCESSFULLY)
    })
  }

  /**
   *
  */
  renderMessage(msg = '', type = '') {
    const msgBox = require('./skeleton/acknowledgment').default(this, msg, type)

    // This message takes over the shared box, so release the live confirm-error
    // ownership; liveValidate() will re-show the mismatch on the next keystroke.
    this._confirmErrorShown = false;

    // this.__buttonWrapper.el.dataset.mode = _a.closed
    this.__messageBox.el.dataset.mode = _a.open
    this.__messageBox.feed(msgBox)

    const f = () => {
      this._confirmErrorShown = false;
      // if (type == 'reset_token') {
      //   const { protocol, main_domain } = bootstrap();
      //   return location.href = `${protocol}://${main_domain}${location.pathname}${_K.module.signin}`
      // }
      this.__messageBox.el.dataset.mode = _a.closed
      this.__messageBox.clear()
      // return this.__buttonWrapper.el.dataset.mode = _a.open
    }
    return setTimeout(f, 3000)
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
    if (!data) {
      return this.renderMessage(LOCALE.SOMETHING_WENT_WRONG)
    }
    switch (data.error) {
      case 'INVALID_LINK':
      case 'LINK_EXPIRES':
        return this.renderMessage(LOCALE[data.error]);
      case undefined:
      case null:
        const password = this._newPassword
        this.postService({
          service: SERVICE.butler.set_password,
          secret: this._secret,
          password,
          id: this.mget(_a.uid)
        }).then(async (resp) => {
          let params = await this.fetchService(SERVICE.yp.get_env);
          if (params.user && params.user.signed_in) {
            Visitor.set(params.user);
            location.hash = '#/desk';
            setTimeout(() => {
              location.reload()
            }, 1000);
          } else {
            this.renderMessage(LOCALE.SOMETHING_WENT_WRONG)
            // this.responseRouter(resp);
          }
        }).catch((e) => {
          this.renderMessage(LOCALE.SOMETHING_WENT_WRONG)
        })
    }

    // if (_.isEmpty(data.metadata)) {
    //   return Welcome.say('reset_password');
    // }
    // // this.feed(require('./skeleton').default(this));
    // return this.responseRouter(data)
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
