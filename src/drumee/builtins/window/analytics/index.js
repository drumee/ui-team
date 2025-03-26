// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/builtins/sandbox/ui
//   TYPE :
// ==================================================================== *


const __window_interact = require('builtins/window/interact');
/**
 * @class __window_search
 * @extends __window_interact
*/

class __window_analytics extends __window_interact {


  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    super.initialize(opt);
    this.declareHandlers();
    this.fig.cluster = "window-analytics";
    this.contextmenuSkeleton = 'a';
  }

    // ===========================================================
  //
  // ===========================================================
  _resizeStart(e, ui) {
    this._isResizing = true;
  }

  // ===========================================================
  //
  // ===========================================================
  _resizeStop(e, ui) {
    e.stopPropagation();
    e.stopImmediatePropagation();
    this.size.height = ui.size.height;
    this.size.width  = ui.size.width;
    this.__content.children.each((c)=>{
      c.draw(1);
    })
    return false;
  }

  // ===========================================================
  //
  // ===========================================================
  _resize(e, ui) {
    e.stopPropagation();
    e.stopImmediatePropagation();
    this.__content.children.each((c)=>{
      c.draw(1);
    })
    return false;
  }

  onPartReady(child, pn) {
    //this.debug("AAAX:103", this.state, child, pn);
    switch (pn) {
      case _a.header:
        let pos = this.$el.position();
        if(this.anti_overlap(pos)){
          this.$el.css(pos);
        }
        this.setupInteract();
        break;
      case _a.content:
        this.$el.addClass(this.fig.cluster);
        //this.setupInteract();
        // Dot not remove. Prevent loading content.
        break;

      default:
        super.onPartReady(...arguments);
    }
  }

}
module.exports = __window_analytics;