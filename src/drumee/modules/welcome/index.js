
const { captureUtm } = require('libs/campaign');
const { arm: armHubDeepLink } = require('libs/hub-deep-link');

/**
 * Class representing the Welcome module.
 * @class __welcome_router
 * @extends LetcBox
*/

class __welcome_router extends LetcBox {

  /**
   ** @param {object} opt
  */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();

    window.Welcome = this;
  }

  /**
   *
   */
  onDomRefresh() {
    const args = Visitor.parseModuleArgs() || {};
    // Campaign attribution for a signed-OUT click on a marketing CTA. Recorded
    // before anything can navigate away; localStorage carries it across the
    // full page reload that signin triggers, so the desk sees it after auth.
    captureUtm();
    if (args.invite) {
      this._inviteToken = args.invite;
      RADIO_BROADCAST.once('user:signed:in', () => {
        this._redeemInviteThenEnter();
      });
    }
    const path = Visitor.parseModule() || [];
    // Secure-share recipients who click Login / Sign up arrive with
    // ?return_to=<their share link>. Validate it (open-redirect guard) and, because
    // login here triggers a FULL PAGE RELOAD that wipes any in-memory state, PERSIST
    // the target in sessionStorage — the desk window-manager consumes it after boot
    // (desk/wm onDomRefresh) and redirects the now-authenticated tab back to the
    // shared link. The in-memory flag + once-listener stay as harmless fallbacks for
    // any in-app (no-reload) signin path. No/invalid return_to → nothing set → the
    // normal signin/signup/desk flow is completely unchanged.
    const _ssReturn = args.return_to ? this._secureShareReturnTarget(args.return_to) : null;
    if (_ssReturn) {
      sessionStorage.setItem('drumee_secure_share_return', _ssReturn);
      if (window.uiRouter) window.uiRouter._secureShareReturn = _ssReturn;
      RADIO_BROADCAST.once('user:signed:in', () => { location.href = _ssReturn; });
    }
    // Honour a workspace deep-link (the workspace-invite email's CTA is
    // #/welcome/signin?hub_id=…) so the desk opens that workspace after auth, with
    // no further click. Skip it for a secure-share return: the recipient usually
    // isn't a member of the share's hub (opening it 403s), and the share-return
    // redirect above takes precedence.
    //
    // arm() writes the session key this always used PLUS a dated localStorage
    // fallback, so a sign-up that finishes in the tab the verification link opened
    // still gets the offer. See libs/hub-deep-link.
    //
    // `name` is display copy for the prompt's message. parseModuleArgs does NOT
    // decode (see _secureShareReturnTarget above), so the workspace name arrives
    // percent-encoded and has to be decoded here.
    if (args.hub_id && !_ssReturn) {
      let _hubName = '';
      try {
        _hubName = decodeURIComponent(args.name || '');
      } catch (e) {
        _hubName = args.name || '';
      }
      armHubDeepLink(args.hub_id, _hubName);
    }
    this.route();
  }

  /**
   * Open-redirect guard for the secure-share return_to. Accepts ONLY an absolute
   * http(s) URL that (a) shares this page's registrable domain (same host or a
   * subdomain — so the share endpoint is allowed but external hosts are not) and
   * (b) points at a /dmz/share/ link. Returns the safe URL string, or null to
   * ignore it (→ normal flow, no redirect).
   * @param {string} raw
   * @returns {string|null}
   */
  _secureShareReturnTarget(raw) {
    try {
      // parseModuleArgs returns the raw, still-URL-encoded query value (it does not
      // decode). go-login/open-signup encodeURIComponent the share URL so it survives
      // the `[#/&?]` token split — so decode it back here before parsing.
      let s = String(raw || '');
      try { s = decodeURIComponent(s); } catch (e) { /* fall back to raw */ }
      const url = new URL(s, location.href);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
      // Same-site = the deployment's main domain or a subdomain of it (the share
      // endpoint is a subdomain). Using the KNOWN main_domain avoids the public-suffix
      // pitfall of a naive last-two-labels compare (e.g. attacker.co.uk vs victim.co.uk).
      const { main_domain } = bootstrap() || {};
      const md   = String(main_domain || '').toLowerCase();
      const host = url.hostname.toLowerCase();
      if (!md || (host !== md && !host.endsWith('.' + md))) return null;
      if (!/\/dmz\/share\//.test(url.href)) return null;
      return url.href;
    } catch (e) {
      return null;
    }
  }

  /**
   * 
   */
  loadSignup() {
    const loadDefault = (opt) => {
      this.feed(require('./skeleton').default(this, { ...opt, kind: 'welcome_signin' }));
    }

    if (Visitor.isOnline()) {
      const f = () => {
        this._redeemInviteThenEnter();
      }
      setTimeout(f, Visitor.timeout(700));
      return
    }
    let plugins = Platform.get('plugins');
    if (!plugins) {
      loadDefault()
      return;
    }
    try {
      if (_.isString(plugins)) {
        plugins = JSON.parse(plugins)
      }
    } catch (e) {
      return loadDefault();
    }
    if (!plugins || !plugins.signup) {
      return loadDefault();
    }
    let { name, kind } = plugins.signup;
    if (Kind.get(kind)) {
      this.feed({ kind });
      this._preloadCounterpart('signin');
      return;
    }
    Kind.loadPlugin({ name, kind }).then(() => {
      Kind.waitFor(kind).then((k) => {
        this.feed({ kind });
        this._preloadCounterpart('signin');
      })
    }).catch((e) => {
      return loadDefault();
    })
  }

  /**
   *
   */
  loadSignin() {
    const loadDefault = (opt = {}) => {
      this.feed(require('./skeleton').default(this, { ...opt, kind: 'welcome_signin' }));
    }

    if (Visitor.parseModuleArgs().cross == 'cross') {
      opt.hack = 1;
      loadDefault({ hack: 1 })
      return;
    }

    if (Visitor.isOnline()) {
      const f = () => {
        this._redeemInviteThenEnter();
      }
      setTimeout(f, Visitor.timeout(700));
      return
    }
    let plugins = Platform.get('plugins');
    try {
      if (_.isString(plugins)) {
        plugins = JSON.parse(plugins)
      }
    } catch (e) {
      return loadDefault();
    }
    if (!plugins || !plugins.signin) {
      return loadDefault();
    }
    let { name, kind } = plugins.signin;
    if (Kind.get(kind)) {
      this.feed({ kind });
      this._preloadCounterpart('signup');
      return;
    }
    Kind.loadPlugin({ name, kind }).then(() => {
      Kind.waitFor(kind).then((k) => {
        this.feed({ kind });
        this._preloadCounterpart('signup');
      })
    }).catch((e) => {
      return loadDefault();
    })
  }

  /**
   * Prefetch the opposite welcome plugin (signin while showing signup, or vice
   * versa) so the cross-link transition is instant on the next click. Silent
   * on failure: this is a perf optimization, not a correctness requirement.
   */
  _preloadCounterpart(name) {
    const plugins = Platform.get('plugins');
    const cfg = plugins && plugins[name];
    if (!cfg || !cfg.kind || Kind.exists(cfg.kind)) return;
    Kind.loadPlugin(cfg).catch(() => {});
  }

  /**
   *
   */
  loadReset() {
    const loadDefault = (opt = {}) => {
      const args = Visitor.parseModule();
      if (args[2] != null) {
        opt.uid = args[2];
        opt.secret = args[3];
      }
      this.feed(require('./skeleton').default(this, { ...opt, kind: 'welcome_reset' }));
    }

    if (Visitor.isOnline()) {
      this.postService(SERVICE.drumate.logout, { hub_id: Visitor.id }, { async: 1 }).then(() => {
        location.reload();
      }).catch((e) => {
        this.warn("Failed to disconnect", e)
      });
      return
    }

    try {
      plugins = JSON.parse(Platform.get('plugins'))
    } catch (e) {
      return loadDefault();
    }
    if (!plugins || !plugins.signin) {
      return loadDefault();
    }
    let { name, kind } = plugins.signin;
    Kind.loadPlugin({ name, kind }).then(() => {
      Kind.waitFor(kind).then((k) => {
        this.triggerHandlers({ kind })
      })
    }).catch((e) => {
      return loadDefault();
    })
  }

  /**
   *
  */
  route() {
    const args = Visitor.parseModule();
    this.tab = args[1] || 'hello';

    this.waitElement(this.el, () => {
      this.el.dataset.tab = this.tab;
    });
    switch (this.tab) {
      case 'signup':
        return this.loadSignup();

      case 'signin':
        return this.loadSignin()

      case 'reset':
        return this.loadReset()

      case 'verify':
        // Email-verification landing (#/welcome/verify?token=...). The signup
        // plugin's router renders the "Email confirmed" screen from the token.
        return this.loadSignup()

      default:
        return this.loadSignin()
    }
  }


  /**
   * @param {LetcBox} child
   * @param {LetcBox} pn
  */
  onPartReady(child, pn) {
    switch (pn) {
      case 'wrapper-modal':
        if (localStorage.getItem('skip-browser-check')) return;
        if (!Visitor.browserSupport() || Visitor.parseModuleArgs().browser) {
          child.feed(require('./skeleton/unsupported-browser').default(this));
        }
        break;
    }
  }


  /**
   * @param {object} c
  */
  onChildBubble(c) {
    try {
      return c.clearMessage();
    } catch (error) { }
  }

  /**
   * @param {LetcBox} c
   * @param {any} args
  */
  onUiEvent(c, args = {}) {
    const service = args.service || c.service || c.mget(_a.service);
    switch (service) {
      case _e.close:
        var w = this.getPart('wrapper-modal');
        c = w.children.last();
        if ((c != null) && _.isFunction(c.goodbye)) {
          c.goodbye();
        } else {
          w.clear();
        }
        break;

      case 'skip-browser-check':
        localStorage.setItem('skip-browser-check', 1);
        location.reload()
        break;

      case 'redirect-to-home':
        const { endpoint } = bootstrap();
        return location.href = `${endpoint}${_K.module.welcome}`;

      case 'close-current-connection':
        this.postService(SERVICE.yp.reset_session, {}, { async: 1 }).then(() => {
          location.reload();
        });
        break;

      case "load-signup":
        let { kind } = args;
        this.feed(require('./skeleton').default(this, { kind }));
        break;

      case 'keep-current-connection':
        return location.hash = _K.module.desk;
    }
  }

  /**
   * Redeem a pending invite token then navigate to the target hub (or plain desk on failure).
   */
  async _redeemInviteThenEnter() {
    if (this._inviteToken) {
      try {
        const res = await this.postService('hub.accept_invite', {
          token: this._inviteToken,
        });
        this._inviteToken = null;
        if (res && res.hub_id) {
          RADIO_BROADCAST.trigger("workspace:refresh");
          location.hash = `${_K.module.desk}/wm/hub/?hub_id=${res.hub_id}`;
          return;
        }
      } catch (e) {
        this._inviteToken = null;
        if (window.Wm && Wm.alert) {
          Wm.alert(LOCALE.INVITE_LINK_INVALID);
        }
      }
    }
    location.hash = _K.module.desk;
  }

  /**
   * @param {String} message
   * @param {object} cb
   * @param {any} args
  */
  say(message, cb, args) {
    this.getPart('wrapper-modal').feed(require('./skeleton/message').default(this, message));
    if (_.isFunction(cb)) {
      return cb(args);
    }
  }
}


module.exports = __welcome_router;
