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
    if (opt.filetype == _a.hub && opt.home_id) {
      this.mset(_a.nid, opt.home_id)
    }
  }

  /**
   * Upon DOM refresh, after element actually insterted into DOM
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  /**
   * User Interaction Evant Handler
   * @param {View} trigger
   * @param {Object} args
   */
  onUiEvent(trigger, args = {}) {
    this.triggerHandlers(trigger, args);
  }

}

module.exports = __breadcrumb_item