class ___address_input_item extends LetcBox {

// ===========================================================
//
// ===========================================================

  initialize(opt) {
    if (opt == null) { opt = {}; }
    require('./skin');
    super.initialize();
    return this.declareHandlers();
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @returns 
   */
  onPartReady(child, pn, section) {
    switch (pn) {
      case _a.none:
        return this.debug("Created by kind builder");
      default:
        return this.debug("Created by kind builder");
    }
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh(){
    return this.feed(require('./skeleton')(this));
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    const status = cmd.get(_a.status);
    this.debug(`SERVICE=${service}`);

    switch (service) {
      case _e.destroy:
        return this.goodbye();
      default:
        return this.debug("Created by kind builder");
    }
  }
}


module.exports = ___address_input_item;
