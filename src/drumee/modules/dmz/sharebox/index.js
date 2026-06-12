
/**
 * Class representing the dmz sharebox module.
 * @class __dmz_sharebox
 * @extends LetcBox
*/
class __dmz_sharebox extends LetcBox {

  /**
   * @param {any} args
   * @constructor
  */
  constructor(...args) {
    super(...args);
    this.havePermission = this.havePermission.bind(this);
  }

  /**
   ** @param {object} opt
  */
  initialize(opt = {}) {
    // @ts-ignore
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this.bindEvent(_a.live);
    this.defaultSkeleton = require('./skeleton').default;
    this.topNavSkeleton = require('./skeleton/top-nav').default;
    this.headerSkeleton = require('./skeleton/header').default;
    this.footerSkeleton = require('./skeleton/footer').default;
    this.deskSkeleton = require("./skeleton/desk-content").default;
    this.nodeInfoService = SERVICE.media.show_node_by;
    this._selectedRequestLevel = null;
    this._requestEmailInput    = null;
    this._requestMessageInput  = null;
  }

  /**
   *
   */
  onBeforeDestroy() {
    this.unbindEvent(_a.live);
    this._stopRevokePolling();
  }

  /**
   *
   */
  onWsMessage(svc, data, options = {}) {
    const { service } = options || svc;
    if (service === 'share.track_event') {
      if (data && data.event === 'secure_share_revoked' && data.token === this.mget(_a.token)) {
        this.handleInfoStatus({ status: 'TICKET_REVOKED' });
      }
      if (data && data.event === 'secure_share_access_responded') {
        this._handleAccessResponse(data);
      }
      return;
    }
    if (super.onWsMessage) super.onWsMessage(svc, data, options);
  }

