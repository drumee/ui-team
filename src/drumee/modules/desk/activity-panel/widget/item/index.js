let EOD = "end:of:data"
require('./skin');
class __activity_item extends LetcBox {

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    this.bindEvent("live");
  }

  /**
   * 
   */
  onDomRefresh() {
    this.debug("AAA:19", this)
    this.feed(require('./skeleton')(this));
  }

  /**
   * 
   * @param {*} data 
   */
  update(data) {
    this.mset({ notificationData: data });
    this.__notificationList.feed(data);
  }
  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service) || this.mget(_a.service);
    this.debug("AAA:38", cmd, service, this)
    this.triggerHandlers({ service });

  }
}

module.exports = __activity_item
