/* ==================================================================== *
* Widget automatically generated on 2026-04-17T02:40:02.209Z
* npm run add-widget -- --fig=admin.roles --dest=src/drumee/builtins/panel/admin/roles
* ==================================================================== */

class __admin_roles extends LetcBox{

  //constructor(...args) {
  //  super(...args);
  //}


  /**
   * 
   */
  initialize (opt={}){
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    /* uncomment below line to subscribe to websocket events */
    // this.bindEvent("live");
  }

  /**
   * 
   * @param {View} child
   * @param {String} pn
   */
  onPartReady (child, pn){
    //this.debug("onPartReady", child, pn);
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
   * @param {View} trigger
   * @param {Object} args
   */  
  onUiEvent (trigger, args={}){
    const service = args.service || trigger.get(_a.service);
    //switch(service){
    //  case  "my-service":
    //    /** Do something **/
    //  break;
    //  default:
    //    /** Delegate to parent if any **/
    //    if(super.onUiEvent) super.onUiEvent(trigger, args)
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
  //onWsMessage(svc, data, options={}){
  //  const {service} = options || svc;
  //  switch(service){
  //  case  "my-service":
  //    break;
  //    default:
  //      /** Delegate to parent if any **/
  //      if(super.onWsMessage) super.onWsMessage(service, data, options)
  //  }
  //}
}

module.exports = __admin_roles