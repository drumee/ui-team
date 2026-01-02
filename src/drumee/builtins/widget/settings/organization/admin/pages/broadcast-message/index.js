/* ==================================================================== *
*   Copyright Xialia.com  2011-2020
*   FILE : /src/drumee/builtins/window/adminpanel/pages/broadcast-message/index.js
*   TYPE : Component
* ==================================================================== */

//#########################################

class ___broadcast_message_page extends LetcBox {


  /* ===========================================================
   *
   * ===========================================================*/
  initialize (opt={}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
  }

  /* ===========================================================
   *
   * ===========================================================*/
  onPartReady (child, pn) {
    switch(pn) {
      case _a.none:
        this.debug("Created by kind builder", child);
        break
      
      default:
        this.debug("Created by kind builder");
    }
  }

  /* ===========================================================
   *
   * ===========================================================*/
  onDomRefresh() {
    this.feed(require('./skeleton').default(this));
  }

  /* ===========================================================
   *
   * ===========================================================*/
  onUiEvent (cmd, args) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    this.debug(`onUiEvent service = ${service}`, cmd, this)

    switch(service) {
      case _e.submit:
        this.debug('sendBroadCastMessage');
        break
      
      default:
        this.debug("Created by kind builder");
    }
  }

}

module.exports = ___broadcast_message_page
