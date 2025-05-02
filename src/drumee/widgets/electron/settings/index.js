/* ==================================================================== *
*   Copyright xialia.com  2011-2021
* ==================================================================== */

class ___electron_settings extends LetcBox {



  /**
   * 
   */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this.skeleton = require('./skeleton')(this);
    this.media = opt.media;
    this._select = 0;
    this._tooltips = 0;
    this.model.set({volatility:1});
    this.on("click:outside", this.goodbye.bind(this));
  }


  /**
   * 
   */
  onBeforeDestroy(){
    let data = this.media.getDataForSync();
    if (!data) return;

    let opt = this.getData(_a.formItem);
    //const {toBitwise} = require('../flags-utils');
    let flags = toBitwise(opt, (k)=>{
      return this.getPart(`${k}-diode`).get(_a.state);
    });

    // let args = {};
    // for (var k in opt) {
    //   if (opt[k]) {
    //     args.syncMode = k;
    //     try {
    //       args.syncDiode = this.getPart(`${k}-diode`).get(_a.state);
    //     } catch (e) {

    //     }
    //   }
    // }

    this.debug('AAAA:106', opt, flags, this.media, data);
    if (flags != null) {
      this.media.refreshSyncView({flags});
      Mfs.setSyncParams({...data, flags});
      //edBridge.send('web-sync-settings', {...data, flags});
    }
    //this.goodbye();
  }

  /**
   * 
   */
  onDestroy(){
    this.off("click:outside", this.goodbye.bind(this));
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
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
    let p = this.$el.position();
    let left = 0;
    if((p.left + this.$el.width()) + 20 > window.innerWidth){
      left = p.left - this.$el.width();
      this.$el.css({left});
    }
    let top = 0;
    if((p.top + this.$el.height()) + 20 > window.innerHeight){
      top = p.top - this.$el.height();
      this.$el.css({top});
    }
  }

  /**
   * 
   */
  toogleRow(cmd) {
    for (var c of this.getItemsByAttr(_a.type, _a.row)) {
      if (c.mget('sys_pn') == cmd.mget(_a.name)) {
        c.el.dataset.radio = _a.on;
      } else {
        c.el.dataset.radio = _a.off;
      }
    }
  }

  /**
   * User Interaction Evant Handler
   * @param {View} cmd
   * @param {Object} args
   */
  onUiEvent(cmd, args) {
    let service = cmd.get(_a.service);
    let name = cmd.get(_a.name);
    switch (service) {
      case "toggle-tooltips":
        this.debug("tooltips", name, cmd.get(_a.state), cmd);
        let text = cmd.get(_a.text);
        if(cmd.get(_a.state)){
          this.__tooltipsWrapper.feed(Skeletons.Note(text));
          let left = this.$el.width();
          let top = 0;
          let p = this.$el.position()
          if((p.left + left + 350)> window.innerWidth){
            left = -this.$el.width();
          }
          if((p.top + 120) > window.innerHeight){
            top = -this.$el.height();
          }
          this.__tooltipsWrapper.$el.css({left, top});
        }else{
          this.__tooltipsWrapper.clear();
        }
        break;
      case _e.select:
        this.toogleRow(cmd);
        break;
      default:
        this.debug("Created by kind builder");
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

module.exports = ___electron_settings