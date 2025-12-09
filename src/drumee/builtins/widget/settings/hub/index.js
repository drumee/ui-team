

/**
 * @class settings_hub
 * @extends __window_interact
 */
class settings_hub extends LetcBox {

  /**
   * @param {*} opt
   */
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
  }

  /**
   * 
   */
  getViewMode() {
    return _a.grid;
  }
  /**
   *
   */
  onDomRefresh() {
    this.feed(require("./skeleton").default(this));

  }

  /**
   * @param {*} child
   * @param {*} pn
   */
  onPartReady(child, pn) {
    switch (pn) {
    }
  }

  /**
   * @param {*} cmd
   * @param {*} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.mget(_a.service) || cmd.mget(_a.name);
    this.debug("AAA:50", service, cmd)
    switch (service) {
      case _e.close:
      case "close-popup":
        return this.goodbye();

      case _a.members:
        return this.feed({ kind: "settings_members_list", media: this.mget(_a.media) });
        
      default:
        this.debug("AAA:55", service, cmd)
    }
  }


}


module.exports = settings_hub;
