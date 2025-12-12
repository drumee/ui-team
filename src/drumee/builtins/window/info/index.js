

const mfsInteract = require('../interact');
class __window_info extends mfsInteract {

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    require('./skin');
    super.initialize();
    this.model.atLeast({ 
      message : LOCALE.ACCESS_RESERVED_TO_MEMBERS});

    this.mset({ 
      hub_id : Visitor.id, 
      privilege : _K.privilege.owner
    }); 
    this.style.set({
      width  : this.size.width,
      height : this.size.height,
      left   : (window.innerWidth/2) - (this.size.width/2)
    });
    if (this.mget(_a.version)) {
      this.model.set({
        body : require("./skeleton/revision")(this)});
    }
  }

  /**
   * 
   */
  onDomRefresh(){
    this.feed(require("./skeleton")(this));
  }
}

module.exports = __window_info;