  /**
   * @param {LetcBox} child
   * @param {LetcBox} pn
  */
  onPartReady(child, pn) {
    switch (pn) {
      case "top-nav":
        return this.waitElement(child.el, () => {
          child.feed(this.topNavSkeleton(this));
        });

      case _a.header:
        return this.waitElement(child.el, () => {
          child.feed(this.headerSkeleton(this))
        })

      case _a.footer:
        if (!this.mget('is_secure')) return;
        return this.waitElement(child.el, () => {
          child.feed(this.footerSkeleton(this));
        });

      case "logo-block":
        let mascott = require("assets/mascot.png").default;
        child.el.style.backgroundImage = `url(${mascott})`;

      case 'ref-password':
        return this._input = child;

      case 'ref-email':
        return this._emailInput = child;

      case 'desk-content':
        child.once('content:ready', () => {
          this.windowsLayer = child.windowsLayer;
          this.triggerMethod('wm:ready');
          this.contentReady = true;
          this.checkAutoRun();
        })

        return this.waitElement(child.el, () => {
          this.wm = child;
        })

      case 'folder-view':
        this._folderView = child;
        return;

      case 'wrapper-dialog':
        this.dialogWrapper = child;
        return;

      case 'ref-request-email':
        return this._requestEmailInput = child;

      case 'ref-request-message':
        return this._requestMessageInput = child;

      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }


  /**
   * 
   */
  checkAutoRun() {
    let node = Visitor.parseModule()[3];
    let method = Visitor.parseModule()[4] || _a.play;
    if (node) {
      let count = 0;
      let timer = setInterval(() => {
        count++;
        let media = Wm.getItemsByAttr(_a.nid, node)[0];
        if (count > 5) clearInterval(timer);
        if (media) {
          if (method == 'get') {
            media.download();
          } else {
            media.service = 'open-node';
            media.triggerHandlers();
          }
          clearInterval(timer);
        }
      }, 1000);
    }
  }

  /**
   *
  */
  async onDomRefresh() {
    let token = this.mget(_a.token);
    let hub_id = Visitor.parseLocation().keysel || ""

    // If the URL contains /<file_nid>/<method>, pass file_nid so the server
    // can navigate to the file's parent folder (same as _loginSecureShare).
    // args: ['dmz','share',token, file_nid, method]
    // Guard with NID regex so hash query params (e.g. ?browser=1 → args[3]='browser=1')
    // are never forwarded as file_nid.
    const NID_RE = /^[0-9a-f]{16}$/;
    const urlFileNid = Visitor.parseModule()[3];
    const loginOpt = { token, hub_id };
    if (NID_RE.test(urlFileNid)) loginOpt.file_nid = urlFileNid;

    let data = await this.postService(SERVICE.dmz.login, loginOpt);

    this.mset(data);
    if (loginOpt.file_nid) this.mset({ file_nid: loginOpt.file_nid });
    if (data.guest_name) {
      Visitor.set({
        firstname: data.guest_name
      })
    }
    Visitor.set({
      id: data.guest_id || data.uid
    })
    this.feed(this.defaultSkeleton(this));
    await this.ensurePart(_a.content);

    // An expired share must not load content — handleInfoStatus maps
    // dmz_expiry==='expired' to the TICKET_EXPIRED "link expired" message.
    if (data.dmz_expiry === _a.expired) {
      return this.handleInfoStatus(data);
    }

    switch (data.status) {
      case 'REQUIRED_PASSWORD':
        this.promptPassword();
        break;
      case 'REQUIRED_EMAIL':
        this.promptEmail();
        break;
      case 'TICKET_LOCKED':
        this.promptLockedPassword();
        break;
      case 'TICKET_REVOKED':
      case 'TICKET_EXPIRED':
      case 'WRONG_TICKET':
      case 'TICKET_INVALID':
        this.handleInfoStatus(data);
        break;
      default:
        this.getInfoData();

    }
  }

  /**
   * 
   */
  // Unified recipient gate (Toon 2026-06-12): one adaptive card showing the
  // email field, the password field, or both. promptEmail/promptPassword are
  // kept as thin aliases so any existing caller still routes to the gate.
  promptGate(opts = {}) {
    this.__content.feed(require('./skeleton/gate').default(this, opts));
    // Show the viral gate banner ("Create your sovereign workspace with Drumee")
    // beneath the gate card — distinct from the post-unlock landing banner. Only
    // applies on the gate; the public/landing flow never sets this flag.
    this.mset({ _gate_footer: true });
    this.ensurePart(_a.footer).then((footer) => {
      footer.feed(this.footerSkeleton(this));
      footer.el.dataset.mode = _a.open;
    });
  }
  promptPassword() { this.promptGate(); }
  promptEmail()    { this.promptGate(); }

  /**
   *
   */
  promptLockedPassword() {
    this.promptGate({ locked: true });
  }

  /**
   *
   */
  showSignupRequiredOverlay() {
    const overlay = this.__signupOverlay;
    if (!overlay) return;
    overlay.feed(require('./skeleton/signup-required').default(this));
    overlay.el.dataset.mode = _a.open;
  }

  /**
   *
   */
  closeSignupRequiredOverlay() {
    const overlay = this.__signupOverlay;
    if (!overlay) return;
    overlay.el.dataset.mode = _a.closed;
    overlay.clear();
  }

  /**
   *
   */
  verifyEmail() {
    const email = this._emailInput ? (this._emailInput.getData().value || '').trim() : '';
    if (!email) {
      return this.renderErrorMessage(LOCALE.SECURE_SHARE_ENTER_EMAIL);
    }
    if (!Validator.email(email)) {
      return this.renderErrorMessage(LOCALE.SECURE_SHARE_EMAIL_INVALID_FORMAT);
    }

    const hub_id = Visitor.parseLocation().keysel || '';
    const opt = {
      token  : this.mget(_a.token),
      hub_id,
      email,
    };

    this.postService(SERVICE.dmz.login, opt).then((data) => {
      if (data && data.status === 'TICKET_OK' && data.is_secure) {
        this.mset(data);
        this.mset({ recipient_email: email });
        this.getInfoData();
      } else if (data && data.status === 'REQUIRED_PASSWORD' && data.is_secure) {
        // Email validated — save it so verifyPassword can re-submit it with the password
        this._verifiedEmail = email;
        this.promptPassword();
      } else if (data && data.status === 'EMAIL_MISMATCH') {
        this.renderErrorMessage(LOCALE.SECURE_SHARE_EMAIL_BLOCKED);
      } else {
        this.handleInfoStatus(data);
      }
    });
  }

  /**
   * Unified gate submit (Toon 2026-06-12): validates whichever fields the share
   * requires (email and/or password) in a SINGLE server call. The server gates
   * email first then password, so it returns the first failing step's status.
   */
  verifyGate() {
    const needEmail    = !!(this.mget('require_email') || this.mget('recipient_email'));
    const needPassword = !!(this.mget('require_password') || this.mget('require_pwd'));

    let email = '';
    if (needEmail) {
      email = this._emailInput ? (this._emailInput.getData().value || '').trim() : '';
      if (!email) return this.renderErrorMessage(LOCALE.SECURE_SHARE_ENTER_EMAIL);
      if (!Validator.email(email)) return this.renderErrorMessage(LOCALE.SECURE_SHARE_EMAIL_INVALID_FORMAT);
    }

    let password = '';
    if (needPassword) {
      password = this._input ? (this._input.getData().value || '').trim() : '';
      if (!password) return this.renderErrorMessage(LOCALE.DMZ_PASSWORD_TO_CONTINUE);
    }

    const hub_id = Visitor.parseLocation().keysel || '';
    const opt = { token: this.mget(_a.token), hub_id };
    if (needEmail)    opt.email    = email;
    if (needPassword) opt.password = password;

    this.postService(SERVICE.dmz.login, opt).then((data) => {
      if (data && data.status === 'TICKET_OK' && data.is_secure) {
        this.mset(data);
        if (needEmail) { this._verifiedEmail = email; this.mset({ recipient_email: email }); }
        return this.getInfoData();
      }
      if (data && data.status === 'EMAIL_MISMATCH') {
        return this.renderErrorMessage(LOCALE.SECURE_SHARE_EMAIL_BLOCKED);
      }
      if (data && data.status === 'WRONG_PASSWORD') {
        const attempts = (data.attempts_remaining != null && data.attempts_remaining > 0) ? data.attempts_remaining : null;
        return this.renderPasswordError(LOCALE.SECURE_SHARE_WRONG_PASSWORD, attempts);
      }
      if (data && data.status === 'TICKET_LOCKED') {
        return this.promptLockedPassword();
      }
      if (data && data.status === 'REQUIRED_EMAIL') {
        return this.renderErrorMessage(LOCALE.SECURE_SHARE_ENTER_EMAIL);
      }
      if (data && data.status === 'REQUIRED_PASSWORD') {
        return this.renderErrorMessage(LOCALE.DMZ_PASSWORD_TO_CONTINUE);
      }
      return this.handleInfoStatus(data);
    });
  }

  /**
   *
  */
  getInfoData() {
    let opt = {
      nid: this.mget(_a.nid),
      page: 1,
    };
    this.postService(this.nodeInfoService, opt)
      .then((data) => {
        if (data && _.isEmpty(data.status)) {
          this.__header.feed(this.headerSkeleton(this));
          this.loadDeskContent();
        } else {
          this.handleInfoStatus(data)
        }
      }).catch(() => {

      })
  }

  /**
   * @param {LetcBox} cmd
   * @param {any} args
  */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    switch (service) {
      case 'show-password':
        var pw = this._input;
        if (cmd.mget(_a.state)) {
          pw.mset(_a.type, _a.password);
        } else {
          pw.mset(_a.type, _a.text);
        }
        return pw.reload();

      case 'verify-password':
        return this.verifyPassword();

      case 'verify-email':
        return this.verifyEmail();

      case 'verify-gate':
        return this.verifyGate();

      case 'dmz-user-signup':
        return this.dmzUserSignup();

      case 'close-banner':
        return this.__footer.el.dataset.mode = _a.closed

      case 'go-login': {
        this.closeSignupRequiredOverlay();
        // Remember the shared workspace so the desk opens it after sign-in.
        // Signin is a same-origin hash navigation, so sessionStorage survives;
        // the desk window-manager consumes `drumee_hubDeepLink` on load (the
        // existing hub deep-link handoff). Never route back through /dmz/share —
        // that re-runs the guest login and binds the session to the sender.
        // Secure-share URLs carry a token, not a hub_id, so the real hub_id is the
        // one the login response stored on the model; keysel is only a fallback.
        const _hubId = this.mget(_a.hub_id) || Visitor.parseLocation().keysel || '';
        if (_hubId) sessionStorage.setItem('drumee_hubDeepLink', _hubId);
        location.href = _K.module.signin;
        return;
      }

      case _e.upload:
        // A guest may upload only when the share granted edit (write privilege).
        // Without it, prompt sign-up (Figma: "edit → sign in required").
        if (this.mget('guest_id') && !this.havePermission(_K.permission.write, this.mget(_a.privilege))) {
          return this.showSignupRequiredOverlay();
        }
        return this.__fileselector.open(this._upload.bind(this));

      case _e.download:
        this.wm.download();
        return;

      // "Add new" lives in the sharebox topbar (uiHandler = this sharebox),
      // but folder creation belongs to the window manager child — delegate.
      case "add-folder":
        if (this.mget('guest_id') && !this.havePermission(_K.permission.write, this.mget(_a.privilege))) {
          return this.showSignupRequiredOverlay();
        }
        if (this.wm && this.wm.onUiEvent) {
          this.wm.onUiEvent(cmd, { service: "add-folder" });
        }
        return;

      case 'open-signup': {
        this.closeSignupRequiredOverlay();
        const { main_domain } = bootstrap();
        // Sign-up opens a new window on the canonical main domain (Session-7 fix
        // to avoid embedding the guest session). sessionStorage does NOT cross to
        // the new window, so carry the shared workspace as a hash query param;
        // the welcome module stashes it into `drumee_hubDeepLink` for the desk.
        // Secure-share URLs carry a token, not a hub_id, so the real hub_id is the
        // one the login response stored on the model; keysel is only a fallback.
        const _hubId = this.mget(_a.hub_id) || Visitor.parseLocation().keysel || '';
        const _suffix = _hubId ? `?hub_id=${encodeURIComponent(_hubId)}` : '';
        window.open(`${location.protocol}//${main_domain}/${_K.module.signup}${_suffix}`, '_blank');
        return;
      }

      case 'tab-files':
        if (this._folderView) this._folderView.el.dataset.view = 'files';
        return;

      case 'tab-chat':
        // Chat has no privilege bit (it overlaps view in the bitmask); the share
        // carries an explicit can_chat flag. A guest without it must sign up.
        if (this.mget('guest_id') && !this.mget('can_chat')) {
          return this.showSignupRequiredOverlay();
        }
        if (this._folderView) this._folderView.el.dataset.view = _a.chat;
        return;

      case 'tab-task':
        if (this._folderView) this._folderView.el.dataset.view = _a.task;
        return;

      case _e.raise:
        return;

      case 'open-request-access':
        return this.showRequestAccessPopup();

      case 'select-request-level': {
        const lvl = cmd.mget('level');
        this._selectedRequestLevel = lvl;
        if (this.__signupOverlay) {
          this.__signupOverlay.el.querySelectorAll('[data-level]').forEach(btn => {
            btn.dataset.selected = (btn.dataset.level === lvl) ? 'yes' : '';
          });
        }
        return;
      }

      case 'submit-access-request':
        return this.submitAccessRequest();

      case 'close-request-access':
        this._selectedRequestLevel = null;
        this.closeSignupRequiredOverlay();
        return;

      case 'close-request-sent':
        this.closeSignupRequiredOverlay();
        return;

      default:
        if (super.onUiEvent) return super.onUiEvent(cmd, args);
    }
  }

