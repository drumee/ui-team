/* ==================================================================== *
*   Copyright xialia.com  2011-2021
* ==================================================================== */

class ___locale_language extends LetcBox {



  /**
   * 
   */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this.skeleton = require('./skeleton')(this);
    this.contextmenuSkeleton = require('builtins/contextmenu/skeleton');
  }

  /**
   * 
   * @param {View} child
   * @param {String} pn
   */
  // onPartReady (child, pn){
  //   switch(pn){
  //     case _a.none:
  //       this.debug("AAA:31", child);
  //       break;
  //     default:
  //       super.onPartReady(child, pn);
  //       this.debug("AAA:35");
  //   }
  // }
  contextmenuItems(trigger, e) {
    let items = [_e.delete, _a.modify];
    if (trigger.mget(_a.name) == "header") {
      return items;
    }
    items = [_a.update];
    this.debug("AAA:36", items, trigger);
    this._currentItem = trigger;
    return items;
  }

  /**
   * Upon DOM refresh, after element actually insterted into DOM
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }


  /**
   * User Interaction Evant Handler
   * @param {View} cmd
   * @param {Object} args
   */
  onUiEvent(cmd, args) {
    let service = cmd.mget(_a.service) || cmd.get(_a.name);
    this.debug("AAAA:64", service, cmd, args);
    switch (service) {
      case _a.toggle:
        if (this.__content.isEmpty()) {
          this.__content.feed(require('./skeleton/item')(this));
          this.triggerHandlers({
            service: "select-key",
            state : 1
          })
        } else {
          this.__content.clear()
          this.triggerHandlers({
            service: "select-key",
            state : 0
          })
        }
        break;
      case _a.modify:
        this.__content.feed(require('./skeleton/item')(this))
        break;
      case _a.update:
        this.triggerHandlers({
          service: "update-translation",
          name: this._currentItem.mget(_a.name),
          value: this._currentItem.mget(_a.value),
          id: this._currentItem.mget(_a.id),
          key_code : this.mget('key_code'),
          trigger : this._currentItem,
          widgetId : this._currentItem.mget(_a.widgetId),
        });
        //this.__content.feed(require('./skeleton/item')(this))
        break;
     case _e.delete:
        this.triggerHandlers({
          service: "prompt-remove",
          name: this.mget(_a.name),
          key_code : this.mget('key_code')
        })
        //this.__content.feed(require('./skeleton/item')(this))
        break;
    }
  
}


}

module.exports = ___locale_language