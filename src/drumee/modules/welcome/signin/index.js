/// <reference path="../../../../../@types/index.d.ts" />

const RECONNECT = 'reconnect';
// Resend cooldown for the check-inbox screen, in seconds.
const COOLDOWN_SEC = 20;
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
    const { endpoint } = bootstrap();
    this._completeSignupLink = `${endpoint}${_K.module.signup}`;
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
    // OAuth 2FA hand-off. This MUST be tested before the connection switch
    // below, and the ordering is not cosmetic: session_check_cookie derives
    // `connection` from the otp TABLE, not from cookie.status, so the pending
    // cookie plus the code loby just minted make this load report
    // connection == 'otp'. Left to the switch, an OAuth return would be
    // hijacked by the password-2FA branch and posted to yp.authenticate with a
    // client-side secret — which this path deliberately does not have.
    const mfa = this._oauthMfaParams();
    if (mfa) {
      return this._promptOtpOauth(mfa.email);
    }
    // Provider callback gave up (user cancelled on the consent screen, expired
    // state, unlinked address, token exchange failed). loby has already bounced
    // us back here with the reason; surface it once the form is rendered.
    const oauthError = this._oauthErrorParam();
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
        opt = require("./skeleton/auth")(this);
        this.feed(this._skeleton(this, opt));
      // let tab = Visitor.parseModule()[2];
      // switch (tab) {
      //   case "url":
      //   case "org":
      //     this.prompt_url();
      //     break;
      //   default:
      //     opt = require("./skeleton/auth")(this);
      //     this.feed(this._skeleton(this, opt));
      // }
    }
    if (oauthError) {
      this._renderOauthError(oauthError);
    }
  }

  /**
   * Read the query the provider hand-off appends to the sign-in route. It rides
   * INSIDE the hash fragment (#/welcome/signin?oauth_mfa=1&email=…), which is
   * what parseModuleArgs already parses — it splits on [#/&?] and does NOT
   * percent-decode, so any value read here needs decoding.
   * @returns {object}
   */
  _oauthArgs() {
    return Visitor.parseModuleArgs() || {};
  }

  /**
   * Decode one value out of the hash query, tolerating a malformed escape
   * sequence (decodeURIComponent throws on a bare '%').
   * @param {string} raw
   * @returns {string}
   */
  _decodeArg(raw) {
    const s = String(raw == null ? "" : raw);
    try {
      return decodeURIComponent(s);
    } catch (e) {
      return s;
    }
  }

  /**
   * An OAuth sign-in that stopped at the 2FA gate. loby's provider callback
   * leaves the session pending and bounces the browser to
   * #/welcome/signin?oauth_mfa=1&email=…
   * @returns {{email:string}|null} null when this is not an OAuth 2FA return.
   */
  _oauthMfaParams() {
    const args = this._oauthArgs();
    if (args.oauth_mfa !== "1") {
      return null;
    }
    // Guard the whole feature on the finalize service being reachable: without
    // oauth.verify_otp the OTP screen could take a code and never submit it,
    // which is a worse dead end than the sign-in form.
    if (!(SERVICE.oauth && SERVICE.oauth.verify_otp)) {
      this.warn("oauth_mfa hand-off but oauth.verify_otp is not registered");
      return null;
    }
    return { email: this._decodeArg(args.email) };
  }

  /**
   * Reason a provider callback aborted, as set by loby's sendOauthError.
   * @returns {string} '' when the return was not an error.
   */
  _oauthErrorParam() {
    return this._decodeArg(this._oauthArgs().oauth_error);
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
      if (this._button) {
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
      case "toggle-password-visibility": {
        const row = cmd.el.closest(`.${this.fig.family}__entry-row`);
        const input = row && row.querySelector("input");
        if (!input) break;
        const isVisible = input.type === "text";
        input.type = isVisible ? "password" : "text";
        const useEl = cmd.el.querySelector("svg use");
        if (useEl) {
          useEl.setAttribute(
            "xlink:href",
            isVisible ? "#--icon-eye_closed" : "#--icon-eye"
          );
        }
        cmd.el.dataset.state = isVisible ? "0" : "1";
        return;
      }

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
        // Spinner on the resend link while yp.login re-sends the code. cmd is
        // the dtk_otp widget (it fired resendService). Cleared in
        // checkLoginStatus when the response lands — on success the reconnect
        // OTP view is re-fed with a fresh widget anyway.
        this._reconnectOtpCmd = cmd;
        if (cmd && cmd.el) cmd.el.dataset.resending = "1";
        return this.loginUser(this._vars);

      case "reconnect-otp-verified":
        // dtk_otp (reconnect popup) auto-submitted yp.authenticate and got a
        // clean response; hand it to the shared login-status handler. Bad
        // codes are caught inline by the widget and never reach here.
        return this.checkLoginStatus(args.data);

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
        return this.checkOrganizationURL();

      case "open-signup":
        this.append({
          kind: "drumee_api_popup",
          autostart: 1,
          popupContent: "drumee_api_signup",
        });
        return;

      // ---- Inline forgot-password flow ----
      case "reset-password":
        return this.showForgot();

      case "forgot-input":
        if (![_e.commit, _e.Enter].includes(cmd.status)) return;
      // fallthrough: Enter in the email field submits the forgot form
      case "forgot-submit":
        return this.submitForgot();

      case "back-to-signin":
        clearInterval(this._tick);
        this._counting = false;
        // Abandoning the OAuth 2FA screen needs server-side cleanup first: the
        // otp_pending cookie outlives a plain reload and would land us straight
        // back on this screen. Checked before the reconnect branch because the
        // OAuth screen can also be reached from the reconnect popup.
        if (this._inOauthMfa) {
          return this._cancelOauthMfa();
        }
        if (this.mget(RECONNECT)) {
          // Reconnect popup: re-rendering in place leaves the modal over the
          // desk. Navigate to the real sign-in page so the screen matches the
          // URL (same approach as welcome/reset's backToSignin).
          location.hash = "#/welcome/signin";
          location.reload();
          return;
        }
        // Normal welcome page: render the sign-in form in place and keep the
        // URL on the sign-in route.
        try {
          history.replaceState(null, "", "#/welcome/signin");
        } catch (e) { }
        return this.showSignin();

      case "resend-email":
        return this.resendResetLink();

      // ---- Footer terms links ----
      case "see-privacy-terms":
        location.hash = "#/welcome/privacy";
        return;
      case "see-services-terms":
        location.hash = "#/welcome/terms";
        return;

      // ---- Social sign-in (Google / Apple, served by the loby plugin) ----
      case "use-google":
        return this.startOauth("google");

      case "use-apple":
        return this.startOauth("apple");

      case "resend-oauth-otp":
        return this._resendOauthOtp();

      case "oauth-otp-verified":
        // oauth.verify_otp promoted the pending cookie to 'ok'. It returns only
        // a status — no user/hub/organization payload — so there is nothing to
        // feed gotSignedIn with; re-boot instead and let bootstrap resolve the
        // now-authenticated session.
        return this._reloadClean();

      default:
        return super.onUiEvent(cmd, args);
    }
  }

  /**
   *
   */
  loginUser(vars) {
    this.setButtonLoading(true);
    let token = Visitor.parseModuleArgs().back;
    if (token) vars.secret = token;
    this.postService(SERVICE.yp.login, {
      vars,
      vhost: this.mget(_a.vhost),
      resent: this._otpResent,
    }).then(this.checkLoginStatus).catch(this.checkLoginStatus);
  }

  /**
   *
   */
  checkOrganizationURL() {
    this.validateData();
    if (this.formStatus == _a.error) {
      return this.renderMessage(LOCALE.PLEASE_ENTER_URL_TO_CONTINUE);
    }
    let { main_domain, protocol, endpointPath } = bootstrap();
    let domain = this.__refUrl.getValue();
    if (!/(\.[a-zA-Z0-9\-_]+){1,}$/.test(domain)) {
      domain = `${domain}.${main_domain}`;
    }
    if (domain == location.host) {
      location.hash = _K.module.welcome;
      return;
    }
    this.setButtonLoading(true);
    return this.postService({
      service: SERVICE.butler.check_domain,
      domain,
    }).then((data) => {
      if (data.isvalid) {
        Drumee.init_globals(data)
        let { organization } = data;
        setTimeout(() => {
          if (location.host && location.host == organization.url) {
            location.hash = `${_K.module.welcome}/signin/auth`;
            location.reload();
          } else if (organization.url) {
            location.href = `${protocol}://${organization.url}${endpointPath}${_K.module.signin}/auth`;
          } else {
            location.hash = `${_K.module.welcome}/signin/auth`;
            location.reload();
          }
        }, Visitor.timeout(500));
      } else {
        this.renderMessage(LOCALE.PLEASE_ENTER_VALID_URL);
      }
    }).catch(() => this.setButtonLoading(false));
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

    this.setButtonLoading(true);
    let token = Visitor.parseModuleArgs().back;
    if (token) vars.token = token;
    this.postService({
      service: SERVICE.yp.authenticate,
      secret: this.data.secret || Visitor.get('otp_key'),
      code: this.__refCode.getValue(),
    }
    ).then(this.checkLoginStatus).catch(() => this.setButtonLoading(false));
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
    // Reconnect popup uses the dtk_otp 6-box widget (matches dtk-otp__main);
    // normal sign-in keeps the single-input ./otp.js screen.
    if (this.mget(RECONNECT)) {
      return this._promptOtpReconnect(data);
    }
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
    return _.delay(f, Visitor.timeout(5000));
  }

  /**
   * Reconnect-only OTP entry using the dtk_otp 6-box widget. Self-registers
   * dtk_otp on demand (its loadSeeds() isn't run by this bundle), then feeds
   * the dtk_otp skeleton. The widget auto-submits to yp.authenticate; its
   * success is routed through `reconnect-otp-verified` -> checkLoginStatus.
   * @param {Object} data
   */
  async _promptOtpReconnect(data) {
    // exists() (not get()) avoids a "Failed to find kind" warning before the
    // addon is registered.
    if (!Kind.exists("dtk_otp")) {
      Kind.registerAddons({ dtk_otp: import("@drumee/ui-toolkit/widgets/otp") });
    }
    await Kind.waitFor("dtk_otp");
    const skel = require("./skeleton/otp-reconnect")(this);
    if (!this.__content) {
      return this.feed(this._skeleton(this, { content: skel }));
    }
    this.__content.feed(skel);
  }

  /**
   * Start a provider sign-in: ask loby for the authorization URL, then hand the
   * browser to the provider.
   *
   * `initiate` does more than build a URL — it persists a single-use `state` row
   * carrying THIS visitor's session id, because the provider's callback comes
   * back as a cross-site request (Apple's is a cross-site POST) whose cookies
   * are not reliably sent. So the redirect must be driven by what initiate
   * returns; a hand-built provider URL would come back with no session to
   * resume.
   *
   * @param {'google'|'apple'} provider
   */
  startOauth(provider) {
    const api = SERVICE[provider] && SERVICE[provider].initiate;
    if (!api) {
      // The buttons are gated on this same condition (skeleton/content.js), so
      // reaching here means the services map changed under a rendered form.
      return this.renderMessage(LOCALE.COMING_SOON || "Coming soon");
    }
    this.setButtonLoading(true);
    this.postService(api, {}).then((data) => {
      data = data || {};
      if (data.status === "prompt" && data.authUrl) {
        // Leaving the app entirely — keep the spinner up so the button cannot be
        // clicked twice while the navigation is being scheduled. A second click
        // would mint a second state row and orphan the first.
        location.href = data.authUrl;
        return;
      }
      this.setButtonLoading(false);
      this.warn(`${provider}.initiate refused`, data);
      this.renderMessage(this._oauthErrorMessage(data.error));
    }).catch((e) => {
      this.setButtonLoading(false);
      this.warn(`${provider}.initiate failed`, e);
      this.renderMessage(LOCALE.TRY_AGAIN_LATER || "Please try again later");
    });
  }

  /**
   * Human-readable copy for a provider failure. The reasons come from loby
   * (sendOauthError / initiate) and are stable strings, so they are mapped to
   * lexicon keys where we have them and collapsed to one generic line where we
   * do not — an untranslated internal token must never reach the screen.
   * @param {string} error
   * @returns {string}
   */
  _oauthErrorMessage(error) {
    switch (error) {
      case "access_denied":
        // The user backed out on the provider's consent screen. Not a fault.
        return LOCALE.SIGNIN_CANCELLED || "Sign-in was cancelled";
      case "oauth_not_linked":
        return LOCALE.OAUTH_NOT_LINKED ||
          "This email already has a Drumee account. Sign in with your password, then link the provider from your account settings.";
      case "credentials_missing":
      case "oauth_init_failed":
      case "invalid_state":
      case "oauth_failed":
      case "invalid_code":
      case "account_creation_failed":
      case "session_fetch_failed":
      case "unexpected_error":
      default:
        return LOCALE.TRY_AGAIN_LATER || "Please try again later";
    }
  }

  /**
   * Show the provider failure on the sign-in form, then scrub the reason from
   * the URL so a reload does not replay a message about an attempt that is over.
   * @param {string} error
   */
  _renderOauthError(error) {
    this.renderMessage(this._oauthErrorMessage(error));
    try {
      history.replaceState(null, "", "#/welcome/signin");
    } catch (e) { }
  }

  /**
   * 2FA screen for an OAuth sign-in (see skeleton/otp-oauth.js). Self-registers
   * dtk_otp on demand, exactly as _promptOtpReconnect does — this bundle does
   * not run the widget's loadSeeds().
   * @param {string} email  address the code was sent to
   */
  async _promptOtpOauth(email) {
    this._inOauthMfa = true;
    if (!Kind.exists("dtk_otp")) {
      Kind.registerAddons({ dtk_otp: import("@drumee/ui-toolkit/widgets/otp") });
    }
    await Kind.waitFor("dtk_otp");
    const skel = require("./skeleton/otp-oauth")(this, email);
    if (!this.__content) {
      this.feed(this._skeleton(this, { content: skel }));
    } else {
      this.__content.feed(skel);
    }
    this.ensurePart("oauth-otp").then((otp) => this._armOauthOtp(otp));
  }

  /**
   * Teach the dtk_otp instance to recognise a rejected code on this path.
   *
   * The widget self-POSTs and classifies the answer with its own list of failure
   * shapes ('wrong-code', 'INVALID_CODE', …). oauth.verify_otp answers
   * {status:'error'}, which is on none of those lists and carries no `error`
   * key — so a mistyped code would be read as SUCCESS, fire the host service and
   * reload the page, leaving the user back on a blank OTP screen with no idea
   * why. Normalizing the response before the widget inspects it turns that into
   * the inline "invalid code" it already knows how to show.
   *
   * Wrapping (rather than patching the widget) keeps the change scoped to this
   * flow: dtk_otp is shared with the reconnect and password-reset screens, whose
   * APIs answer with the shapes it already understands.
   *
   * @param {LetcBox} otp  the dtk_otp instance
   */
  _armOauthOtp(otp) {
    if (!otp || otp._oauthWrapped || !_.isFunction(otp.postService)) {
      return;
    }
    const api = otp.mget(_a.api);
    if (!api) {
      return;
    }
    otp._oauthWrapped = true;
    const post = otp.postService.bind(otp);
    otp.postService = function (service, ...rest) {
      const p = post(service, ...rest);
      // Resend goes through the host (resendService), so `api` is the only POST
      // this instance makes — but stay narrow anyway.
      if (service !== api) {
        return p;
      }
      return Promise.resolve(p).then((data) => {
        if (data && data.status && data.status !== "success" && data.status !== _a.ok) {
          return { ...data, error: 1 };
        }
        return data;
      });
    };
  }

  /**
   * Re-mint and re-email the code for the pending OAuth sign-in.
   *
   * Host-driven (the skeleton sets `resendService`) rather than letting dtk_otp
   * POST for itself: the widget assigns the resend RESPONSE over its `payload`,
   * and oauth.resend_otp answers {status:'ok'} — which would wipe the email the
   * message line was built from. No secret has to be swapped back in either
   * (unlike the otp-gate resend): the new code is minted against the same
   * pending session and resolved server-side at verify time.
   *
   * Follows the otp-gate resend contract otherwise — [data-resending] on the
   * widget for the spinner, displayMessage for the outcome, and the digit boxes
   * cleared so a half-typed old code cannot be auto-submitted with a digit of
   * the new one.
   */
  async _resendOauthOtp() {
    const api = SERVICE.oauth && SERVICE.oauth.resend_otp;
    if (!api || this._resendingOauth) {
      return;
    }
    const otp = this.getPart("oauth-otp");
    const say = (msg, isError) => {
      if (otp && _.isFunction(otp.displayMessage)) {
        otp.displayMessage(msg, isError);
      }
    };
    this._resendingOauth = true;
    if (otp && otp.el) {
      otp.el.dataset.resending = "1";
    }
    try {
      const data = await this.postService(api, {});
      if (!data || data.status !== _a.ok) {
        this.warn("oauth.resend_otp refused", data);
        return say(LOCALE.UNKNOWN_ERROR || "Something went wrong", 1);
      }
      if (otp && _.isFunction(otp.ensurePart)) {
        const p = await otp.ensurePart("digits");
        const boxes = (p && p.children && p.children.toArray()) || [];
        for (const c of boxes) {
          if (_.isFunction(c.setValue)) c.setValue("");
        }
        if (boxes[0] && _.isFunction(boxes[0].focus)) boxes[0].focus();
      }
      say(LOCALE.NEW_CODE_RESENT || "We have sent a new code");
    } catch (e) {
      this.warn("oauth.resend_otp failed", e);
      say(LOCALE.UNKNOWN_ERROR || "Something went wrong", 1);
    } finally {
      this._resendingOauth = false;
      if (otp && otp.el) {
        otp.el.dataset.resending = "0";
      }
    }
  }

  /**
   * "Back to sign in" from the OAuth 2FA screen.
   *
   * The pending cookie has to be dropped SERVER-side or this screen comes
   * straight back: session_check_cookie reports connection 'otp' while the code
   * is live, and the hand-off params survive a reload. Logging out cannot do it
   * either — session_logout matches the cookie by uid, which a session that was
   * never authenticated does not have. oauth.cancel_otp deletes it by session
   * id. Best-effort: we return to the form whether or not it succeeds.
   */
  _cancelOauthMfa() {
    const done = () => {
      this._inOauthMfa = false;
      this._reloadClean();
    };
    const api = SERVICE.oauth && SERVICE.oauth.cancel_otp;
    if (!api) {
      return done();
    }
    this.postService(api, {}).then(done).catch((e) => {
      this.warn("oauth.cancel_otp failed", e);
      done();
    });
  }

  /**
   * Re-boot on a bare sign-in URL, dropping the oauth_mfa / email / oauth_error
   * params. Reloading with them still in place would re-enter the OTP screen —
   * on the success path against a session that has already been finalized.
   */
  _reloadClean() {
    try {
      history.replaceState(null, "", "#/welcome/signin");
    } catch (e) {
      location.hash = "#/welcome/signin";
    }
    location.reload();
  }

  /**
   * Show One Time Password entry
   * @param {Object} data
   */
  prompt_url(data) {
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
   * Toggle the confirm button's loading spinner (hides the label, blocks
   * clicks) while a request is in flight. No-op on screens without the
   * button (e.g. the dtk_otp reconnect OTP step).
   * @param {boolean} on
   */
  setButtonLoading(on) {
    const b = this.getPart('button-confirm');
    if (!b || !b.el) {
      return;
    }
    if (on) {
      b.el.dataset.loading = 1;
    } else {
      delete b.el.dataset.loading;
    }
  }

  /**
   * Render the sign-in form (default view). Factored so back-to-signin can
   * return here from the forgot / check-inbox views.
   */
  showSignin() {
    this._inCheckInbox = false;
    const opt = require("./skeleton/auth")(this);
    return this.feed(this._skeleton(this, opt));
  }

  /**
   * Render the inline forgot-password view (email input + "Send me the link").
   */
  showForgot() {
    this._inCheckInbox = false;
    return this.feed(this._skeleton(this, require("./skeleton/forgot")(this)));
  }

  /**
   * Render the check-inbox view (shown after a reset link is requested) and
   * start the resend cooldown. Also listens for a cross-tab "reset done" signal
   * (welcome/reset emits drumee:password-reset:done on success) and permanently
   * disables resend when it fires — there's nothing left to resend.
   */
  showCheckInbox() {
    this._inCheckInbox = true;
    this.feed(this._skeleton(this, require("./skeleton/check-inbox")(this)));
    this._startCooldown(COOLDOWN_SEC);
    if (!this._onResetDone) {
      this._onResetDone = (e) => {
        if (e && e.key === "drumee:password-reset:done") {
          this._disableResend();
        }
      };
      window.addEventListener("storage", this._onResetDone);
    }
  }

  /**
   * Validate the email then email the styled "Reset your Drumee password" link
   * template via SERVICE.otp.send_link (same flow as the standalone signin app).
   * Validation: (1) well-formed email, (2) the email is registered
   * (yp.email_exists). send_link generates a forgot-password token, emails the
   * reset-password.html template, and the link lands on #/welcome/reset/{uid}/
   * {token} (the welcome/reset module). socket_id lets the server confirm a live
   * session (best-effort). On success move to the check-inbox view.
   */
  submitForgot() {
    let username;
    try {
      username = this.getPart("ref-ident").getValue();
    } catch (e) { }
    username = (username || "").trim();

    // (1) Must be a valid email format.
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!username || !EMAIL_RE.test(username)) {
      return this.renderMessage(LOCALE.INVALID_EMAIL || "Please enter a valid email address");
    }

    // (2) Must exist before we email a reset link.
    this.setButtonLoading(true);
    this.postService(SERVICE.yp.email_exists, { value: username }).then((res) => {
      if (!res || !res.id) {
        this.setButtonLoading(false);
        return this.renderMessage(LOCALE.OOPS_EMAIL_NOT_FOUND || "No account found with this email");
      }
      return this.postService(SERVICE.otp.send_link, {
        email: username,
        socket_id: Visitor.get(_a.socket_id),
      }).then((data) => {
        this.setButtonLoading(false);
        // send_link returns { status, sent, email }: sent === 1 once the styled
        // reset-link email is delivered.
        if (data && data.sent) {
          this.mset({ email: username });
          this.showCheckInbox();
        } else {
          this.renderMessage(LOCALE.OOPS_EMAIL_NOT_FOUND || "No account found with this email");
        }
      });
    }).catch((e) => {
      this.setButtonLoading(false);
      this.warn("submitForgot: error requesting reset link", e);
    });
  }

  /**
   * Re-send the reset-link email (SERVICE.otp.send_link) from the check-inbox
   * view, then restart the cooldown. Ignored while the cooldown is running.
   */
  resendResetLink() {
    if (this._counting) {
      return;
    }
    const email = this.mget(_a.email) || "";
    if (!email) {
      return;
    }
    // Spinner on the resend button while send_link is in flight.
    this.setButtonLoading(true);
    this.postService(SERVICE.otp.send_link, {
      email,
      socket_id: Visitor.get(_a.socket_id),
    }).then((data) => {
      this.setButtonLoading(false);
      if (data && data.sent) {
        this._startCooldown(COOLDOWN_SEC);
      } else {
        this.renderMessage(LOCALE.OOPS_EMAIL_NOT_FOUND || "No account found with this email");
      }
    }).catch((e) => {
      this.setButtonLoading(false);
      this.warn("resendResetLink: error resending reset link", e);
    });
  }

  /**
   * Format seconds as mm:ss for the resend countdown.
   * @param {number} sec
   */
  _fmt(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  /**
   * Put the resend button (the check-inbox view's button-confirm) on cooldown:
   * disable it and replace its label with a live mm:ss countdown.
   * @param {number} seconds
   */
  _startCooldown(seconds) {
    clearInterval(this._tick);
    if (!(seconds > 0)) {
      return this._endCooldown();
    }
    this._counting = true;
    this.ensurePart("button-confirm").then((b) => {
      if (!b || !b.el) {
        return;
      }
      b.el.dataset.counting = "1";
      let remain = seconds;
      b.el.textContent = this._fmt(remain);
      this._tick = setInterval(() => {
        remain--;
        if (remain <= 0) {
          return this._endCooldown();
        }
        if (b.el) {
          b.el.textContent = this._fmt(remain);
        }
      }, 1000);
    });
  }

  /**
   * End the cooldown: restore the resend button's label and re-enable it.
   */
  _endCooldown() {
    clearInterval(this._tick);
    this._counting = false;
    this.ensurePart("button-confirm").then((b) => {
      if (!b || !b.el) {
        return;
      }
      b.el.textContent = LOCALE.RESEND_EMAIL || "Resend email";
      delete b.el.dataset.counting;
    });
  }

  /**
   * Permanently disable resend (the reset was already completed in another tab).
   */
  _disableResend() {
    // Only act while the check-inbox view is showing — the cross-tab listener
    // outlives the view, and button-confirm is reused by the sign-in / forgot
    // buttons, so guard against disabling the wrong button.
    if (!this._inCheckInbox) {
      return;
    }
    clearInterval(this._tick);
    this._counting = true; // resendResetLink() ignores clicks while set
    this.ensurePart("button-confirm").then((b) => {
      if (!b || !b.el) {
        return;
      }
      delete b.el.dataset.counting;
      b.el.dataset.disabled = "1";
    });
  }

  /**
   * Clean up the cooldown timer and cross-tab listener.
   */
  onDestroy() {
    clearInterval(this._tick);
    if (this._onResetDone) {
      window.removeEventListener("storage", this._onResetDone);
      this._onResetDone = null;
    }
    return super.onDestroy && super.onDestroy();
  }

  /**
   *
   */
  renderMessage(msg) {
    this.setButtonLoading(false);
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
    this.setButtonLoading(false);
    // The round-trip is done — drop the reconnect-OTP resend spinner (if any).
    // On the OTP path the view is re-fed right after, replacing this widget.
    if (this._reconnectOtpCmd && this._reconnectOtpCmd.el) {
      this._reconnectOtpCmd.el.dataset.resending = "0";
    }
    this._reconnectOtpCmd = null;
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
          RADIO_BROADCAST.trigger("user:signed:in", RECONNECT);
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
