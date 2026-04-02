/* ==================================================================== *
* Widget automatically generated on 2026-04-01T14:02:19.131Z
* npm run add-widget -- --fig=breadcrumb.item --dest=src/drumee/modules/desk/breadcrumb/item
* ==================================================================== */

require('./skin');

class __breadcrumb_item extends DrumeeMFS {

  /**
   * 
   */
  initialize(opt = {}) {
    delete opt.style;
    delete opt.styleOpt;
    super.initialize(opt);
    this.declareHandlers();
    if (opt.meda) {
      this.copyPropertiesFrom(opt.meda);
      this.meda = opt.meda;
    }
  }

  /**
   * Upon DOM refresh, after element actually insterted into DOM
   */
  onDomRefresh() {
    this.debug("AAA:23", this)
    this.feed(require('./skeleton')(this));
  }

  /**
   * User Interaction Evant Handler
   * @param {View} trigger
   * @param {Object} args
   */
  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.get(_a.service);
    this.debug(`onUiEvent service was called with : `, { service, args, trigger })
    this.triggerHandlers();
  }

}

module.exports = __breadcrumb_item