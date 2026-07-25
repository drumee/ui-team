

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
    if (this.el && variant) {
      this.el.dataset.variant = variant;
      // The notice toast can be raised while a modal panel is still open (the
      // invite-sent toast over permission_restricted). Its z-index would be
      // trapped in the windows-pool stacking context and lose to the modal's
      // full-viewport wrapper, which then swallows the X / Close clicks. Portal
      // it to document.body so its z-index (see skin: --z-index-modal + 100)
      // competes at the true document root and its close controls work.
      if (variant === "notice" && typeof document !== "undefined" &&
          this.el.parentElement !== document.body) {
        document.body.appendChild(this.el);
      }
    }
    this.feed(require("./skeleton")(this));
    this.raise()
  }
}

module.exports = __window_info;

