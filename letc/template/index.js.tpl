/* ==================================================================== *
*   Copyright xialia.com  2011-2021
* ==================================================================== */

class __<%= group %>_<%= name %> extends <%= parent %>{

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
  }

  /**
   * 
   * @param {View} child
   * @param {String} pn
   */
  onPartReady (child, pn){
    //this.debug("onPartReady:28", child, pn);
    switch(pn){
      case "my-part-name":
        /** Do something **/
        break;
      default:
        /** Delegate to parent if any **/
        //if(super.onPartReady) super.onPartReady(child, pn);
    }
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
  onUiEvent (cmd, args={}){
    const service = args.service || cmd.get(_a.service);
    const status = cmd.get(_a.status);
    this.debug("onUiEvent " + service + " was called with ", args, cmd);
    //switch(service){
    //  case  "my-service":
    //    /** Do something **/
    //  break;
    //  default:
    //    /** Delegate to parent if any **/
    //    if(super.onUiEvent) super.onUiEvent(cmd, args)
    //}
  }


  /** Optional. 
   * uncomment and call this.bindEvent to subscribe to websocket events
   **/
  /** 
   * Websocket Service Endpoint
   * @param {String} service
   * @param {Object} options
   */
  //onWsMessage(service, data, options){
  //  switch(service){
  //  case  "my-service":
  //      this.debug("AAA:94",service, data)
  //    break;
  //    default:
  //      /** Delegate to parent if any **/
  //      if(super.onWsMessage) super.onWsMessage(service, data, options)
  //  }
  //}
}

module.exports = __<%= group %>_<%= name %>