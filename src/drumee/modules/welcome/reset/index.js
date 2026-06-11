
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
   * Validate the reset token up front. A valid (non-expired) token shows the
   * set-new-password form; an expired/invalid token shows the "Link Expired"
   * screen. A transient/unknown error falls back to the form — the token is
   * re-checked on submit anyway. check_token has no session side effect.
  */
  onDomRefresh() {
    const showForm = () => this.feed(require('./skeleton').default(this));

    if (!this._secret) {
      return showForm();
    }

    // Brief spinner while we validate the token.
    this.feed({ kind: 'spinner', mode: 'welcome' });
    let sid = bootstrap().maiden_session;
    this.postService({
      service: SERVICE.butler.check_token,
      secret: this._secret,
      sid
    }, { async: 1 }).then((data) => {
      if (data && (data.error === 'INVALID_LINK' || data.error === 'LINK_EXPIRES')) {
        return this.showLinkExpired();
      }
      return showForm();
    }).catch((e) => {
      // Don't bounce a valid link on a transient error — show the form;
      // createPassword() re-validates the token before set_password.
      this.warn('onDomRefresh: token check failed; showing reset form', e);
      return showForm();
    });
  }

  /**
   * Render the "Link Expired" screen (replaces the whole card).
  */
  showLinkExpired() {
    return this.feed(require('./skeleton/link-expired').default(this));
  }

  /**
   * Navigate to the sign-in form (used by the expired screen's button). Unlike
   * backToSignin() this does not log out, since an expired link creates no
   * session — the user simply never reached the set-password step.
  */
  gotoSignin() {
    try { history.replaceState(null, '', '#/welcome/signin'); } catch (e) {}
    if (window.Welcome && _.isFunction(Welcome.loadSignin)) {
      return Welcome.loadSignin();
    }
    location.hash = '#/welcome/signin';
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
   * Paint a requirement pill: grey/cross when unmet, green/check when met.
   * @param {string} sys_pn
   * @param {boolean} ok
  */
  _paintPill(sys_pn, ok) {
    const pill = this.getPart(sys_pn);
    if (!pill || !pill.el) {
      return;
    }
    pill.el.dataset.state = ok ? 1 : 0;
    const use = pill.el.querySelector('svg use');
    if (use) {
      use.setAttribute('xlink:href', ok ? '#--icon-app-check' : '#--icon-cross');
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
      this._paintPill(rule.sys_pn, ok);
    }

    const matches = value.length > 0 && value === confirm;
    const valid = allRulesPass && matches;

    // "Passwords match" tag (green/check only once both fields agree).
    this._paintPill('pill-match', matches);

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
   * Toggle the submit button's loading spinner (hides icon + label, blocks
   * clicks) while the password is being submitted.
   * @param {boolean} on
  */
  setButtonLoading(on) {
    if (!this._button || !this._button.el) {
      return;
    }
    if (on) {
      this._button.el.dataset.loading = 1;
    } else {
      delete this._button.el.dataset.loading;
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
        return this.showSuccess();

      default:
        _content = require('./skeleton/password').default(this)
    }

    this.__header.feed(require('./skeleton/header').default(this))
    return this.__content.feed(_content)
  }

  /**
   * Render the "Password Changed!" success screen (replaces the whole card).
  */
  showSuccess() {
    // Signal any open "check your inbox" tab (same origin) that the reset is
    // complete, so it can disable its resend button — there's nothing left to
    // resend. storage events fire in OTHER tabs; the changing timestamp value
    // guarantees the event dispatches even on a repeat success.
    try {
      localStorage.setItem('drumee:password-reset:done', String(Date.now()));
    } catch (e) {}
    return this.feed(require('./skeleton/success').default(this));
  }

  /**
   * Leave the reset flow for the sign-in form.
   *
   * A successful reset signs the user in server-side, so Visitor.isOnline() is
   * true here. Navigating straight to sign-in would make loadSignin() see the
   * live session and auto-enter the app (triggering the onboarding flow). So we
   * drop that session first (same as loadReset), then reload onto the sign-in
   * form for a manual login with the new password.
  */
  backToSignin() {
    // Land on the sign-in form after a fresh, logged-out boot. Setting the hash
    // then synchronously reloading means the reload pre-empts the SPA's async
    // hashchange route, so loadSignin() can't auto-enter the app before the page
    // reloads with the session already gone.
    const goSignin = () => {
      location.hash = '#/welcome/signin';
      location.reload();
    };

    // Always log out: a successful reset signs the user in server-side, and the
    // session is keyed by the session cookie (hub_id is irrelevant), so this
    // ends the current session even when the cached Visitor state looks offline.
    // Without this the next env fetch sees the live cookie and auto-logs-in.
    this.postService(SERVICE.drumate.logout, { hub_id: Visitor.id }, { async: 1 })
      .then(goSignin)
      .catch((e) => {
        this.warn('backToSignin: logout failed', e);
        goSignin();
      });
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

      case 'back-to-signin':
        return this.backToSignin();

      case 'goto-signin':
        return this.gotoSignin();

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
    // Start the spinner; it's cleared by renderMessage() on any error exit, and
    // stays on through the success path (which reloads the page).
    this.setButtonLoading(true);
    this.postService({
      service: SERVICE.butler.check_token,
      secret: this._secret,
      sid
    }, { async: 1 }).then((data) => {
      this.checkTokenResponse(data);
    }).catch((e) => {
      this.setButtonLoading(false);
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

    // Any message ends a submit attempt -> stop the button spinner.
    this.setButtonLoading(false);

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
        }).then(() => {
          // Password set: show the success screen. The user signs in again with
          // the new password via the "Back to Drumee" button.
          this.showSuccess();
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
