let EOD = "end:of:data"
require('./skin');

class settings_activity_hub_item extends DrumeeMFS {
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
    this.feed(require('./skeleton')(this));
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    this.triggerHandlers({ service });
  }
}

module.exports = settings_activity_hub_item;

