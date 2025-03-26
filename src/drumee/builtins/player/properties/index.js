/* ============================================================= *
*   Copyright xialia.com  2011-2021
* ============================================================== */
const { copyToClipboard } = require("core/utils")
const __player = require('player/interact');
class __player_props extends __player {
  /**
   * 
   */
  async initialize(opt = {}) {
    require('../skin');
    require('./skin');
    super.initialize(opt);
    this.media = opt.media;
    this.size = _K.docViewer;
    this.style.set({
      ...this.size,
      minWidth: 200,
      minHeight: 200,
      opacity: 1,
    });
    this.isEditor = 0;
    this.isPlayer = 1;
  }


  /**
   * 
   * @param {View} child
   * @param {String} pn
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.content:
        child.feed(require("./skeleton/content")(this))
        break;
      default:
        super.onPartReady(child, pn);
    }
  }


  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  /**
   * 
   */

  /**
   * User Interaction Evant Handler
   * @param {View} cmd
   * @param {Object} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    switch (service) {
      case _e.close:
        this.goodbye();
      case _e.copy:
        this.debug("AAA:80", cmd.mget(_a.value), this);
        copyToClipboard(cmd.mget(_a.value));
        this.acknowledge(LOCALE.URL_COPIED);
        break;
      default:
        super.onUiEvent(cmd, args)
    }
  }


}
module.exports = __player_props;
