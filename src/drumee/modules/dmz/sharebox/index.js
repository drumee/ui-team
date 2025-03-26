
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
    this.defaultSkeleton = require('./skeleton').default;
    this.headerSkeleton = require('./skeleton/header').default;
    this.footerSkeleton = require('dmz/skeleton/common/footer');
    this.deskSkeleton = require("dmz/skeleton/common/desk-content")
    this.nodeInfoService = SERVICE.media.show_node_by;
  }

  /**
   * @param {LetcBox} child
   * @param {LetcBox} pn
  */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.header:
        return this.waitElement(child.el, () => {
          child.feed(this.headerSkeleton(this))
        })

      case "logo-block":
        let mascott = require("assets/mascot.png").default;
        child.el.style.backgroundImage = `url(${mascott})`;

      case 'ref-password':
        return this._input = child;

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
    let data = await this.postService(SERVICE.dmz.login,
      { token, hub_id: "" }
    );
    this.mset(data);
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

    switch (data.status) {
      case 'REQUIRED_PASSWORD':
        this.promptPassword();
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

      case 'dmz-user-signup':
        return this.dmzUserSignup();

      case 'close-banner':
        return this.__footer.el.dataset.mode = _a.closed

      case _e.upload:
        return this.__fileselector.open(this._upload.bind(this));

      case _e.download:
        this.wm.download();
        return;

      // case 'open-drumee-video':
      //   return this.openDrumeeVideo();

      case 'open-signup':
        this.append({
          kind: 'drumee_api_popup',
          autostart: 1,
          popupContent: 'drumee_api_signup'
        });
        return;

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
    this.validateData();
    if (this.formStatus == _a.error) {
      this._input.showError()
      const msg = this._input.reason
      return this.renderErrorMessage(msg)
    }

    const inputData = this._input.getData();
    let opt = {
      token: this.mget(_a.token),
      hub_id: "", // If not set, default will be user id
      password: inputData.value
    }
    this.postService(SERVICE.dmz.login, opt).then((data) => {
      if (data && data.is_verified) {
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

    //if(!banner)return;

    const f = () => {
      this.loadDrumeeBanner()
    }

    _.delay(f, Visitor.timeout(1000));
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
      this.getInfoData()
    } else {
      const msg = LOCALE.DMZ_ENTER_PASSWORD_TO_ACCESS_FILES;
      this.renderErrorMessage(msg)
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
    msgWrapper.feed(msgBox);

    const f = () => {
      msgWrapper.el.dataset.mode = _a.closed
      msgWrapper.clear()
      buttonWrapper.el.dataset.mode = _a.open
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
