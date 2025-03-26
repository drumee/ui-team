/* ==================================================================== *
*   Copyright Xialia.com  2011-2020
*   FILE : src/drumee/builtins/window/transferbox/pages/outbound/index.js
*   TYPE : Component
* ==================================================================== */

/// <reference path="../../../../../../../@types/index.d.ts" />



class ___outbound_page extends LetcBox {


  /**
   * @param {object} opt
  */
  initialize (opt ={}) {
    // @ts-ignore
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
  }
  
  /**
   * @param {any} child
   * @param {any} pn
  */
  onPartReady (child, pn) { return null }

  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('./skeleton').default(this));
  }

  
  /**
   * @param {LetcBox} cmd
   * @param {any} args
   */
  onUiEvent (cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    this.debug('onUiEvent', service, cmd, this);

    switch(service) {
      case _a.none:
        this.debug(' ui event is none ')
        return;
      
      default:
        this.debug("Created by kind builder 222");
    }
  }
}


module.exports = ___outbound_page
