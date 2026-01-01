class ___member_detail extends LetcBox {


  /**
   * 
   * @param {*} opt 
   */
  initialize (opt={}){
    require('./skin');
    super.initialize(opt);
    this._memberData = this.mget('memberData')
    this.declareHandlers();
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   */
  onPartReady (child, pn){
    switch(pn){
      case _a.none:
        this.debug("Created by kind builder", child);
        break;
      
      default:
        this.debug("Created by kind builder");
    }
  }

  /**
   * 
   */
  onDomRefresh(){
    this.feed(require('./skeleton').default(this));
  }


  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent (cmd, args = {}){
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);

    switch(service){
      case  _a.none:
        return this.debug("Created by kind builder");
      
      default:
        this.source = cmd
        this.triggerHandlers({ service: service})
    }
  }

}

___member_detail.initClass()

module.exports = ___member_detail