  /**
   *
  */
  _upload(e) {
    return this.wm.upload(e, this.mget(_a.token));
  }

  /**
   *
  */
  verifyPassword() {
    const password = this._input ? (this._input.getData().value || '').trim() : '';
    if (!password) {
      return this.renderErrorMessage(LOCALE.DMZ_PASSWORD_TO_CONTINUE);
    }

    let hub_id = Visitor.parseLocation().keysel || ""

    let opt = {
      token: this.mget(_a.token),
      hub_id,
      password,
    }
    // For secure-share password flow: re-send the verified email so the server
    // can validate email + password in one step (stateless on the server side)
    if (this._verifiedEmail) {
      opt.email = this._verifiedEmail;
    }
    this.postService(SERVICE.dmz.login, opt).then((data) => {
      if (data && data.status === 'TICKET_OK' && data.is_secure) {
        // Secure-share password accepted — grant access
        this.mset(data);
        if (this._verifiedEmail) this.mset({ recipient_email: this._verifiedEmail });
        this.getInfoData();
      } else if (data && data.status === 'WRONG_PASSWORD') {
        // Figma 3.3.5: two lines — a red alert box with the failure message, then
        // a muted warning line with the remaining-attempts count.
        const attempts = (data.attempts_remaining != null && data.attempts_remaining > 0)
          ? data.attempts_remaining : null;
        this.renderPasswordError(LOCALE.SECURE_SHARE_WRONG_PASSWORD, attempts);
      } else if (data && data.status === 'TICKET_LOCKED') {
        this.promptLockedPassword();
      } else if (data && data.is_verified) {
        this.mset(data);
        localStorage.setItem('token', data.token);
        localStorage.setItem('guest-sid', data.guest_sid);
        this.dmzCheckPasswordResponse(data);
      } else if (!_.isEmpty(data.error)) {
        this.dmzCheckPasswordResponse(data);
      } else {
        this.handleInfoStatus(data);
      }
    })
  }

