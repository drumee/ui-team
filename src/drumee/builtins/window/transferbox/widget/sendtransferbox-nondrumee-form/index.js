/* ==================================================================== *
*   Copyright Xialia.com  2011-2020
*   FILE : src/drumee/builtins/window/transferbox/pages/inbound/index.js
*   TYPE : Component
* ==================================================================== */

/// <reference path="../../../../../../../@types/index.d.ts" />

const __uploader = require('socket/uploader');
const __progress = require('libs/template/progress');

class ___sendtransferbox_nondrumeete_form extends LetcBox {


  /**
   * @param {object} opt
  */
  initialize(opt = {}) {
    // @ts-ignore
    require('./skin');
    super.initialize(opt);
    this.viewInstance = this.mget('viewInstance')
    this._view = this.mget('view')
    this.importResponse = {}
    this.declareHandlers();
  }

  /**
   * @param {any} child
   * @param {any} pn
  */
  onPartReady(child, pn) { return null }

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
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    this.debug('onUiEvent', service, cmd, this);

    switch (service) {
      case _a.none:
        this.debug(' ui event is none ')
        return;

      default:
        this.debug("Created by kind builder 222");
        this.emitServiceToParent({ service: service, cmd: cmd })
    }
  }
  

  emitServiceToParent(option) {
    this.source = option.cmd || this
    this.service = option.service || this.ser
    return this.triggerHandlers()
  }

}


module.exports = ___sendtransferbox_nondrumeete_form
