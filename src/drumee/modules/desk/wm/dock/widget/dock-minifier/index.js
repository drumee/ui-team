
/**
 * Class representing a ___widget_dock_minifier
 * @class
 * @extends LetcBox
 */
class ___widget_dock_minifier extends LetcBox {



  /**
   * Create a ___widget_dock_minifier.
   * @param {object} opt - parameters 
   */
  initialize(opt = {}) {
    // @ts-ignore
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    Wm.$el.on(_e.minimize, this.onMinify.bind(this));
    this.minimizedCount = 0;
  }

  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('./skeleton').default(this));
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args = {}) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case 'wake-node':
        cmd.mget(_a.source).wake(cmd);
        return cmd.selfDestroy({
          now: true,
          callback: this.updateDockMinifier.bind(this),
        });
        
      case 'remove-minifyer':
        cmd.mget(_a.source).goodbye();
        return cmd.selfDestroy({
          now: true,
          callback: this.updateDockMinifier.bind(this),
        });

    }
  }

  /**
   * @param  {} instance
   */
  onMinify(event ,winInstance) {
    this.debug('onMinify',winInstance,this.__list);
    const itemsOpt = this.__list.mget(_a.itemsOpt);
    if(!winInstance.mget(_a.media)) return;
    let data = winInstance.mget(_a.media).model.toJSON()
    if (winInstance.mget(_a.filetype) == _a.image) {
      data = winInstance.media.model.toJSON()
    }
    delete data.uiHandler;
    const newMinWindow = {
        source: winInstance,
      ...data,
      ...itemsOpt
    }

    this.__list.prepend(newMinWindow)
    this.updateDockMinifier();
  }

  /**
   * 
   * @param {*} a 
   * @param {*} b 
   */
  updateDockMinifier(a,b) {
    let length = this.__list.collection.length; 
    this.minimizedCount = length;
    this.__counter.set('content',length)
    if(length){
      this.getPart('dock-minifier-wrapper').el.dataset.state = _a.open;
    }else{
      this.getPart('dock-minifier-wrapper').el.dataset.state = _a.closed;
      this.$el.click()
    }
  }

}


module.exports = ___widget_dock_minifier
