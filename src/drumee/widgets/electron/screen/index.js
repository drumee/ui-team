/* ==================================================================== *
*   Copyright xialia.com  2011-2021
* ==================================================================== */

class ___screen_selector extends LetcBox {

  constructor(...args) {
    super(...args);
  }


  /**
   * 
   */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    //this.skeleton = require('./skeleton')(this);
  }

  /**
   * 
   * @param {View} child
   * @param {String} pn
   */
  // onPartReady(child, pn) {
  //   switch (pn) {
  //     case _a.none:
  //       this.debug("AAA:31", child);
  //       break;
  //     default:
  //       super.onPartReady(child, pn);
  //       this.debug("AAA:35");
  //   }
  // }

  getStream() {
    let selectedSource = null;
    for(var c of this.__list.children.toArray()){
      if(c.mget(_a.state)){
        selectedSource = c;
        break;
      }
    }
    if(selectedSource && selectedSource.id){
      let streamType = selectedSource.id.split(':')[0]
      return {streamId: selectedSource.id,streamType };
    }
    return {};
    // const stream = await navigator.mediaDevices.getUserMedia({
    //   audio: false,
    //   video: {
    //     mandatory: {
    //       chromeMediaSource: "desktop",
    //       chromeMediaSourceId: selectedSource.id,
    //       minWidth: 900,
    //       maxWidth: 1280,
    //       minHeight: 720,
    //       maxHeight: 720,
    //     },
    //   },
    // });

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
  async onUiEvent(cmd, args) {
    let service = cmd.get(_a.service) || cmd.get(_a.name);
    switch(service){
      case  _e.cancel:
        this.trigger(service);
        this.goodbye();
      break;
      case  _e.select:
        let stream = this.getStream();
        this.trigger(_e.select, {service, stream });
        this.el.hide();
        this.goodbye();
      break;
    }
  }

  /**
   * 
   * @param {Object} xhr
   * @param {Model} socket
   */
  on_rest_error(xhr, socket) {
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

module.exports = ___screen_selector