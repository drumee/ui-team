/* ==================================================================== *
*   Copyright xialia.com  2011-2021
* ==================================================================== */

class ___electron_setup extends LetcBox {

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
    this.skeleton = require('./skeleton')(this);
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
  onUiEvent(cmd, args) {
    let service = cmd.get(_a.service) || cmd.get(_a.name);
    let status = cmd.get(_a.status);

    switch (service) {
      case "toggle-tooltips":
        this.debug("tooltips", cmd.get(_a.state), cmd);
        let text = cmd.get(_a.text);
        if (cmd.get(_a.state)) {
          this.__tooltipsWrapper.feed([
            Skeletons.Note(text),
            Skeletons.Note(LOCALE.DESK_SYNC_TIPS, "tips-note")
          ]);
        } else {
          this.__tooltipsWrapper.clear();
        }
        break;
      case _e.select:
        this.toogleRow(cmd);
        break;
      case 'skip':
      case _e.close:
        this.goodbye();
        break;
      case _e.save:
        let opt = this.getData(_a.formItem);
        //const {toBitwise} = require('../flags-utils');
        let flags = toBitwise(opt, (k)=>{
          return this.getPart(`${k}-diode`).get(_a.state);
        });
        // for (var k in opt) {
        //   if (opt[k]) {
        //     flags = flags | map[k];
        //     try {
        //       if(){
        //         flags = flags | 0b100;
        //       }
        //     } catch (e) {

        //     }
        //   }
        // }
        this.debug('AAAA:106', flags);
        Mfs.setSyncParams({nid: _a.root, flags});
        //edBridge.send('web-sync-settings', {nid: _a.root, flags});
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

module.exports = ___electron_setup