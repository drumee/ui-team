/**
 * Downgrade over-limit lock banner — the always-visible strip at the top of
 * the desk while the workspace is over its downgraded plan's limits.
 *
 * Every member sees it (the read-only lock applies to everyone); only an
 * Owner/Admin gets the "Resolve now" CTA — a plain member can't fix it, so
 * offering them the button would be a lie. On full resolution the banner
 * flips to its teal "restored" face for a few seconds, then removes itself.
 *
 * State comes exclusively from libs/over-limit (boot metadata, fetches, WS
 * pushes); this widget renders and never decides. Mounted by the desk into
 * the "desk-body" column, above the topbar.
 */
const OverLimit = require("libs/over-limit");

const RESTORED_LINGER_MS = 6000;
// "Resolve now" stops spinning when its destination shows up (./landed) — or
// after this, so a refused or slow open never leaves it spinning for good.
const RESOLVE_TIMEOUT_MS = 8000;
const { landed } = require("./landed");

class __over_limit_banner extends LetcBox {
  static initClass() {
    require("./skin");
  }

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    this._restored = false;
    this._wasLocked = OverLimit.isLocked();
    this._onStateChanged = this._onStateChanged.bind(this);
    RADIO_BROADCAST.on(OverLimit.CHANGED, this._onStateChanged);
    // Own WS subscription, deliberately NOT left to the desk wm alone: the
    // wm's bindWsEvents hangs off desk.get_env + a retry interval and is
    // routinely unbound after a reconnect (observed live — 37 widgets bound,
    // Wm not among them). This banner exists exactly while the feature is
    // active, so it is the reliable receiver; wm/push.js keeps its case as a
    // second ear and setCurrent is idempotent under duplicates.
    this.bindEvent(_a.live);
  }

  onDomRefresh() {
    this._render();
    // Workspace switches re-decide whether the strip applies (_applies).
    this._onWorkspaceMaybeChanged = () => this._scheduleRecheck();
    RADIO_BROADCAST.on("workspace:focus", this._onWorkspaceMaybeChanged);
    this._watchPaneLayer();
  }

  /**
   * Loading state for "Resolve now": stamped on the CTA (data-loading) and
   * held in `_resolving` so a re-feed keeps it. Cleared when the console or
   * the popup is on screen (./landed), or after RESOLVE_TIMEOUT_MS.
   */
  _startResolving() {
    this._resolving = true;
    this._stampCta();
    const check = () => {
      if (this.isDestroyed && this.isDestroyed()) return this._stopResolving();
      if (landed(document)) this._stopResolving();
    };
    if (typeof MutationObserver === "function" && document.body) {
      this._resolveObserver = new MutationObserver(check);
      this._resolveObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-anim"],
      });
    }
    clearTimeout(this._resolveTimer);
    this._resolveTimer = setTimeout(() => this._stopResolving(), RESOLVE_TIMEOUT_MS);
    check();
  }

  _stopResolving() {
    if (this._resolveObserver) this._resolveObserver.disconnect();
    this._resolveObserver = null;
    clearTimeout(this._resolveTimer);
    if (!this._resolving) return;
    this._resolving = false;
    this._stampCta();
  }

  _stampCta() {
    const el = this.el && this.el.querySelector(`.${this.fig.family}__cta`);
    if (el) el.dataset.loading = this._resolving ? "1" : "0";
  }

  onBeforeDestroy() {
    this._stopResolving();
    RADIO_BROADCAST.off("workspace:focus", this._onWorkspaceMaybeChanged);
    clearTimeout(this._layerTimer);
    if (this._paneObserver) this._paneObserver.disconnect();
    this._paneObserver = null;
    cancelAnimationFrame(this._recheckFrame);
    RADIO_BROADCAST.off(OverLimit.CHANGED, this._onStateChanged);
    clearTimeout(this._lingerTimer);
    this.unbindEvent(_a.live);
  }

  /**
   * Worker/service pushes arrive with the transport key as the FIRST arg
   * ('live.update') and the app event in options.service — traced live on
   * stage: {service:'live.update', model:{...}, options:{service:
   * 'payment.plan_state_changed'}}. Same field wm/push.js switches on.
   */
  onWsMessage(service, data = {}, options = {}) {
    if (options.service === "payment.plan_state_changed") {
      OverLimit.setCurrent(data);
      return;
    }
    if (super.onWsMessage) super.onWsMessage(service, data, options);
  }

  _render() {
    this.feed(require("./skeleton")(this, { restored: this._restored }));
    // The banner only occupies layout while it has something to say —
    // an empty feed still leaves the wrapper element, so collapse it.
    if (this.el) {
      const active = (OverLimit.isLocked() && this._applies()) || this._restored;
      this.el.style.display = active ? "" : "none";
    }
  }

  /**
   * SHOWN ONLY WHERE IT IS TRUE (2026-11-06): the org is over STORAGE, and
   * the workspace on screen belongs to THAT org. A seats-only overage, or a
   * workspace of another org (a share, a personal one), shows no strip.
   *
   * The workspace's org is the pane's `dom_id` — media.attributes carries it
   * (server get_node_attr _withDomain), and Wm.loadWorkspace feeds that
   * response into the pane. Unknown (no pane, an older server, a pane fed
   * from a listing row) shows the strip: hiding a real lock is the worse
   * mistake.
   */
  _applies() {
    const c = OverLimit.current();
    if (!c || !c.flags || !c.flags.storage) return false;
    let org = 0;
    try {
      org = ~~(typeof Organization !== "undefined" && Organization.get && Organization.get("domain_id"));
    } catch (e) { org = 0; }
    let pane = null;
    try {
      pane = window.Wm && _.isFunction(Wm.headlessPane) ? Wm.headlessPane() : null;
    } catch (e) { pane = null; }
    const dom = pane && pane.mget ? pane.mget("dom_id") : null;
    if (!org || dom == null || dom === "") return true;
    return ~~dom === org;
  }

  /**
   * Re-decide when the pane changes. The headless layer gains/loses its
   * window_folder on every workspace switch; observed directly because
   * `workspace:focus` is suppressed when Wm thinks the context is unchanged.
   * Re-bound whenever Wm swaps the layer element (Wm.reload re-feeds it).
   */
  _watchPaneLayer() {
    if (typeof MutationObserver !== "function") return;
    const layer = window.Wm && Wm.headlessLayer && Wm.headlessLayer.el;
    if (!layer) {
      // Wm not up yet at boot — try again shortly, a bounded number of times.
      this._layerTries = (this._layerTries || 0) + 1;
      if (this._layerTries < 40) {
        clearTimeout(this._layerTimer);
        this._layerTimer = setTimeout(() => {
          if (!(this.isDestroyed && this.isDestroyed())) this._watchPaneLayer();
        }, 500);
      }
      return;
    }
    if (this._paneLayerEl === layer && this._paneObserver) return;
    if (this._paneObserver) this._paneObserver.disconnect();
    this._paneLayerEl = layer;
    this._paneObserver = new MutationObserver(() => this._scheduleRecheck());
    this._paneObserver.observe(layer, { childList: true });
    this._scheduleRecheck();
  }

  _scheduleRecheck() {
    cancelAnimationFrame(this._recheckFrame);
    this._recheckFrame = requestAnimationFrame(() => {
      if (this.isDestroyed && this.isDestroyed()) return;
      this._watchPaneLayer();
      if (!this.el || this._restored) return;
      const active = OverLimit.isLocked() && this._applies();
      this.el.style.display = active ? "" : "none";
    });
  }

  _onStateChanged() {
    if (this.isDestroyed && this.isDestroyed()) return;
    if (!OverLimit.isLocked()) {
      // over_limit -> ok is worth celebrating; never-locked stays silent.
      if (!this._wasLocked) return this._render();
      this._wasLocked = false;
      this._restored = true;
      this._render();
      clearTimeout(this._lingerTimer);
      this._lingerTimer = setTimeout(() => {
        this._restored = false;
        if (!(this.isDestroyed && this.isDestroyed())) this._render();
      }, RESTORED_LINGER_MS);
      return;
    }
    this._wasLocked = true;
    this._restored = false;
    this._render();
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    switch (service) {
      case "over-limit-banner-resolve": {
        // One open at a time: the console is a lazy chunk and can take
        // seconds; a second press would queue a second navigation.
        if (this._resolving) return;
        this._startResolving();
        // Straight to the screen that fixes it (Storage tab for a storage
        // overage) instead of re-opening the popup the admin already saw.
        // No target (seats only on a plan without the console) → the popup,
        // which says where those members are removed instead.
        const target = OverLimit.resolveTarget();
        if (target) {
          RADIO_BROADCAST.trigger(target.event, target.arg);
          return;
        }
        RADIO_BROADCAST.trigger("desk:open-over-limit-popup");
        return;
      }
      default:
        if (super.onUiEvent) return super.onUiEvent(cmd, args);
    }
  }
}

__over_limit_banner.initClass();
module.exports = __over_limit_banner;
