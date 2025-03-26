/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/mfs/recycle-bin
//   TYPE : 
// ==================================================================== *

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

