class ___contact_item extends LetcBox {

  initialize(opt) {
    if (opt == null) { opt = {}; }
    super.initialize();
    require('./skin');
    this.declareHandlers();
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh(){
    this.feed(require('./skeleton')(this));
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    this.source = cmd;
    this.service = service;
    return this.triggerHandlers(args);
  }
}

module.exports = ___contact_item;
