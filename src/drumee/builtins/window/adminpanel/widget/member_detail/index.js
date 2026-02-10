class ___member_detail extends LetcBox {


  /**
   * 
   * @param {*} opt 
   */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this._memberData = this.mget('memberData')
    this.declareHandlers();
  }


  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('./skeleton').default(this));
  }


  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    this.source = cmd
    this.triggerHandlers({ service })
  }

}

___member_detail.initClass()

module.exports = ___member_detail
