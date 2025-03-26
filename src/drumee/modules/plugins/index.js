

class __module_plugins extends LetcBox {
  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
  }


  /**
   * 
   */
  route() {
    const event = new Event('drumee:plugins:ready');
    document.dispatchEvent(event);
    this.debug("AAA:29 starting plugin router")

  }

  /**
   * 
   */
  onDomRefresh() {
    this.route();
  }
}
module.exports = __module_plugins;