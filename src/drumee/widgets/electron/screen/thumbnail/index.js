/* ==================================================================== *
*   Copyright xialia.com  2011-2021
* ==================================================================== */
const CHANGE_RADIO = 'change:radio';
class __screen_thumbnail extends LetcBox{

  /**
   * 
   */
  initialize (opt={}){
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
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

  /**
   * Upon DOM refresh, after element actually insterted into DOM
   */
  onDomRefresh(){
    this.feed(require('./skeleton')(this));
  }

  onChildBubble(o) {
    if (!mouseDragged) {
      this.triggerMethod(CHANGE_RADIO);
    }
  }

  /**
   * User Interaction Evant Handler
   * @param {View} cmd
   * @param {Object} args
   */  
  onUiEvent (cmd, args){
    this.triggerMethod(CHANGE_RADIO);
  }

  /**
   * 
   * @param {Object} xhr
   * @param {Model} socket
   */  
  on_rest_error(xhr, socket){
    this.warn(`GOT SERVER ERROR :`, xhr);
  }

  /**
   * Rest Service Callback
   * @param {String} service
   * @param {Object} data
   * @param {Model} socket
   **************************
  __dispatchRest(service, data, socket){
    switch(service){
      case _SVC.no_service:
        this.debug("Created by kind builder",service, data)
    }
  }
  ************************** */


  /**
   * Websocket Service Endpoint
   * @param {String} service
   * @param {Object} options
   **************************
  onLiveUpdate(service, data, options){
    switch(service){
      case _SVC.no_service:
        this.debug("AAA:94",service, data)
      break;
      default:
        this.debug("AAA:97");
        if(super.onLiveUpdate) super.onLiveUpdate(service, data, options)
    }
  }
  ************************** */
}

module.exports = __screen_thumbnail