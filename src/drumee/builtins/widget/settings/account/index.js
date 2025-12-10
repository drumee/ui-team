

/**
 * 
 * 
 */
class settings_account extends LetcBox {

  /**
   * @param {*} opt
   */
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
    this.model.set({
      hub_id: Visitor.id,
      role: _a.search,
    });
    this.declareHandlers();
    this.skeletons = [require("./skeleton/profile").default]
  }

  /**
   * 
   */
  getViewMode() {
    return _a.grid;
  }

  /**
   * @param {*} child
   * @param {*} pn
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.content:
        child.feed(this.skeletons[this._page](this));
        break;
    }
  }

  /**
   *
   */
  onDomRefresh() {
    this._page = 0;
    this.feed(require("./skeleton").default(this));
  }


  /**
   * @param {*} cmd
   * @param {*} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.mget(_a.service) || cmd.mget(_a.name);
    this.debug("AAAA:65", service)
    switch (service) {
      case _e.close:
      case "close-popup":
        return this.goodbye();

      case 'load-page':
        this._page = cmd.mget(_a.page);
        this.__content.feed(this.skeletons[this._page](this));
      // default:
      //   return super.onUiEvent(cmd, args);
    }
  }


}


module.exports = settings_account
