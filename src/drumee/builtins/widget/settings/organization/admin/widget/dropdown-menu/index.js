/* ==================================================================== *
 *   Copyright Xialia.com  2011-2020
 *   FILE : /home/somanos/devel/ui/letc/template/index.coffee
 *   TYPE : Component
 * ==================================================================== */
/**
 * @typedef menuOption
 * @type {object}
 * @property {string} display - Display item for the menu
 * @property {string} value - Value on service on change  
 * @property {string} mode - to add the class like enable & disable in menu element 
 * @property {boolean} selected - for default selection 
 */

 /**
 * @typedef dropdownMenu
 * @type {object}
 * @property {'widget_dropdown_menu'} kind - Display item for the menu
 * @property {[menuOption]} options - Value on service on change  
 */

/**
 * Class representing a ___widget_dropdown_menu
 * @class
 * @extends LetcBox
 * @example
 * dropdownMenu = {
 *  kind    : 'widget_dropdown_menu',
 *  options : [
 *    {display: LOCALE.MEMBERS, value: 'members_page', selected : true} // menuOptions
 *  ]
 * }
 */
class ___widget_dropdown_menu extends LetcBox {



  /**
   * Create a ___widget_dropdown_menu.
   * @param {object} opt - parameters 
   */
  initialize(opt = {}) {
    // @ts-ignore
    require('./skin');
    super.initialize(opt);
    /**
     *  @type {[{display: string, value: ?, mode?: string,selected ?: boolean }]}
     **/
    let options = this.mget('options')
    this.debug('init', options, this)
    if (options.length > 0) {
      this.selected = options.find((row) => row.selected);
      if (!this.selected) {
        this.selected = options[0]
      }
    } else {
      this.warn('Options is mandatory')
    }
    this.declareHandlers();
  }

  /* ===========================================================
   *
   * ===========================================================*/
  onPartReady(child, pn) {
    switch (pn) {
      case _a.none:
        this.debug("Created by kind builder", child);
        break;
        // default:
        // super.onPartReady(child, pn, section);
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
  onUiEvent(cmd, args) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    const status = cmd.get(_a.status);
    this.debug(service, status, this);
    this.mget('options')[cmd.el.dataset.id];

    switch (service) {
      case 'change_option':
        this.selected = this.mget('options')[cmd.el.dataset.id];
        this.getPart('selected_text').el.innerText = this.selected.display;
        this.source = cmd
        this.selected = this.selected
        this.service = service
        this.triggerHandlers()
        this.service = ''
        this.debug("Created by kind builder");
      case undefined:
        this.debug("service is undefined");
      default:
        this.debug("Created by kind builder");
    }
  }
}


___widget_dropdown_menu.initClass()

module.exports = ___widget_dropdown_menu
