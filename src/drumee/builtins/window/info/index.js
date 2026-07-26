

const mfsInteract = require('../interact');
class __window_info extends mfsInteract {

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    require('./skin');
    super.initialize();
    this.model.atLeast({
      message: "No message",
      area: _a.personal
    });

    this.mset({
      hub_id: Visitor.id,
      privilege: _K.privilege.owner
    });
    if (this.mget(_a.version)) {
      this.model.set({
        body: require("./skeleton/revision")(this)
      });
    }
  }

  /**
   * 
   */
  onDomRefresh() {
    // A `variant` model field (e.g. "notice" for the compact, window-confirm
    // styled invite toast) is surfaced as a data attribute so the skin can
    // scope its layout without affecting the default info dialogs/alerts.
    const variant = this.mget("variant");
    if (this.el && variant) this.el.dataset.variant = variant;
    this.feed(require("./skeleton")(this));
    this.raise()
    this._armSelfDismiss();
  }

  /**
   * Close this toast on its own after `dismiss_after` ms.
   *
   * The timer belongs here rather than in the caller because Wm.info cannot
   * hand back a usable handle: it ends in box.append(), which returns
   * `children.last()` — the pool's last child AT CALL TIME, while Marionette
   * builds this view asynchronously afterwards. Callers that kept that return
   * value were holding some other window, or undefined.
   *
   * Opt-in: without `dismiss_after` the toast stays until dismissed, which is
   * what alerts and confirmations need.
   */
  _armSelfDismiss() {
    const delay = Number(this.mget("dismiss_after"));
    if (!delay || delay <= 0) return;
    clearTimeout(this._dismissTimer);
    this._dismissTimer = setTimeout(() => {
      this._dismissTimer = null;
      // The user may have closed it first.
      if (this.isDestroyed && this.isDestroyed()) return;
      try { this.goodbye(); } catch (e) { /* already gone */ }
    }, delay);
  }

  onBeforeDestroy(opt) {
    clearTimeout(this._dismissTimer);
    this._dismissTimer = null;
    if (super.onBeforeDestroy) super.onBeforeDestroy(opt);
  }
}

module.exports = __window_info;

