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
  }

  onDomRefresh() {
    this._render();
  }

  onBeforeDestroy() {
    RADIO_BROADCAST.off(OverLimit.CHANGED, this._onStateChanged);
    clearTimeout(this._lingerTimer);
  }

  _render() {
    this.feed(require("./skeleton")(this, { restored: this._restored }));
    // The banner only occupies layout while it has something to say —
    // an empty feed still leaves the wrapper element, so collapse it.
    if (this.el) {
      const active = OverLimit.isLocked() || this._restored;
      this.el.style.display = active ? "" : "none";
    }
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
      case "over-limit-banner-resolve":
        RADIO_BROADCAST.trigger("desk:open-over-limit-popup");
        return;
      default:
        if (super.onUiEvent) return super.onUiEvent(cmd, args);
    }
  }
}

__over_limit_banner.initClass();
module.exports = __over_limit_banner;
