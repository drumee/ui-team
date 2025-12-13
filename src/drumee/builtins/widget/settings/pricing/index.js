

/**
 * @class settings_folder
 * @extends __window_interact
 */
class settings_pricing extends LetcBox {

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
    switch (service) {
      case _e.close:
      case "close-popup":
        return this.goodbye();
      case "checkout":
        this.postService(SERVICE.payment.checkout, this._currentPlan).then((data) => {
          let { url } = data;
          window.open(url, 'popUpWindow', url);
        })
        break;
      case "select-plan":
        this._currentPlan = {
          value: cmd.mget(_a.value),
          plan: cmd.mget(_a.description),
        }
      // default:
      //   return super.onUiEvent(cmd, args);
    }
  }


}


module.exports = settings_pricing;
