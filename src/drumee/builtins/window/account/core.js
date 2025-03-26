class __account_core extends LetcBox {

  initialize(opt) {
    super.initialize(opt);
    this.responsive = ()=> {
      if (_.isFunction(this.__responsive)) {
        return this.__responsive();
      }
    };

    RADIO_BROADCAST.on(_e.responsive, this.responsive);
    return this.uid =  Visitor.id; 
  }


  /**
   * 
   * @returns 
   */
  onDestroy() {
    return RADIO_BROADCAST.off(_e.responsive, this.responsive);
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @param {*} section 
   * @returns 
   */
  onPartReady(child, pn, section) {
    switch (pn) {
      case _a.list: case "ro":
        return this.listStream = child;
    }
  }
}


module.exports = __account_core;