  /**
   *
  */
  loadDeskContent(banner = 1) {
    this.__content.feed(this.deskSkeleton(this))
    if (this.__actionButtons) {
      this.__actionButtons.el.dataset.mode = _a.open;
    }

    // If we arrived here through the gate, swap the gate banner back to the
    // landing banner now that the recipient has access. No-op for the public
    // flow (flag never set).
    if (this.mget('_gate_footer')) {
      this.mset({ _gate_footer: false });
      this.ensurePart(_a.footer).then((footer) => footer.feed(this.footerSkeleton(this)));
    }

    this._startRevokePolling();

    //if(!banner)return;

    const f = () => {
      this.loadDrumeeBanner()
    }

    _.delay(f, Visitor.timeout(1000));
  }

  /**
   * Poll dmz.info every 5 s to detect revoke/expiry in near-real-time.
   * Uses a read-only endpoint — no access_count side-effect.
   */
  _startRevokePolling() {
    const token = this.mget(_a.token);
    if (!token || this._revokePoller) return;
    this._revokePoller = setInterval(async () => {
      if (!this._revokePoller) return;
      try {
        const data = await this.postService(SERVICE.dmz.info, { token });
        if (!this._revokePoller) return;
        if (data && (data.status === 'TICKET_REVOKED' || data.status === 'TICKET_EXPIRED')) {
          this._stopRevokePolling();
          // Tear down the desk content before showing the popup — this ensures
          // files are gone even if the user dismisses the popup instead of
          // clicking the redirect button.
          if (this.__content) {
            this.__content.feed(Skeletons.Box.Y({ className: `${this.fig.family}__content` }));
          }
          this.handleInfoStatus(data);
        }
      } catch (_) {}
    }, 5000);
  }

