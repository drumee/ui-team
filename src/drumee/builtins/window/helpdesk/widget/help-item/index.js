/* ==================================================================== *
*   Copyright Xialia.com  2011-2021
*   FILE : /src/drumee/builtins/window/helpdesk/widget/help-item/index.js
*   TYPE : Component
* ==================================================================== */

/**
 * @class __widget_help_item
 * @extends LetcBox
*/
class ___widget_help_item extends LetcBox {


  /**
   * @param {*} opt
  */
  initialize (opt={}) {
    // @ts-ignore
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
  }

  /**
   * @param {*} child
   * @param {*} pn
  */
  onPartReady(child, pn) { return null; }

  /**
   *
  */
  onDomRefresh() {
    this.feed(require('./skeleton').default(this));
    return
  }

  /**
   * @param {*} cmd
   * @param {*} args
  */
  onUiEvent (cmd, args) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    this.debug(`onUiEvent service = ${service}`, cmd, this);

    switch(service) {
      case _a.none:
       return this.debug(`ui:event`);
      
      default:
        this.emitServiceToParent(service, cmd)
        return this.service = '';
    }
  }

  /**
   * @param {*} service
   * @param {*} data
  */
  emitServiceToParent (service, data = null) {
    this.source   = data || this
    this.service  = service
    return this.triggerHandlers()
  }
}

___widget_help_item.initClass();

module.exports = ___widget_help_item 
