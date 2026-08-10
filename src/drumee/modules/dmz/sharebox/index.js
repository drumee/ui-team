
// Recipient email gate ("require email to view"): reject only well-known typo
// TLDs (e.g. ".con" for ".com") so obvious mistakes are caught, while EVERY other
// valid-format address is accepted — including less common but legitimate TLDs
// like .law / .bank / .software (a fixed allow-list wrongly rejected those; per
// Lexis 2026-06-17 + Codex review). Entries here MUST be non-real TLDs only; add
// more common typos as needed. SCOPED to this gate — the app-wide Validator.email
// (signup/invite/…) is intentionally left unchanged.
const TLD_TYPOS = new Set([
  // .com typos
  'con', 'cmo', 'ocm', 'vom', 'coom', 'comm', 'ccom', 'conm', 'copm', 'vcom', 'xom',
  // .net / .org typos
  'nett', 'nte', 'ogr', 'orgg', 'rog'
]);

// Display-only helper: which hub areas render with the pink "shared" chrome.
const { isSharedArea } = require('./area');

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
    this._selectedRequestLevels = new Set();
    this._requestEmailInput    = null;
    this._requestMessageInput  = null;
    this._requestSubmit        = null;
    // Neutral share host: pin the share's CONTENT hub (the login response stores
    // hub_id on the model) so every DMZ request targets it even when the page was
    // opened on the neutral host (share.<domain>), whose bootstrap hub differs from
    // the content hub. Fires on every login path (initial + gated unlock). Read by
    // the request layer (@drumee/ui-essentials defaultPayload patch) and cleared in
    // onBeforeDestroy, so desk / authenticated traffic is never affected.
    this.listenTo(this.model, `change:${_a.hub_id}`, this._pinShareHub);
  }

  /**
   * Pin the share's content hub onto Visitor for the request layer. Guarded on a
   * real hub_id; a no-op otherwise.
   */
  _pinShareHub() {
    const hubId = this.mget(_a.hub_id);
    if (hubId) Visitor.set({ share_hub_id: hubId });
  }

  /**
   *
   */
  onBeforeDestroy() {
    this.unbindEvent(_a.live);
    this._stopRevokePolling();
    // Drop the neutral-host content-hub pin so it can never leak into desk traffic.
    Visitor.set({ share_hub_id: null });
  }

  /**
   *
   */
  onWsMessage(svc, data, options = {}) {
    // The dispatcher (router/websocket) passes the service string as the FIRST arg and
    // options is normally {} (no options.service). The old `const {service}=options||svc`
    // therefore resolved service=undefined and silently dropped EVERY event — which is
    // why approval/revoke were never real-time (the recipient had to refresh).
    const service = (options && options.service) || svc;
    if (service === 'share.track_event') {
      if (data && data.event === 'secure_share_revoked' && data.token === this.mget(_a.token)) {
        this.handleInfoStatus({ status: 'TICKET_REVOKED' });
      }
      if (data && data.event === 'secure_share_access_responded') {
        // The event is hub-broadcast (reaches every viewer of the share), so only
        // THIS recipient — the one whose request was answered — should reload. Match
        // the email they requested with (stored locally / on the model).
        const tok = this.mget(_a.token);
        let myEmail = '';
        try { myEmail = (localStorage.getItem('dmz_share_email_' + tok) || '').toLowerCase().trim(); } catch (e) { /* ignore */ }
        myEmail = myEmail || (this.mget('_request_email') || this.mget('recipient_email') || '').toLowerCase().trim();
        const evEmail = (data.requester_email || '').toLowerCase().trim();
        // Act only on a positive email match (or a legacy event with no email).
        if (!evEmail || (myEmail && evEmail === myEmail)) {
          this._handleAccessResponse(data);
        }
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
        // Viral landing chrome (logo / Login / Join Workspace) — shown to ALL
        // recipients so the logged-in view matches the incognito one (user choice:
        // identical to incognito).
        return this.waitElement(child.el, () => {
          child.feed(this.topNavSkeleton(this));
        });

      case _a.header:
        return this.waitElement(child.el, () => {
          child.feed(this.headerSkeleton(this))
        })

      case _a.footer:
        // Viral landing footer. A logged-in recipient already has an account, so
        // the footer still shows (the banner/branding stays) but the "Sign Up Free"
        // button is dropped in the skeleton — see footer.js. The gate footer is fed
        // separately by promptGate, so the anonymous email/password gate banner is
        // unaffected.
        if (!this.mget('is_secure')) return;
        return this.waitElement(child.el, () => {
          child.feed(this.footerSkeleton(this));
        });

      case "logo-block":
        let mascott = require("assets/mascot.png").default;
        child.el.style.backgroundImage = `url(${mascott})`;

      case 'ref-password':
        return this._input = child;

      case 'email-row':
        return this._emailRow = child;

      case 'ref-email':
        this._emailInput = child;
        // Live email validation (Figma 3.2.2): as the recipient types a valid
        // address, surface a green "Email recognised" confirmation + green check;
        // on blur an invalid address shows a red alert. The authoritative
        // allow-list check still runs server-side on Continue (EMAIL_MISMATCH).
        this.waitElement(child.el, () => {
          const input = child.el.querySelector('input');
          if (!input) return;
          const onType = _.debounce(() => this.validateEmailLive(false), 250);
          input.addEventListener('input', onType);
          input.addEventListener('blur', () => this.validateEmailLive(true));
        });
        return;

      case 'desk-content':
        child.once('content:ready', () => {
          this.windowsLayer = child.windowsLayer;
          this.triggerMethod('wm:ready');
          this.contentReady = true;
          this.checkAutoRun();
        })

        return this.waitElement(child.el, () => {
          this.wm = child;
          // The drive-popup is a separate window-manager subtree that the outer
          // .dmz-sharebox[data-area] does not contain, so propagate the area tag
          // here too — it drives the accent for the inner topbar icon, file-grid
          // folder art and active tab border.
          child.el.dataset.area = this._areaTag || 'shared';
        })

      case 'folder-view':
        this._folderView = child;
        return;

      case _a.footer:
        return this.waitElement(child.el, () => {
          child.feed(this.footerSkeleton(this));
        });

      case 'wrapper-dialog':
        this.dialogWrapper = child;
        return;

      case 'ref-request-email':
        return this._requestEmailInput = child;

      case 'ref-request-message':
        return this._requestMessageInput = child;

      case 'request-error':
        return this._requestError = child;

      case 'request-submit':
        return this._requestSubmit = child;

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

    // Replay the email this recipient requested access with (stored on request) so the
    // server can apply an approved grant on refresh. Sent as `grant_email` — used ONLY
    // for grant lookup, never the email gate — so it can't affect gated shares.
    try {
      const savedEmail = localStorage.getItem('dmz_share_email_' + token);
      if (savedEmail) loginOpt.grant_email = savedEmail;
    } catch (e) { /* ignore */ }

    let data = await this.postService(SERVICE.dmz.login, loginOpt);

    this.mset(data);
    // Accent the share UI by workspace area (same rule as the server's
    // workspace_restricted): a public/shared/dmz link stays pink; any true
    // restricted workspace turns the header / badge / folder art red. Missing
    // area (e.g. file-only shares) defaults to the shared look. `public` MUST
    // stay in the shared set — prod returns area='public' for open links.
    const _restricted = !isSharedArea(data.area);
    this._areaTag = _restricted ? 'restricted' : 'shared';
    this.el.dataset.area = this._areaTag;
    if (loginOpt.file_nid) this.mset({ file_nid: loginOpt.file_nid });

    // Own the tab title for the share page. Otherwise ui-core/letc/user.js respawn
    // sets document.title to `<fullname>@<Org>` and for an anonymous guest fullname
    // is empty → "undefined@Zert". preserveTitle blocks that path (host.js already
    // no-ops); data.title is the shared node name (server: node-scoped title).
    document.head.dataset.preserveTitle = '1';
    const sharedTitle = data.title || data.filename || data.name || '';
    document.title = sharedTitle ? `${sharedTitle} · Drumee` : 'Drumee';

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
    // SECURE shares are exempt: dmz_expiry here is the WORKSPACE-level dmz_settings
    // value (copied for display), NOT the secure-share token's own expiry. A secure
    // token's validity is already in data.status/validity (from secure_share_info,
    // e.g. TICKET_OK for expiry_time=0). Without this guard a valid no-expiry secure
    // link falsely shows "expired" whenever the workspace's general DMZ link is expired.
    if (!data.is_secure && data.dmz_expiry === _a.expired) {
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
      // A logged-in viewer whose account email is NOT on the allow-list: show a
      // clean "restricted to a different email" message instead of falling through
      // to getInfoData() (which tried to load the folder and surfaced a server error).
      case 'EMAIL_MISMATCH':
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
    // Focus the gate (Figma 3.2.1): blur the page chrome (top-nav + header) behind
    // the card so ONLY the gate card and the conversion banner read sharp. The
    // gate card and footer already sit in higher stacking layers, so the
    // `[data-gate]` rule only needs to blur the chrome + decorative backdrop.
    this.el.dataset.gate = _a.open;
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

    this._setButtonLoading(true);
    this.postService(SERVICE.dmz.login, opt).then((data) => {
      this._setButtonLoading(false);
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
    }).catch(() => this._setButtonLoading(false));
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
      if (!this._strictEmail(email)) return this.renderErrorMessage(LOCALE.SECURE_SHARE_EMAIL_INVALID_FORMAT);
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

    // Show the in-flight spinner on the Continue/Unlock button and block
    // re-submits until the server responds (cleared on every outcome below).
    this._setButtonLoading(true);
    this.postService(SERVICE.dmz.login, opt).then((data) => {
      this._setButtonLoading(false);
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
    }).catch(() => this._setButtonLoading(false));
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
          // Re-feed the top-nav (Login / Join Workspace vs the recipient's account).
          // It was first rendered from the INITIAL login response — for a password/
          // email-gated share that was the anonymous gate response (no
          // is_authenticated), so it showed the guest Login / Join CTA. The gate has
          // now passed and the model carries the authenticated identity (mset(data)
          // in verify*), so re-render it: a logged-in recipient sees their account;
          // an anonymous one keeps the CTA (is_authenticated still false).
          this.ensurePart('top-nav').then((nav) => {
            if (nav) nav.feed(this.topNavSkeleton(this));
          });
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

      case 'toggle-password-visibility':
        return this._togglePasswordVisibility(cmd);

      case 'toggle-files-layout':
        return this._toggleFilesLayout(cmd);

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
        const { main_domain } = bootstrap();
        // CRITICAL: open LOGIN on the canonical main domain in a new window —
        // exactly like open-signup. The old code did `location.href =
        // _K.module.signin`, but that constant is a HASH route ("#/welcome/signin"),
        // so it was a same-page hash navigation that kept the running app and its
        // in-memory guest session — which is bound to the share's SENDER — so the
        // visitor got auto-logged-in AS THE SENDER (even in incognito). A fresh
        // main-domain page load has no share session → a clean login screen.
        // sessionStorage doesn't cross windows, so carry the workspace as
        // ?hub_id= (the welcome module stashes it into drumee_hubDeepLink).
        const _hubId = this.mget(_a.hub_id) || Visitor.parseLocation().keysel || '';
        const _params = [];
        if (_hubId) _params.push(`hub_id=${encodeURIComponent(_hubId)}`);
        // Return the recipient to THIS share link after signin, so they re-open the
        // shared folder as their authenticated self (not stranded on the desk while
        // this tab stays a guest). Welcome validates it's a Drumee /dmz/share/ URL
        // before redirecting (open-redirect guard) — see _secureShareReturnTarget.
        _params.push(`return_to=${encodeURIComponent(location.href)}`);
        const _suffix = `?${_params.join('&')}`;
        // Preserve the deployment base path (e.g. "/-/test/") so login opens on the
        // SAME build, not the bare root domain. location.pathname is "/-/test/" on
        // the test endpoint and "/" in production → identical to the old URL there.
        window.open(`${location.protocol}//${main_domain}${location.pathname}${_K.module.signin}${_suffix}`, '_blank');
        return;
      }

      case 'go-to-desk': {
        // Footer CTA for a recipient who is ALREADY signed in (footer.js branches
        // on the server's `is_authenticated`): send them to their own Drumee desk
        // instead of the signup page.
        const { main_domain } = bootstrap();
        // Same shape as go-login/open-signup above, and for the same reasons:
        // a NEW window on the canonical main domain (the share is served from the
        // neutral share host / a content vhost, and a same-page hash navigation
        // would keep this tab's running app and its creator-bound guest session —
        // the mechanism behind the "auto-logged-in AS THE SENDER" bug), and
        // location.pathname preserved so it lands on the SAME build ("/-/test/" on
        // test, "/" in production).
        // Deliberately carries NO hub_id and NO return_to. Those two exist to send
        // an ANONYMOUS recipient back to the share after authenticating; this
        // viewer is already authenticated, and a hub_id deep-link would drive the
        // desk into the SHARED workspace they are not a member of → 403. The share
        // tab is left untouched, so they keep reading it.
        window.open(`${location.protocol}//${main_domain}${location.pathname}${_K.module.desk}`, '_blank');
        return;
      }

      case _e.upload:
        // Uploading is an edit action → needs the write grant + an identity.
        if (this._gateInteraction(this.havePermission(_K.permission.write, this.mget(_a.privilege)))) return;
        return this.__fileselector.open(this._upload.bind(this));

      case _e.download:
        this.wm.download();
        return;

      // "Add new" lives in the sharebox topbar (uiHandler = this sharebox),
      // but folder creation belongs to the window manager child — delegate.
      case "add-folder":
        // Creating a folder is an edit action → needs the write grant + identity.
        if (this._gateInteraction(this.havePermission(_K.permission.write, this.mget(_a.privilege)))) return;
        if (this.wm && this.wm.onUiEvent) {
          this.wm.onUiEvent(cmd, { service: "add-folder" });
        }
        return;

      // "Add new" → office document (Document / Spreadsheet / Presentation). Like
      // add-folder, the dropdown lives in this sharebox's topbar but the create
      // belongs to the window manager child — delegate, forwarding the cmd (it
      // carries the template `name`). The server (euroffice.new_doc) re-gates the
      // create to a can_edit recipient + node-scopes it; this client gate keeps a
      // view-only recipient from even firing the request.
      case "new-document":
        if (this._gateInteraction(this.havePermission(_K.permission.write, this.mget(_a.privilege)))) return;
        if (this.wm && this.wm.onUiEvent) {
          this.wm.onUiEvent(cmd, { service: "new-document" });
        }
        return;

      // "Add new" → markdown note. Same delegation as add-folder/new-document.
      // The note saves via media.save as the recipient: a signed-in can_edit
      // recipient's node-grant authorizes + node-scopes the write; anonymous is
      // blocked by the A3 read-only ceiling. This client gate keeps a view-only
      // recipient from firing the request.
      case "add-note":
        if (this._gateInteraction(this.havePermission(_K.permission.write, this.mget(_a.privilege)))) return;
        if (this.wm && this.wm.onUiEvent) {
          this.wm.onUiEvent(cmd, { service: "add-note" });
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
        const _params = [];
        if (_hubId) _params.push(`hub_id=${encodeURIComponent(_hubId)}`);
        // Same return-to-share behaviour as go-login (welcome validates the URL).
        _params.push(`return_to=${encodeURIComponent(location.href)}`);
        const _suffix = `?${_params.join('&')}`;
        // Preserve the deployment base path (e.g. "/-/test/") so signup opens on the
        // SAME build, not the bare root domain. location.pathname is "/-/test/" on
        // the test endpoint and "/" in production → identical to the old URL there.
        window.open(`${location.protocol}//${main_domain}${location.pathname}${_K.module.signup}${_suffix}`, '_blank');
        return;
      }

      case 'tab-files':
        this._activateTab(cmd);
        if (this._folderView) this._folderView.el.dataset.view = 'files';
        return;

      case 'tab-chat':
        // Anonymous recipients may OPEN the Chat tab to READ when the share
        // grants chat (Figma: "view the chat"); posting is gated at send time —
        // a send attempt opens the sign-up overlay (screen 57), wired in the
        // chat widget's sendMessage. Without a chat grant, fall back to the
        // standard gate (anonymous → sign-up; signed-in non-member → Request
        // Access; owner → proceed). Don't activate the tab if the gate blocks.
        if (!this.mget('can_chat') && this._gateInteraction(false)) return;
        this._activateTab(cmd);
        if (this._folderView) this._folderView.el.dataset.view = _a.chat;
        return;

      case 'tab-task':
        this._activateTab(cmd);
        if (this._folderView) this._folderView.el.dataset.view = _a.task;
        return;

      case _e.raise:
        return;

      case 'open-request-access':
        // Route anonymous (not-authenticated) viewers to sign-up first — Request
        // Access is for signed-in non-members. Keyed on is_authenticated, not the
        // unreliable is_guest (false for public shares; see _gateInteraction).
        if (!this.mget('is_authenticated')) return this.showSignupRequiredOverlay();
        return this.showRequestAccessPopup();

      case 'dmz-request-download':
        // A player reported a download/print attempt without the share's
        // download grant — route it like any other beyond-grant interaction
        // (anonymous → sign-up/login; signed-in non-member → Request Access).
        this._gateInteraction(false);
        return;

      case 'select-request-level': {
        // Multi-select: toggle this level independently (a recipient can request
        // several at once, e.g. chat + edit). Reflect the per-row selected state.
        const lvl = cmd.mget('level');
        if (!this._selectedRequestLevels) this._selectedRequestLevels = new Set();
        if (this._selectedRequestLevels.has(lvl)) this._selectedRequestLevels.delete(lvl);
        else this._selectedRequestLevels.add(lvl);
        if (this.__signupOverlay) {
          this.__signupOverlay.el.querySelectorAll('[data-level]').forEach(btn => {
            btn.dataset.selected = this._selectedRequestLevels.has(btn.dataset.level) ? 'yes' : '';
          });
        }
        return;
      }

      case 'submit-access-request':
        return this.submitAccessRequest();

      case 'close-request-access':
        if (this._selectedRequestLevels) this._selectedRequestLevels.clear();
        this.closeSignupRequiredOverlay();
        return;

      case 'close-request-sent':
        this.closeSignupRequiredOverlay();
        return;

      // The window manager navigated a sub-folder in place (Cases 3+4) — refresh
      // the header breadcrumb. The wm owns the nav state; the sharebox owns the topbar.
      case 'dmz-nav-changed':
        return this._refreshBreadcrumb();

      // A header breadcrumb crumb was clicked — navigate the wm to that level.
      case 'breadcrumb-jump':
        if (this.wm && this.wm.navigateToStackIndex) {
          this.wm.navigateToStackIndex(cmd.mget('stackIndex'));
        }
        return;

      default:
        if (super.onUiEvent) return super.onUiEvent(cmd, args);
    }
  }

  /**
   * Render the header breadcrumb from the window manager's folder trail (Cases
   * 3+4), mirroring the desk folder window (refreshBreadcrumbsUI): ancestors are
   * clickable crumbs in `dmz-breadcrumb-path` (joined by "›", with a trailing
   * "›"), and the CURRENT folder is the title (ref-window-name). An empty trail
   * means we're at the share root → no crumbs, title = the share name.
   */
  _refreshBreadcrumb() {
    const wm = this.wm;
    const trail = (wm && wm.folderTrail && wm.folderTrail()) || [];
    const depth = trail.length;
    const rootName =
      this.mget(_a.title) || this.mget(_a.filename) || this.mget(_a.name) || '';
    const currentName = depth ? (trail[depth - 1].name || LOCALE.FOLDER) : rootName;

    // Current folder → title.
    this.ensurePart('ref-window-name').then((t) => {
      if (t && _.isFunction(t.set)) t.set({ content: currentName });
    });

    // Ancestors → clickable crumbs: [share root, trail[0 .. depth-2]]. Each crumb
    // carries the nav depth to keep (0 = root) so a click re-lists that level.
    this.ensurePart('dmz-breadcrumb-path').then((box) => {
      if (!box || (box.isDestroyed && box.isDestroyed())) return;
      box.el.dataset.state = depth ? 1 : 0;
      if (!depth) {
        box.feed([]);
        return;
      }
      const fam = this.fig.family;
      const ancestors = [{ name: rootName, navDepth: 0 }];
      for (let i = 0; i < depth - 1; i++) {
        ancestors.push({ name: trail[i].name || LOCALE.FOLDER, navDepth: i + 1 });
      }
      const crumbs = [];
      ancestors.forEach((a, i) => {
        if (i > 0) {
          crumbs.push(Skeletons.Note({ className: `${fam}__breadcrumb-sep`, content: '›' }));
        }
        crumbs.push(Skeletons.Note({
          className: `${fam}__breadcrumb-crumb`,
          content: a.name || LOCALE.FOLDER,
          service: 'breadcrumb-jump',
          stackIndex: a.navDepth,
          uiHandler: [this],
        }));
      });
      crumbs.push(Skeletons.Note({ className: `${fam}__breadcrumb-sep`, content: '›' }));
      box.feed(crumbs);
    });
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
    this._setButtonLoading(true);
    this.postService(SERVICE.dmz.login, opt).then((data) => {
      this._setButtonLoading(false);
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
        // Remember which workspace this share token belongs to, so a later desk
        // node_info 403 only opens the Request Access modal when it's for THIS share's
        // hub (not any unrelated 403 after the share visit). See desk/wm
        // _onShareAccessDenied.
        localStorage.setItem('share_hub_id', this.mget(_a.hub_id) || data.hub_id || '');
        localStorage.setItem('guest-sid', data.guest_sid);
        this.dmzCheckPasswordResponse(data);
      } else if (!_.isEmpty(data.error)) {
        this.dmzCheckPasswordResponse(data);
      } else {
        this.handleInfoStatus(data);
      }
    }).catch(() => this._setButtonLoading(false))
  }

  /**
   *
  */
  loadDeskContent(banner = 1) {
    // Publish this share's chat grant to a session-global so nested subfolder
    // windows (which open as plain desk folder windows and lose the share caps)
    // can hide the chat tab + conversation panel when chat isn't granted. Read by
    // window/skeleton/toolkit via _dmzShareWithoutChat(); gated on uiRouter.isDmz()
    // there, so it only ever affects this recipient session, never the desk.
    if (window.uiRouter) window.uiRouter._dmzShareCanChat = !!this.mget('can_chat');
    // Publish whether THIS VIEWER can really edit, for the document player's header
    // (player/document/skeleton/menu.js). It cannot decide from the node privilege
    // alone: that is the LINK's cap, pinned by dmz/wm getWindowPreset, so a can_edit
    // link reads "writable" even for an anonymous opener whom the editor then forces
    // read-only — leaving them with a read-only editor and no way to ask for access.
    // Mirrors the editor's own rule (marketplace euroffice: canEdit AND an
    // authenticated identity, either a signed-in recipient or the verified owner);
    // is_owner already implies is_authenticated, so this single test covers both.
    if (window.uiRouter) {
      window.uiRouter._dmzShareViewerCanEdit =
        !!(this.mget('is_authenticated') && this.mget('can_edit'));
    }
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
    // Access granted — un-blur the page chrome (gate is gone).
    delete this.el.dataset.gate;

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
    // Figma alert style: light-red rounded box with centered red text (matches
    // the green success variant's geometry). Co-locates under -password BEM.
    const pfx = `${this.fig.family}-password`
    const msgBox = Skeletons.Note({
      className: `${pfx}__message-text ${pfx}__message-text--error`,
      content: msg
    })

    let buttonWrapper = this.__buttonWrapper;
    let msgWrapper = this.__messageBox;
    if (!buttonWrapper) return;

    buttonWrapper.el.dataset.mode = _a.closed;
    msgWrapper.el.dataset.mode = _a.open;
    msgWrapper.el.dataset.error = '';
    msgWrapper.el.dataset.variant = 'error';
    msgWrapper.feed(msgBox);

    const f = () => {
      msgWrapper.el.dataset.mode = _a.closed
      msgWrapper.el.dataset.variant = ''
      msgWrapper.clear()
      buttonWrapper.el.dataset.mode = _a.open
    }
    return _.delay(f, Visitor.timeout(2000))
  }

  /**
   * Live email validation for the gate (Figma 3.2.2). Called on input (debounced)
   * and on blur. While typing, a freshly-valid address upgrades to the green
   * "recognised" confirmation; an invalid/empty address quietly clears it. Only
   * `onBlur` surfaces a red format error, so the field doesn't nag mid-typing.
   * NOTE: this is a client-side FORMAT check — the server allow-list ("recognised")
   * is still enforced on Continue (EMAIL_MISMATCH). A true server-side recognise
   * check would need a read-only validation endpoint (dmz.login grants on success).
   * @param {Boolean} onBlur
   */
  validateEmailLive(onBlur = false) {
    if (!this._emailInput) return;
    const email = (this._emailInput.getData().value || '').trim();

    if (!email) {
      this._setEmailValid(false);
      return this._hideGateMessage();
    }
    if (this._strictEmail(email)) {
      // Valid email: keep the small green check on the row, but do NOT show the
      // "Email recognised…" success banner (removed per Lexis 2026-06-17 — it had
      // a typo and added noise). Clear any lingering error message instead.
      this._setEmailValid(true);
      return this._hideGateMessage();
    }
    // Invalid format: clear the check; only alert on blur (not every keystroke).
    this._setEmailValid(false);
    if (onBlur) {
      this.renderGateError(LOCALE.SECURE_SHARE_EMAIL_INVALID_FORMAT || LOCALE.INVALID_EMAIL || 'Please enter a valid email address.');
    } else {
      this._hideGateMessage();
    }
  }

  /**
   * Stricter email check for the recipient gate ("require email to view").
   * Requires a valid format AND a TLD that is not a known typo (e.g. ".con"), so
   * obvious mistakes are caught while every other valid address — including
   * uncommon-but-real TLDs — passes. Scoped to this gate — the app-wide
   * Validator.email (signup/invite/…) is intentionally left unchanged.
   * @param {String} v
   * @returns {Boolean}
   */
  _strictEmail(v) {
    const email = String(v || '').trim().toLowerCase();
    if (!Validator.email(email)) return false;
    const tld = email.slice(email.lastIndexOf('.') + 1);
    return !TLD_TYPOS.has(tld);
  }

  /**
   * @param {Boolean} valid  toggles the email row's green check.
   */
  _setEmailValid(valid) {
    if (this._emailRow && this._emailRow.el) {
      this._emailRow.el.dataset.valid = valid ? _a.yes : '';
    }
  }

  /**
   * Hide + reset the gate message row.
   */
  _hideGateMessage() {
    const msgWrapper = this.__messageBox;
    if (!msgWrapper) return;
    msgWrapper.el.dataset.mode = _a.closed;
    msgWrapper.el.dataset.variant = '';
    msgWrapper.clear();
  }

  /**
   * Green success message (Figma 3.2.2). Unlike renderErrorMessage it keeps the
   * Continue button visible — the recipient still has to click it to proceed.
   * @param {String} msg
   */
  renderGateSuccess(msg) {
    const pfx = `${this.fig.family}-password`;
    const msgWrapper = this.__messageBox;
    if (!msgWrapper) return;
    msgWrapper.el.dataset.mode = _a.open;
    msgWrapper.el.dataset.error = '';
    msgWrapper.el.dataset.variant = 'success';
    msgWrapper.feed(Skeletons.Note({
      className: `${pfx}__message-text ${pfx}__message-text--success`,
      content: msg
    }));
  }

  /**
   * Persistent red alert in the gate message row (keeps the button visible).
   * Used by live blur validation; the transient verify-time error uses
   * renderErrorMessage (which also hides/restores the button).
   * @param {String} msg
   */
  renderGateError(msg) {
    const pfx = `${this.fig.family}-password`;
    const msgWrapper = this.__messageBox;
    if (!msgWrapper) return;
    msgWrapper.el.dataset.mode = _a.open;
    msgWrapper.el.dataset.error = '';
    msgWrapper.el.dataset.variant = 'error';
    msgWrapper.feed(Skeletons.Note({
      className: `${pfx}__message-text ${pfx}__message-text--error`,
      content: msg
    }));
  }

  /**
   * Toggle the in-flight spinner on the gate's Continue/Unlock button. Sets
   * `data-loading` on the button wrapper, which the SCSS turns into a spinner
   * and blocks pointer events (prevents double-submit).
   * @param {Boolean} loading
   */
  /**
   * Show/hide the password field — same behaviour as window-secure-share:
   * toggle the input type and swap the eye_closed↔eye glyph + data-state (CSS
   * tints it purple on state=1).
   * @param {LetcBox} cmd  the eye button that was clicked
   */
  _togglePasswordVisibility(cmd) {
    const row = cmd.el.closest(`.${this.fig.family}-password__row`);
    const input = row && row.querySelector('input');
    if (!input) return;
    const isVisible = input.type === 'text';
    input.type = isVisible ? 'password' : 'text';
    const useEl = cmd.el.querySelector('svg use');
    if (useEl) {
      useEl.setAttribute('xlink:href', isVisible ? '#--icon-eye_closed' : '#--icon-eye');
    }
    cmd.el.dataset.state = isVisible ? '0' : '1';
  }

  /**
   * Toggle the file grid between the (default) partitioned grid and a row/list
   * layout — delegated to the window-manager child (this.wm), which carries the
   * view-mode support (window/utils getViewMode/setViewMode). Flips the toggle's
   * data-state so the active half highlights, then re-renders the grid.
   * @param {LetcBox} cmd  the view-toggle box that was clicked
   */
  /**
   * Tab bar is a single-select (radio) group — the Files/Chat/Tasks tabs aren't
   * a framework radio group, so clicking one would leave the previously-active
   * tab highlighted too. Clear every item in the wrapper and mark only the
   * clicked one active.
   * @param {LetcBox} cmd  the tab that was clicked
   */
  _activateTab(cmd) {
    if (!cmd || !cmd.el) return;
    const wrapper = cmd.el.closest('.window-body__tab-bar-wrapper');
    if (!wrapper) return;
    wrapper.querySelectorAll('.window-body__tab-bar-item').forEach((el) => {
      el.dataset.state = el === cmd.el ? '1' : '0';
    });
  }

  _toggleFilesLayout(cmd) {
    const wm = this.wm;
    if (!wm || !wm.el) return;
    // Row view needs BOTH: (1) the wm in row mode so media items re-render as
    // media-row (table rows) — see media/core _getKind, which reads
    // getLogicalParent().getViewMode(); and (2) a single-column scroll so those
    // full-width rows stack (the data-view-mode flag drives the CSS). Doing only
    // one leaves either squished rows in the 120px grid, or cards in a column.
    const scroll = wm.el.querySelector(`.${wm.fig.family}__icons-scroll`);
    const isRow =
      (scroll && scroll.dataset.viewMode === _a.row) ||
      (wm.getViewMode && wm.getViewMode() === _a.row);
    const mode = isRow ? _a.icon : _a.row;
    if (wm.setViewMode) wm.setViewMode(mode);
    if (scroll) scroll.dataset.viewMode = mode;
    if (cmd && cmd.setState) cmd.setState(mode === _a.row ? 1 : 0);
    // Re-render so items re-create with the new kind (media-row ↔ media-grid);
    // _getKind is evaluated at item construction.
    wm.ensurePart(_a.list).then((l) => { if (l && l.restart) l.restart(); });
  }

  _setButtonLoading(loading) {
    // Resolve the button wrapper from the DOM (robust against part-capture
    // timing) and fall back to the registered part. Querying this.el guarantees
    // we toggle the real `.buttons-wrapper` node that the CSS spinner targets.
    const wrapper =
      (this.el && this.el.querySelector(`.${this.fig.family}-password__row.buttons-wrapper`)) ||
      (this.__buttonWrapper && this.__buttonWrapper.el);
    if (!wrapper) return;

    if (loading) {
      clearTimeout(this._loadingTimer);
      this._loadingStart = Date.now();
      wrapper.dataset.loading = _a.yes;
      return;
    }

    // Keep the spinner visible for a minimum window so a fast server response
    // doesn't flip on→off within a single frame (which reads as "no loading").
    const MIN_MS = 500;
    const elapsed = this._loadingStart ? (Date.now() - this._loadingStart) : MIN_MS;
    const wait = Math.max(0, MIN_MS - elapsed);
    clearTimeout(this._loadingTimer);
    this._loadingTimer = setTimeout(() => {
      if (wrapper) wrapper.dataset.loading = '';
    }, wait);
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
    // Leaving the gate (error / expiry / revoke) — un-blur the page chrome.
    delete this.el.dataset.gate;
    let opt = {};
    // EMAIL_MISMATCH is a status (not a validity) — surface it even when a validity
    // such as TICKET_OK is also present, so the "restricted email" message renders.
    let status = (data.status === 'EMAIL_MISMATCH') ? data.status : (data.validity || data.status);
    // Secure shares are exempt from the workspace-level dmz_expiry override — their
    // validity comes from the token (data.status/validity). Only normal dmz/public
    // shares derive expiry from the workspace dmz_settings value. (See onDomRefresh.)
    if (!data.is_secure && data.dmz_expiry == _a.expired) {
      status = 'TICKET_EXPIRED';
    }
    // No case sets btnService: the popup defaults to 'close-popup'. These all used
    // to pass 'redirect-to-home', which in the dmz module did NOT redirect — it
    // opened a mailto: composer — so "OK" popped the visitor's mail client on
    // every one of these screens. (The welcome module's same-named service is a
    // real redirect and is untouched.)
    switch (status) {
      case 'INACTIVE_TICKET':
      case 'TICKET_EXPIRED':
        opt.content = LOCALE.LINK_EXPIRES
        break

      case "INVALID_CREDENTIAL":
        return this.feed(this.defaultSkeleton(this));

      case 'TICKET_REVOKED':
        opt.content = LOCALE.SECURE_SHARE_REVOKED
        // Brand lockup on the revoked card only (Duy 2026-07-30).
        opt.logo = 1
        break

      case 'WRONG_TICKET':
      case 'TICKET_INVALID':
        opt.content = LOCALE.INVALID_LINK
        break

      case 'EMAIL_EXIST':
        opt.content = LOCALE.EMAIL_EXIST_SIGN_CONTINUE
        break

      // Logged in as an account that is not on the share's allow-list — this link
      // is restricted to a specific email; the recipient must sign in as that one.
      case 'EMAIL_MISMATCH':
        opt.content = LOCALE.SECURE_SHARE_EMAIL_BLOCKED
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
  /**
   * Gate an interactive action (chat / edit / upload) per the Figma flow.
   * Such actions need an identity, so:
   *   • anonymous visitor → sign-up / login overlay — ALWAYS, even when the share
   *     grants the capability (you can't chat/edit anonymously);
   *   • signed-in non-member WITHOUT the grant → Request Access popup;
   *   • the share's own creator, or a signed-in recipient who already holds the
   *     grant → proceed.
   * `hasGrant` = whether the share grants this capability. Returns true when it
   * gated (caller should stop), false to proceed.
   */
  _gateInteraction(hasGrant) {
    // Anonymous FIRST. A PUBLIC share binds the guest session to the creator, so
    // an anonymous viewer ALSO has uid === creator_id — checking isOwner before
    // this wrongly treated them as the owner and let edit/upload actions through
    // (the A3 read-only ceiling then silently blocked the server write, with NO
    // popup, so the recipient saw nothing happen). An anonymous visitor must
    // ALWAYS meet the sign-up / login gate. is_guest is unreliable here (the
    // server returns it FALSE for public shares); is_authenticated is true only
    // for a real account.
    if (!this.mget('is_authenticated')) { this.showSignupRequiredOverlay(); return true; }
    const isOwner = !!this.mget('creator_id') && (this.mget('uid') === this.mget('creator_id'));
    if (isOwner) return false;
    if (!hasGrant) { this.showRequestAccessPopup(); return true; }
    return false;
  }

  /**
   *
   */
  showRequestAccessPopup() {
    const overlay = this.__signupOverlay;
    if (!overlay) return;
    this._selectedRequestLevels = new Set();
    this._requestEmailInput    = null;
    this._requestMessageInput  = null;
    this._requestSubmit        = null;
    overlay.feed(require('./skeleton/request-access').default(this));
    overlay.el.dataset.mode = _a.open;
  }

  /**
   *
   */
  async submitAccessRequest() {
    // Ignore repeat clicks while a request is already in flight (the spinner is up).
    if (this._submittingAccessRequest) return;
    // Validate with INLINE feedback in the popup. renderErrorMessage targets the
    // gate's parts (absent here), so it would fail silently — which is why submit
    // appeared dead when a field was missing.
    if (!this._selectedRequestLevels || this._selectedRequestLevels.size === 0) {
      return this._showRequestError(LOCALE.SECURE_SHARE_CHOOSE_LEVEL);
    }
    // Multi-select: send the chosen levels as a comma-list (server stores a SET).
    const requestedLevels = Array.from(this._selectedRequestLevels).join(',');

    const emailEl = this._requestEmailInput
      ? this._requestEmailInput.el.querySelector('input')
      : null;
    const emailVal = emailEl
      ? emailEl.value.trim().toLowerCase()
      // No field rendered (signed-in user — Figma 60 hides it): fall back to the
      // gate email, then the signed-in account email. Mirrors the skeleton's
      // `knownEmail` check so the popup never blank-aborts when the field is hidden.
      : ((this.mget('recipient_email') || Visitor.get('email') || '')).toLowerCase().trim();

    if (!emailVal || !Validator.email(emailVal)) {
      return this._showRequestError(LOCALE.SECURE_SHARE_ENTER_EMAIL);
    }
    this._showRequestError('');

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
      requested_level: requestedLevels,
    };
    if (msgVal) payload.message = msgVal;

    this._setRequestSubmitLoading(true);
    try {
      const data = await this.postService(SERVICE.dmz.request_access, payload);
      if (data && data.status === 'REQUEST_SENT') {
        // Remember the email this share was requested with, so a later approval can
        // be matched on refresh — an anonymous (incognito) recipient has no account
        // email to key the grant on. Sent back as `grant_email` on the next login.
        try { localStorage.setItem('dmz_share_email_' + token, emailVal); } catch (e) { /* ignore */ }
        this.mset({
          _request_email  : emailVal,
          _request_level  : requestedLevels,
          _request_message: msgVal,
        });
        const overlay = this.__signupOverlay;
        if (overlay) {
          overlay.feed(require('./skeleton/request-sent').default(this));
        }
      }
    } catch (e) {
      this._showRequestError(LOCALE.SOMETHING_WENT_WRONG);
    } finally {
      // On success the overlay is swapped to request-sent (button is gone), so this
      // is effectively a no-op there; on error/validation it restores the button.
      this._setRequestSubmitLoading(false);
    }
  }

  /**
   * Toggle the spinner on the request-access submit button. Sets data-loading on
   * the captured submit part and a re-entry guard so a double-click can't fire two
   * request_access calls. Mirrors the password gate's _setButtonLoading spinner.
   * @param {Boolean} loading
   */
  _setRequestSubmitLoading(loading) {
    this._submittingAccessRequest = !!loading;
    const el = this._requestSubmit && this._requestSubmit.el;
    if (!el) return;
    el.dataset.loading = loading ? _a.yes : '';
  }

  /**
   * Inline error feedback inside the request-access popup. The gate's
   * renderErrorMessage cannot be reused here (it drives gate-only parts).
   * @param {String} msg  empty string clears + hides the line
   */
  _showRequestError(msg) {
    const el = this._requestError;
    if (!el || !el.el) return;
    el.el.textContent = msg || '';
    el.el.dataset.mode = msg ? _a.open : _a.closed;
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
      // The approval ADDS to the recipient's current capabilities — it does not
      // replace them (the event payload carries only the newly granted level). A
      // chat share approved for download must keep chat AND gain download, so we
      // union the new caps onto the existing model rather than overwriting (which
      // dropped chat). Mirrors the server-side union in dmz.js _loginSecureShare.
      const prevCaps = this.mget('capabilities') || [];
      const newCaps  = data.capabilities || [];
      const mergedCaps = Array.from(new Set([...prevCaps, ...newCaps]));
      this.mset({
        permission_level: data.granted_level || this.mget('permission_level'),
        privilege       : Math.max(this.mget('privilege') || 3, data.privilege || 3),
        capabilities    : mergedCaps,
        can_download    : this.mget('can_download') || data.can_download || 0,
        can_chat        : this.mget('can_chat') || data.can_chat || 0,
        can_edit        : this.mget('can_edit') || data.can_edit || 0,
      });
      this.loadDeskContent();
      // Figma 67 — notify the guest their access request was approved. The folder
      // name comes from the model (the guest is already viewing it).
      const folder = this.mget(_a.title) || this.mget(_a.filename) || this.mget(_a.name) || '';
      Butler.say(LOCALE.SECURE_SHARE_REQUEST_APPROVED_NOTICE.replace('{folder}', folder));
    } else {
      // Denial: the request overlay was just closed above, and renderErrorMessage
      // only targets the email/password gate parts (absent in the request-access
      // flow) — so it rendered nothing. Use a toast so the recipient actually sees
      // the denial (mirrors the approve-notice path above).
      Butler.say(LOCALE.SECURE_SHARE_ACCESS_DENIED);
    }
  }

}

// __dmz_sharebox.initClass();

module.exports = __dmz_sharebox;
