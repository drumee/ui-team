class ___security_switcher extends LetcBox {
  initialize(opt) {
    if (opt == null) { opt = {}; }
    require('./skin');
    super.initialize();
    return this.declareHandlers();
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
    return this.debug(`SERVICE=${service}`, this, this.mget(_a.name), this.__switch.mget(_a.state));
  }
}


module.exports = ___security_switcher;
