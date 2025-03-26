/* ==================================================================== *
*   Copyright xialia.com  2011-2021
* ==================================================================== */

class ___test_result extends LetcBox{

  constructor(...args) {
    super(...args);
  }


  /**
   * 
   */
  initialize (opt={}){
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this.skeleton = require('./skeleton')(this);
    //this.bindEvent('...');
  }

  /**
   * 
   * @param {View} child
   * @param {String} pn
   */
  onPartReady (child, pn){
    /*switch(pn){
      case _a.none:
        this.debug("Created by kind builder", child);
        break;
      default:
        super.onPartReady(child, pn);
        this.debug("Created by kind builder");
    }*/
  }

  /**
   * Upon DOM refresh, after element actually insterted into DOM
   */
  onDomRefresh(){
    this.feed(require('./skeleton')(this));
  }

  /**
   * User Interaction Evant Handler
   * @param {View} cmd
   * @param {Object} args
   */  
  onUiEvent (cmd, args){
    let service = cmd.get(_a.service) || cmd.get(_a.name);
    let status = cmd.get(_a.status);
    this.debug('service', service, cmd);
    switch(service){
      case  _a.none:
        this.debug("Created by kind builder");
      break;
      default:
        this.debug("Created by kind builder");
        this.triggerHandlers();
        // if(super.onUiEvent) super.onUiEvent(cmd, args)
    }
  }



}

module.exports = ___test_result