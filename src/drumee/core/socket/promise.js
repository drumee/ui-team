//==================================================================== *
//  Copyright Xialia.com  2011-2018
//  FILE : ../src/drumee/core/socket
//  TYPE : 
//==================================================================== *

//////////////////////////////////////////////////////////////////////////////////
class __socket_promise extends Backbone.Model {

  // ===========================================================
  //
  // ===========================================================
  url(){
    return this.get(_a.url) || bootstrap().serviceApi;
  }

// ===========================================================
//
// ===========================================================
  initialize(){
    const args = Array.prototype.slice.call(arguments);

    switch(args.length){
      case 0:
        console.warn("Options not yet set. Still available at sending.");
        break;
      case 1:
        if(_.isString(args[0])){
          this.service = args[0];
        }else {
          this.data = args[0];
        }
        break;
      case 2: 
        if(_.isString(args[0])){
          this.service = args[0];
          this.data = args[1];
        }else {
          this.data = _.flattenDeep(args)
        }
        break;
      case null: case undefined:
        this.data = args;
    }
  }

  /**
   * 
   */
  beforeSend(opt={}, method="GET"){
    const xhr = new XMLHttpRequest();
    let args = {};
    if(_.isEmpty(opt)){
      args = this.data;
    }else{
      args = opt;
    }
    let service = opt.service || this.service;
    if(!service){
      throw 'Require service';
    }
    const url = this.url() || bootstrap().svc + service;
    this.xhr.open(method, url, true);
    this.trigger(_e.socket.start, xhr)
    xhr.setRequestHeader("x-param-lang", Env.get(_a.lang));
    if(bootstrap().isElectron){
      xhr.setRequestHeader("x-param-auth", localStorage.getItem(_a.session));
    }
    xhr.setRequestHeader("x-param-page-language", Visitor.pagelang());
    xhr.setRequestHeader("x-param-device", Env.get(_a.device));
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader("Content-Type", "application/octet-stream; charset=utf-8")
    if(!args.socket_id) args.socket_id = Visitor.get(_a.socket_id);
    return {service, args, url, xhr};
  }

  /**
   * 
   */
  postService(opt){
    const {service, args, url, xhr} = this.beforeSend(opt, "POST");
    const a = new Promise(function(resolve, reject) {
      var errorCallback;
      var loadCallback;
      
      function cleanup()  {
        xhr.removeEventListener(_e.load, loadCallback);
        xhr.removeEventListener(_e.error, errorCallback);
      }
      
      function errorCallback(err) {
        cleanup();
        console.error("FAILED TO RUN SERVICE ", args);
        reject(err);
      };
      
      loadCallback = function() {
        const r = JSON.parse(xhr.response);
        resolve(r.data);
      };
      
      xhr.addEventListener(_e.load, loadCallback);
      xhr.addEventListener(_e.error, errorCallback);
      
      xhr.addEventListener(_e.load, function load() {
        xhr.removeEventListener(_e.load, load);
        const r = JSON.parse(xhr.response);
        resolve(r.data);
      });
      const params = JSON.stringify(args);
      xhr.send(params);
    });
    return a;
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  fetchService(opt){
    const {service, args, url, xhr} = this.beforeSend(opt, "POST");
    const a = new Promise(function(resolve, reject) {
      function cleanup()  {
        xhr.removeEventListener(_e.load, loadCallback);
        xhr.removeEventListener(_e.error, errorCallback);
      }
      
      function errorCallback(err) {
        cleanup();
        console.error("FAILED TO RUN SERVICE ", err);
        reject(err);
      };
      
      function loadCallback() {
        cleanup();
        const r = JSON.parse(xhr.response);
        if(r.error){
          r.data.type = _a.error;
          r.data.message = r.error || LOCALE.ACCESS_RESERVED_TO_MEMBERS;
        }
        resolve(r.data);
      };
      
      xhr.addEventListener(_e.load, loadCallback);
      xhr.addEventListener(_e.error, errorCallback);
      const params = JSON.stringify(args);
      xhr.setRequestHeader("x-param-xia-data", params)
      xhr.send();
    });
    return a;
  }

}

module.exports = __socket_promise;