  /**
   *
   */
  _stopRevokePolling() {
    clearInterval(this._revokePoller);
    this._revokePoller = null;
  }

  /**
   *
  */
  loadDrumeeBanner() {
    return this.__footer.el.dataset.mode = _a.open
  }

  /**
   *
  */
  dmzUserSignup() {
    this.postService({
      service: SERVICE.dmz.signup,
      token: this.mget(_a.token)
    })
  }

  /**
   *
  */
  havePermission(permission, userPrivilege) {
    if (_.isEmpty(userPrivilege)) { userPrivilege = this.mget(_a.privilege); }
    return permission & userPrivilege;
  }


  /**
   *
  */
  dmzCheckPasswordResponse(data) {
    if (data.is_verified && data.is_guest) {
      // this.getInfoData()
      location.reload()
    } else {
      this.renderErrorMessage(LOCALE.WRONG_CREDENTIALS)
    }
  }

  /**
   * @param {String} msg
  */
  renderErrorMessage(msg) {
    const msgBox = Skeletons.Note({
      className: `${this.fig.family}__note error-msg`,
      content: msg
    })

    let buttonWrapper = this.__buttonWrapper;
    let msgWrapper = this.__messageBox;
    if (!buttonWrapper) return;

    buttonWrapper.el.dataset.mode = _a.closed;
    msgWrapper.el.dataset.mode = _a.open;
    msgWrapper.el.dataset.error = _a.yes;
    msgWrapper.feed(msgBox);

    const f = () => {
      msgWrapper.el.dataset.mode = _a.closed
      msgWrapper.clear()
      buttonWrapper.el.dataset.mode = _a.open
    }
    return _.delay(f, Visitor.timeout(2000))
  }

