
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
    this.footerSkeleton = require('dmz/skeleton/common/footer');
    this.deskSkeleton = require("./skeleton/desk-content").default;
    this.nodeInfoService = SERVICE.media.show_node_by;
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
  promptPassword() {
    this.__content.feed(require('./skeleton/password').default(this));
  }
  /**
   *
   */
  promptEmail() {
    this.__content.feed(require('./skeleton/email').default(this));
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
      return this.renderErrorMessage(LOCALE.INVALID_EMAIL);
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
        this.getInfoData();
      } else if (data && data.status === 'REQUIRED_PASSWORD' && data.is_secure) {
        // Email validated — save it so verifyPassword can re-submit it with the password
        this._verifiedEmail = email;
        this.promptPassword();
      } else if (data && data.status === 'EMAIL_MISMATCH') {
        this.renderErrorMessage(LOCALE.SECURE_SHARE_EMAIL_MISMATCH);
      } else {
        this.handleInfoStatus(data);
      }
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

      case 'dmz-user-signup':
        return this.dmzUserSignup();

      case 'close-banner':
        return this.__footer.el.dataset.mode = _a.closed

      case 'go-login':
        location.href = _K.module.signin;
        return;

      case _e.upload:
        return this.__fileselector.open(this._upload.bind(this));

      case _e.download:
        this.wm.download();
        return;

      // "Add new" lives in the sharebox topbar (uiHandler = this sharebox),
      // but folder creation belongs to the window manager child — delegate.
      case "add-folder":
        if (this.wm && this.wm.onUiEvent) {
          this.wm.onUiEvent(cmd, { service: "add-folder" });
        }
        return;

      case 'open-signup':
        this.append({
          kind: 'drumee_api_popup',
          autostart: 1,
          popupContent: 'drumee_api_signup'
        });
        return;

      case 'tab-files':
        if (this._folderView) this._folderView.el.dataset.view = 'files';
        return;

      case 'tab-chat':
        if (this._folderView) this._folderView.el.dataset.view = _a.chat;
        return;

      case 'tab-task':
        if (this._folderView) this._folderView.el.dataset.view = _a.task;
        return;

      case _e.raise:
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
        this.getInfoData();
      } else if (data && data.status === 'WRONG_PASSWORD') {
        this.renderErrorMessage(LOCALE.WRONG_CREDENTIALS);
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


}

// __dmz_sharebox.initClass();

module.exports = __dmz_sharebox;
