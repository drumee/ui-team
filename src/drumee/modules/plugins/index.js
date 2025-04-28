

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
    this.debug("AAA:21 starting plugin router")
    document.dispatchEvent(event);
  }

  /**
   * 
   */
  onDomRefresh() {
    this.route();
  }
}
module.exports = __module_plugins;