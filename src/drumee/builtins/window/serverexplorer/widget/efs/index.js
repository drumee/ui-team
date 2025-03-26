// ==================================================================== *
//   Copyright Xialia.com  2011-2023
//   FILE : /ui/src/drumee/builtins/window/serverexplorer/widget/efs/index.js
//   TYPE : Component
// ==================================================================== *

/**
 * @class __media_efs
 * @extends __media_efs
*/
class __media_efs extends LetcBox {
  constructor(...args) {
    super(...args);
    this.initBounds = this.initBounds.bind(this);
  }

  static initClass() {
    this.prototype.fig = 1;
  }


// ===========================================================
//
// ===========================================================
  initialize(opt) {
    // @ts-ignore
    require('./skin');
    super.initialize(opt);

    this.type = opt.type;
    this.isEfs   = 1;

    this.model.atLeast({
      aspect   : 'efs',
    });

    this.cursorPosition = { left: 80, top: 80 };
    this.size = {
      width:90.5, 
      height:75.5
    }

    this.skeleton = require("./skeleton").default(this);
  }

  /**
   * 
   * @param {*} delay 
   */
  initBounds (delay) {
    return
  }

  /**
   * 
  */
  onUiEvent(cmd, args={}) {
    const service = args.service || cmd.mget(_a.service)
    this.debug(`onUiEvent service = ${service}`, cmd, this)
    switch (service) {
      case 'select-file': case _a.openLocation:
        this.source = cmd;
        return this.triggerHandlers({service: service});
      
      default:
        this.source = cmd;
        this.service = service;
        this.triggerHandlers();
        this.service = '';
    }
  }

}


module.exports = __media_efs;    
