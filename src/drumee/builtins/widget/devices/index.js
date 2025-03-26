// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /home/somanos/devel/ui/letc/template/index.coffee
//   TYPE : Component
// ==================================================================== *

//########################################

class ___media_devices extends LetcBox {
// ===========================================================
//
// ===========================================================
  initialize(opt={}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
  }
    
// # ===========================================================
// # 
// # ===========================================================
//   onPartReady: (child, pn, section) ->
//     switch pn
//       when _a.none
//         @debug "Created by kind builder"
//       else
//         @debug "Created by kind builder"

  /**
   * 
   * @param {*} s 
   */
  onPartReady(child, pn) {
    switch(pn){

    }
  }


  /**
   * 
   */
  async getDevicesList(){
    navigator.mediaDevices.enumerateDevices().then((devices)=>{
      this.debug("serviceWWWWWWWWWAAA 32", devices);
      this.mset({devices});
      devices.forEach((device)=> {
        this.debug("serviceWWWWWWWWWAAA 34", device.kind + ": " + device.label +
          " id = " + device.deviceId);
      });
    }).catch((err)=> {
      this.debug(err.name + ": " + err.message);
    });
  }

  /**
   * 
   * @param {*} s 
   */
  setState(s) {
    super.setState(s); 
    this.__trigger.setState(s, 1); 
  }

  /**
   * 
   */
  onDomRefresh(){
    this.debug("serviceWWWWWWWWWAAA ", this);
    navigator.mediaDevices.enumerateDevices().then((devices)=>{
      this.debug("serviceWWWWWWWWWAAA 32", devices);
      this.mset({devices});
      this.feed(require('./skeleton')(this));
      const l = this.children.last();
      this.__menu    = l;
      this.__trigger = l.__trigger;
      this.__items   = l.__items;
      let dev = {};
      for(var device of devices){
        
        this.debug("serviceWWWWWWWWWAAA 34", device);
      }
    }).catch((err)=> {
      this.debug(err.name + ": " + err.message);
    });
  }
    
// ===========================================================
// 
// ===========================================================
  onDeviceSelect(cmd) {
    return this.debug("serviceWWWWWWWWW ", this);
  }
 
 // ===========================================================
// 
// ===========================================================
  onUiEvent(cmd) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    this.debug(`SERVICEQQQQ=${service}`, cmd, this);
    if (!this.__menu || !this.__menu._ready) { 
      return; 
    }
    this._ready = 1;
    switch (service) {
      case _e.select: 
        return this.triggerHandlers(cmd.model.toJSON());
        
      case 'tab':
        try { 
          return this.getPart(cmd.get(_a.type)).$el.click();
        } catch (error) {}
    }
  }
        

}


module.exports = ___media_devices;
