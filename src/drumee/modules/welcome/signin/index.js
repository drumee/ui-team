/* ==================================================================== *
 *   Copyright Xialia.com  2011-2020
 *   FILE : /src/drumee/modules/welcome/signin/index.js
 *   TYPE : Component
 * ==================================================================== */
/// <reference path="../../../../../@types/index.d.ts" />

const RECONNECT = 'reconnect';
const __welcome_interact = require("../interact");

/**
 * Class representing signin page in Welcome module.
 * @class ___welcome_signin
 * @extends __welcome_interact
 */

class __welcome_signin extends __welcome_interact {

  constructor(...args) {
    super(...args);
    this.checkLoginStatus = this.checkLoginStatus.bind(this);
    this.onServerComplain = this.onServerComplain.bind(this)
  }

  /**
   ** @param {object} opt
   */
  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
    this._otpResent = 0;
    this._completeSignupLink = `https://${bootstrap().main_domain}${location.pathname}${_K.module.signup}`;
    this._skeleton = require("./skeleton");
  }

  /**
   *
   */
  onChildBubble() {
    this.clearMessage();
  }

  /**
   *
   */
  onDomRefresh() {
    let opt = {};
    switch (bootstrap().connection) {
      case "otp":
        if (this.mget(RECONNECT)) {
          opt = require("./skeleton/auth")(this);
          this.feed(this._skeleton(this, opt));
          return;
        }
        if (location.host && Organization.get('url') == location.host) {
          let mobile = Visitor.profile().mobile;
          if (mobile) mobile = mobile.replace(/^.{4,4}/, "");
          this.prompt_otp({ mobile, secret: Visitor.get("otp_key") });
        } else {
          uiRouter.changeHost(Organization.get('url'));
          return;
        }
        break;
      case "online":
        if (this.mget(RECONNECT)) {
          opt = require("./skeleton/auth")(this);
          this.feed(this._skeleton(this, opt));
          return;
        }
        uiRouter.ensureWebsocket().then(() => {
          this.postService(SERVICE.yp.reset_session).then(() => {
            location.reload();
          });
        });
        break;
      default:
        let tab = Visitor.parseModule()[2];
        switch (tab) {
          case "url":
          case "org":
            this.prompt_url();
            break;
          default:
            opt = require("./skeleton/auth")(this);
            this.feed(this._skeleton(this, opt));
        }
    }
  }

  /**
   *
   */
  checkSanity() {
    let ident, pw;
    try {
      ident = this.getPart("ref-ident").getValue();
      pw = this.getPart("ref-password").getValue();
    } catch (error) { }
    if (_.isEmpty(pw) || _.isEmpty(ident)) {
      if(this._button){
        this._button.el.dataset.state = 0;
        this._button.el.dataset.error = 0;  
      }
      return false;
    }

    this._vars = {
      ident,
      password: pw,
    };
    return this._vars;
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case "ref-ident":
        child.once(_e.show, () => {
          if (this.mget(_a.email) && this.mget(RECONNECT)) {
            child.setValue(this.mget(_a.email))
          }
        })
        break;
    }
  }

  /**
   * @param {LetcBox} cmd
   * @param {any} args
   */
  onUiEvent(cmd, args) {
    const service = args.service || cmd.model.get(_a.service);
    switch (service) {
      case _e.submit:
        var vars = this.checkSanity();
        if (!vars) {
          this.renderMessage(LOCALE.PLEASE_ENTER_YOUR_CREDENTIALS);
          return;
        }
        this._vars = vars;
        return this.loginUser(vars);

      case "resend-otp":
        this._otpResent++;
        return this.loginUser(this._vars);

      case "authenticate":
        return this.postService(SERVICE.yp.hello).then((user) => {
          if (user.signed_in) {
            this.uid = user.id;
            let service = "keep-otp-check";
            this.__content.feed(
              require("./skeleton/cross-signin")(this, { service })
            );
            return;
          }
          return this.authenticateUser();
        });

      case "keep-otp-check":
        this.postService(SERVICE.drumate.logout, { hub_id: this.uid }).then(() => {
          this.prompt_otp();
        });
        return;

      case "close-current-connection":
        this.__content.feed(require("./skeleton/content")(this));
        this.postService(SERVICE.drumate.logout, { hub_id: this.uid }).then(() => {
          this.postService({
            service: SERVICE.yp.login,
            vars: this._vars,
            resent: this._otpResent,
          }).then(this.checkLoginStatus).catch(this.checkLoginStatus);
        }).catch(this.checkLoginStatus);
        return;

      case "keep-current-connection":
        location.reload();
        return;

      case "go-to-company-account":
        return this.prompt_url();

      case "check-company-url":
        let host = Organization.get(_a.url);
        if (host != null) {
          host = host.replace(/(\.[a-zA-Z0-9\-_]+){2,2}$/, "");
        }
        localStorage.setItem("user_domain", host);
        return this.checkCompanyURL();

      case "open-signup":
        this.append({
          kind: "drumee_api_popup",
          autostart: 1,
          popupContent: "drumee_api_signup",
        });
        return;

      default:
        return super.onUiEvent(cmd, args);
    }
  }

  /**
   *
   */
  loginUser(vars) {
    let token = Visitor.parseModuleArgs().back;
    if (token) vars.secret = token;
    this.postService(SERVICE.yp.login, {
      vars,
      resent: this._otpResent,
    }).then(this.checkLoginStatus).catch(this.checkLoginStatus);
  }

  /**
   *
   */
  checkCompanyURL() {
    this.validateData();
    if (this.formStatus == _a.error) {
      return this.renderMessage(LOCALE.PLEASE_ENTER_URL_TO_CONTINUE);
    }
    let domain = this.__refUrl.getValue();
    if (!/(\.[a-zA-Z0-9\-_]+){1,}$/.test(domain)) {
      domain = `${domain}.${bootstrap().main_domain}`;
    }
    if (domain == location.host) {
      location.hash = _K.module.welcome;
      return;
    }
    return this.postService({
      service: SERVICE.butler.check_domain,
      domain,
    }).then((data) => {
      if (data.isvalid) {
        Visitor.set({ user_domain: data.url });
        Host.set({
          vhost: data.url,
          name: data.name,
          org_name: data.name,
        });

        setTimeout(() => {
          if (location.host && location.host == data.url) {
            location.hash = `${_K.module.welcome}/signin/auth`;
            location.reload();
          } else {
            const { endpointPath } = bootstrap();
            location.href = `https://${data.url}${endpointPath}${_K.module.signin}/auth`;
          }
        }, Visitor.timeout(500));
      } else {
        this.renderMessage(LOCALE.PLEASE_ENTER_VALID_URL);
      }
    });
  }

  /**
   *
   * @param {*} url
   */
  retryLogin() {
    this.postService({
      service: SERVICE.yp.login,
      vars: this._vars,
    }).then(this.checkLoginStatus).catch((e) => {
      this.warn(e);
      this.renderMessage(LOCALE.PLEASE_ENTER_URL_TO_CONTINUE);
    });
  }

  /**
   *
   */
  authenticateUser() {
    this.validateData();
    if (this.formStatus == _a.error) {
      const msg = LOCALE.PLEASE_ENTER_THE_CODE;
      return this.renderMessage(msg);
    }

    let token = Visitor.parseModuleArgs().back;
    if (token) vars.token = token;
    this.postService({
      service: SERVICE.yp.authenticate,
      secret: this.data.secret || Visitor.get('otp_key'),
      code: this.__refCode.getValue(),
    }
    ).then(this.checkLoginStatus);
  }

  /**
   * Show One Time Password entry
   * @param {Object} data
   */
  prompt_gateway(data) {
    this.__content.feed(require("./skeleton/gateway")(this));
  }

  /**
   * Show One Time Password entry
   * @param {Object} data
   */
  prompt_otp(data) {
    this.data = data;
    // Upopn reload while prompting otp
    if (!this.__content) {
      let opt = {
        content: require("./skeleton/otp")(this),
      };
      this.feed(this._skeleton(this, opt));
      const f = () => {
        this.__noCodeOptions.el.dataset.mode = _a.open;
      };
      return _.delay(f, Visitor.timeout(5000));
    }
    this.__content.feed(require("./skeleton/otp")(this));

    const f = () => {
      this.__noCodeOptions.el.dataset.mode = _a.open;
    };
    return _.delay(f, Visitor.timeout(15000));
  }

  /**
   * Show One Time Password entry
   * @param {Object} data
   */
  prompt_url(data) {
    //uiRouter.setWallpaper('company');
    let opt = require("./skeleton/url")(this);
    this.feed(this._skeleton(this, opt));
  }

  /**
   * Show One Time Password entry
   * @param {Object} data
   */
  get_in(data) {
    this.data = data;
    this.profile = data.profile;
    this.initLoader(data); // for initiating loader
  }

  /**
   *
   */
  renderMessage(msg) {
    this.ensurePart('button-wrapper').then((p) => {
      const msgBox = require("./skeleton/acknowledgment")(this, msg);
      p.el.dataset.mode = _a.closed;
      if (this.__messageBox) {
        this.__messageBox.el.dataset.mode = _a.open;
        this.__messageBox.feed(msgBox);
      }

      const f = () => {
        if (this.__messageBox) {
          this.__messageBox.el.dataset.mode = _a.closed;
          this.__messageBox.clear();
        }
        p.el.dataset.mode = _a.open;
        return;
      };
      return setTimeout(f, Visitor.timeout(3500));

    })
  }


  /**
   * @param {any} xhr
   */
  onServerComplain(xhr) {
    this.warn("ServerComplain", xhr);
    switch (xhr.error) {
      case _a.frozen:
      case _a.locked:
        return this.renderMessage(LOCALE.ACCOUNT_HAS_BEEN_DELETED);
      case "ALREADY_SIGNED_IN":
        return this.gotSignedIn();
      case "CROSS_SIGNED_IN":
        this.uid = xhr.reason.uid;
        this.__content.feed(
          require("./skeleton/cross-signin")(this, xhr.reason)
        );
        return;
      case "INVALID_SECRET":
        this.renderMessage(LOCALE.CHECK_YOUR_MAIL);
        return;
      default:
        this.renderMessage(LOCALE.CHECK_YOUR_MAIL);
    }
  }

  /**
   *
   */
  reload() {
    // if (window.loginCtx) {
    //   localStorage.setItem("loginCtx", window.loginCtx);
    // } else {
    //   localStorage.removeItem("loginCtx");
    // }
    location.reload();
  }

  /**
   * 
   * @param {*} data 
   */
  checkLoginStatus(data) {
    switch (data.status) {
      case "INCOMPLETE_SIGNUP":
        if (data.secret) {
          return (location.href = `${this._completeSignupLink}/${data.secret}`);
        }
        location.href = this._completeSignupLink;
        return
      case "BLOCKED":
      case "ARCHIVED":
        return this.renderMessage(LOCALE.BLOCKED_ACCOUNT);

      case "ok":
      case "ALREADY_SIGNED_IN":
        Visitor.set(data);
        if (this.mget(RECONNECT)) {
          wsRouter.restart(1);
          this.suppress();
          Butler.sleep()
          return;
        }
        return this.gotSignedIn(data);

      case "no_cookie":
        return this.retryLogin(data);

      case _a.frozen:
      case _a.locked:
        return this.renderMessage(LOCALE.ACCOUNT_HAS_BEEN_DELETED);

      case "CROSS_SIGNED_IN":
        this.uid = data.uid;
        this.__content.feed(
          require("./skeleton/cross-signin")(this, data)
        );
        return;

      case "WRONG_CREDENTIALS":
        return this.renderMessage(LOCALE.CHECK_YOUR_MAIL);
      case "INVALID_SECRET":
      case "INVALID_CODE":
        return this.renderMessage(LOCALE.INVALID_CODE);
    }

    if (data.secret) {
      this.prompt_otp(data);
      return;
    }
    let { user, organization, hub } = data;
    if (user) {
      Visitor.set(user);
    }
    if (organization) {
      Organization.set(organization);
    }
    if (hub) {
      Host.set(hub);
    }
    this.gotSignedIn(data);
  }

}

module.exports = __welcome_signin;
