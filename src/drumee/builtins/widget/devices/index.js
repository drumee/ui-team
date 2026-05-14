
class ___media_devices extends LetcBox {
  initialize(opt={}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
  }
    

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
      this.mset({devices});
    }).catch((err)=> {
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
    navigator.mediaDevices.enumerateDevices().then((devices)=>{
      this.mset({devices});
      this.feed(require('./skeleton')(this));
      const l = this.children.last();
      this.__menu    = l;
      this.__trigger = l.__trigger;
      this.__items   = l.__items;
      let dev = {};
      for(var device of devices){
        
      }
    }).catch((err)=> {
    });
  }
    
  onDeviceSelect(cmd) {
    
  }
 
  onUiEvent(cmd) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
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
