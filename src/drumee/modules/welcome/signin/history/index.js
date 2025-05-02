/* ============================================================== *
*   Copyright xialia.com  2011-2021
* =============================================================== */
const { xhRequest } = require("core/socket/request");

class ___signin_history extends LetcBox {

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
    opt.path = opt.path || '/-/';
    let endpoint = `https://${opt.host}${opt.path}`;
    this.mset({ endpoint })
    this.endpoint = endpoint;
  }

  /**
   * 
   * @param {View} child
   * @param {String} pn
   */
  onPartReady(child, pn) {
    let endpoint = this.mget(_a.endpoint)
    switch (pn) {
      case "visual":
        this.debug("AAA:34", { endpoint })
        let bg = `url(${endpoint}avatar/${this.mget(_a.uid)})`;
        if (this.mget(_a.username) != _K.ident.nobody) {
          child.el.style.backgroundImage = bg;
        } else {
          let url = `${endpoint}svc/hub.logo`;
          xhRequest(url).then(async (r) => {
            let res = {};
            if (r.data) {
              res = r.data;
            } else if (_.isString(r.response)) {
              let { data } = JSON.parse(r.response)
              res = data;
            } else if (r.response.data) {
              res = r.response.data;
            }
            if (!res.error) {
              child.el.style.backgroundImage = `url(${res.url})`;
            }
          }).catch((e) => {
            this.warn("AAA:30 43 -- failed to fetch icon url", url, e);
          })
        }
        break;
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
  onUiEvent(cmd, args = {}) {
    let service = cmd.mget(_a.service) || this.mget(_a.service);
    this.triggerHandlers({ service })
    // switch(service){
    //   case 
    //   this.triggerHandlers();
    // }
  }

  /**
   * 
   * @param {Object} xhr
   * @param {Model} socket
   */
  on_rest_error(xhr, socket) {
    this.warn(`EEE:70 GOT SERVER ERROR :`, xhr);
  }

  /**
   * Rest Service Callback
   * @param {String} service
   * @param {Object} data
   * @param {Model} socket
   **************************
  //__dispatchRest(service, data, socket){
  //  switch(service){
  //    case _SVC.no_service:
  //      this.debug("Created by kind builder",service, data)
  //  }
  //}
  ************************** */


  /**
   * Websocket Service Endpoint
   * @param {String} service
   * @param {Object} options
   **************************
  //onLiveUpdate(service, data, options){
  //  switch(service){
  //    case _SVC.no_service:
  //      this.debug("AAA:94",service, data)
  //    break;
  //    default:
  //      this.debug("AAA:97");
  //      if(super.onLiveUpdate) super.onLiveUpdate(service, data, options)
  //  }
  //}
  ************************** */
}

module.exports = ___signin_history