  /**
   * Two-line password error (Figma 3.3.5): a light-red alert box with the
   * failure message, plus a muted warning line (⚠ icon) with the remaining
   * attempts. Falls back to the single-line treatment when no message box is
   * mounted. Keeps the existing transient show/hide timing so the rest of the
   * gate behaviour is unchanged.
   * @param {String} mainMsg
   * @param {Number|null} attemptsRemaining
   */
  renderPasswordError(mainMsg, attemptsRemaining) {
    // Match the password gate's BEM family (this error only renders there) so
    // the styles co-locate under `.dmz-sharebox-password` in password.scss.
    const pfx           = `${this.fig.family}-password`
    const buttonWrapper = this.__buttonWrapper
    const msgWrapper    = this.__messageBox
    if (!msgWrapper) return this.renderErrorMessage(mainMsg)

    const kids = [
      Skeletons.Box.X({
        className : `${pfx}__error-alert`,
        kids      : [
          Skeletons.Note({ className: `${pfx}__error-alert-text`, content: mainMsg })
        ]
      })
    ]
    if (attemptsRemaining != null) {
      kids.push(Skeletons.Box.X({
        className : `${pfx}__attempts-note`,
        kids      : [
          Skeletons.Button.Svg({ ico: 'apps-warning', className: `${pfx}__attempts-icon` }),
          Skeletons.Note({
            className : `${pfx}__attempts-text`,
            content   : LOCALE.SECURE_SHARE_ATTEMPTS_REMAINING.replace('{0}', attemptsRemaining)
          })
        ]
      }))
    }

    if (buttonWrapper) buttonWrapper.el.dataset.mode = _a.closed
    msgWrapper.el.dataset.mode    = _a.open
    msgWrapper.el.dataset.error   = ''        // not the single-line red-bar variant
    msgWrapper.el.dataset.variant = 'block'
    msgWrapper.feed(Skeletons.Box.Y({ className: `${pfx}__error-block`, kids }))

    const f = () => {
      msgWrapper.el.dataset.mode    = _a.closed
      msgWrapper.el.dataset.variant = ''
      msgWrapper.clear()
      if (buttonWrapper) buttonWrapper.el.dataset.mode = _a.open
    }
    return _.delay(f, Visitor.timeout(3000))
  }

