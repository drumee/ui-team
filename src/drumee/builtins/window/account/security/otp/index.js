
/**
 * 
*/
class security_otp extends LetcBox {


  /**
   * @param {Object} opt
  */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
  }

  /**
   * @param {Object} opt
  */
  onDestroy(opt) {
  }

  /**
    *
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this, 1));
  }
}

module.exports = security_otp;
