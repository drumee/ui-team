/* ==================================================================== *
*   Copyright Xialia.com  2011-2021
*   FILE : /src/drumee/builtins/window/helpdesk/index.js
*   TYPE : Component
* ==================================================================== */
/// <reference path="../../../../../@types/index.d.ts" />

const __window_interact_singleton = require('window/interact/singleton');

/**
 * @class ___window_help_desk
 * @extends __window_interact_singleton
 */

class ___window_help_desk extends __window_interact_singleton{


  /**
   * @param {Object} opt
  */
  initialize (opt={}){
    // @ts-ignore
    require('./skin');
    super.initialize(opt);
    if (Visitor.device() === _a.desktop) {
      const width = _K.iconWidth * 6;
      const height = Math.min(_K.iconWidth * 5.5, window.innerHeight - 80);
      this.style.set({
        left   : (window.innerWidth - width - Wm.$el.offset().left - 10)/2,
        top    : -Wm.$el.offset().top,
        minHeight : 340,
        minWidth  : 340,
        height,
        width
      });
    } else { 
      this.style.set({
        left   : 0,
        top    : 0,
        width  : window.innerWidth,
        height : window.innerHeight,
        minHeight : 340,
        minWidth  : 340,
      });
    }
    
    this._setSize();
    this.declareHandlers();
    this.contextmenuSkeleton = 'a';
  }

  /**
   * @param {any} child
   * @param {any} pn
  */
  onPartReady (child, pn) {
    this.raise();
    switch(pn) {
      case _a.content:
        this._content = child;
        this.setupInteract();
          this.waitElement(child.el, async () => {
            let opt = await this.postService(SERVICE.yp.sys_var, {name:"helpdesk_link"});
            try{
              opt = JSON.parse(opt.value);
              this.debug("AAA:77", opt);
            }catch(e){

            }
            child.feed(require('./skeleton/content').default(this, opt));
          })    
       break;
      default:
        super.onPartReady(child, pn);
        this.debug("Created by kind builder");
    }
  }

  /**
   */
  onDomRefresh() {
    this.feed(require('./skeleton').default(this));
  }

  /**
   * @param {any} cmd
   * @param {any} args
   */
  onUiEvent (cmd, args){
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    this.debug(`onUiEvent service = ${service}`, cmd, this)

    switch(service){
      case _e.close:
        return this.postService({
          service : SERVICE.drumate.intro_acknowledged,
          hub_id  : Visitor.id
        }).then((data)=>{
          Visitor.set(data);
          this.goodbye();
        });
      default:
        this.debug("Created by kind builder");
        super.onUiEvent(cmd, args)
    }
  }
}


module.exports = ___window_help_desk