  /**
   *@param {Object} data
  */
  handleInfoStatus(data = {}) {
    let opt = {};
    let status = data.validity || data.status;
    if (data.dmz_expiry == _a.expired) {
      status = 'TICKET_EXPIRED';
    }
    switch (status) {
      case 'INACTIVE_TICKET':
      case 'TICKET_EXPIRED':
        opt.content = LOCALE.LINK_EXPIRES
        opt.btnService = 'redirect-to-home'
        break

      case "INVALID_CREDENTIAL":
        return this.feed(this.defaultSkeleton(this));

      case 'TICKET_REVOKED':
        opt.content = LOCALE.SECURE_SHARE_REVOKED
        opt.btnService = 'redirect-to-home'
        break

      case 'WRONG_TICKET':
      case 'TICKET_INVALID':
        opt.content = LOCALE.INVALID_LINK
        opt.btnService = 'redirect-to-home'
        break

      case 'EMAIL_EXIST':
        opt.content = LOCALE.EMAIL_EXIST_SIGN_CONTINUE
        opt.btnService = 'redirect-to-home'
        break

      default:
        if (data.failed || data.error) {
          opt.content = `${LOCALE.SOMETHING_WENT_WRONG} (${data.error})`
        } else {
          return
        }
    }

    Dmz.say(opt);
  }


  /**
   *
   */
  showRequestAccessPopup() {
    const overlay = this.__signupOverlay;
    if (!overlay) return;
    this._selectedRequestLevel = null;
    this._requestEmailInput    = null;
    this._requestMessageInput  = null;
    overlay.feed(require('./skeleton/request-access').default(this));
    overlay.el.dataset.mode = _a.open;
  }

  /**
   *
   */
  async submitAccessRequest() {
    const emailEl = this._requestEmailInput
      ? this._requestEmailInput.el.querySelector('input')
      : null;
    const emailVal = emailEl
      ? emailEl.value.trim().toLowerCase()
      : (this.mget('recipient_email') || '').toLowerCase().trim();

    if (!emailVal || !emailVal.includes('@')) {
      return this.renderErrorMessage(LOCALE.SECURE_SHARE_ENTER_EMAIL);
    }
    if (!this._selectedRequestLevel) return;

    const msgEl  = this._requestMessageInput
      ? this._requestMessageInput.el.querySelector('textarea')
      : null;
    const msgVal = msgEl ? msgEl.value.trim() : '';

    const token  = this.mget(_a.token);
    const hub_id = Visitor.parseLocation().keysel || '';
    const payload = {
      token,
      hub_id,
      email          : emailVal,
      requested_level: this._selectedRequestLevel,
    };
    if (msgVal) payload.message = msgVal;

    try {
      const data = await this.postService(SERVICE.dmz.request_access, payload);
      if (data && data.status === 'REQUEST_SENT') {
        this.mset({
          _request_email  : emailVal,
          _request_level  : this._selectedRequestLevel,
          _request_message: msgVal,
        });
        const overlay = this.__signupOverlay;
        if (overlay) {
          overlay.feed(require('./skeleton/request-sent').default(this));
        }
      }
    } catch (e) {
      this.renderErrorMessage(LOCALE.SOMETHING_WENT_WRONG);
    }
  }

  /**
   *
   */
  _handleAccessResponse(data) {
    const overlay = this.__signupOverlay;
    if (overlay) {
      overlay.el.dataset.mode = _a.closed;
      overlay.clear();
    }
    if (data.action === 'approve') {
      this.mset({
        permission_level: data.granted_level,
        privilege       : data.privilege || 3,
        // Carry the capability flags so the chat tab / edit gates unlock to match
        // the freshly granted level (server sends these on the approval event).
        capabilities    : data.capabilities || [],
        can_download    : data.can_download || 0,
        can_chat        : data.can_chat || 0,
        can_edit        : data.can_edit || 0,
      });
      this.loadDeskContent();
    } else {
      this.renderErrorMessage(LOCALE.SECURE_SHARE_ACCESS_DENIED);
    }
  }

}

// __dmz_sharebox.initClass();

module.exports = __dmz_sharebox;
