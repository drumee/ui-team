const EOD = 'end:of:data'
class ___widget_members_list extends LetcBox {

  /**
   * 
   * @param {*} opt 
   */
  initialize (opt={}) {
    require('./skin');
    super.initialize(opt);
    this._currentTag = this.mget(_a.source);
    this._type  = this._currentTag.mget(_a.type)
    this.declareHandlers();
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @returns 
   */
  onPartReady (child, pn) {
    switch(pn){
      case 'list-members':
        child.on(EOD, () => {
          this.trigger(EOD);
          let parent = this.getParentByKind('window_adminpanel')
          if (parent && parent._view != _a.min && child.children.first()){
            this.triggerClick();
          }
        })
        break;
      
      default:
        return null
    }
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
  onUiEvent (cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    this.source = cmd
    this.triggerHandlers({service: service})
  }

  /**
   * 
   */
  format () {}

  /**
   * to Trigger the click event 
   * @param {string} id 
   */
  triggerClick (id = null) {
    if(id == null){
      let firstEl = this.__listMembers.children.first()
      _.delay(()=>{
        firstEl.el.click()
      },1000)
      return true;
    }
    let item = this.getItemsByAttr(_a.id, id)[0]
    if(item){
      _.delay(()=>item.el.click(),1000)
      return true;
    }
    return false;
  }

  /**
   * 
   * @returns 
   */
  getAllMembers () {
    let roleId = null;
    if(this._currentTag)
      roleId = this._currentTag.mget('role_id');

    let _option = _a.member
    if (this._type === 'allAdmins') {
      _option = _a.admin
    }
    if (this._type === _a.archived) {
      _option = _a.archived
    }
    
    const api = {
      service  : SERVICE.adminpanel.member_list,
      orgid    : this.mget('orgId'),
      role_id  : roleId,
      option   : _option,
      //hub_id   : Visitor.get(_a.id)
    }
    
    return api;
  }

  /**
   * 
   * @param {*} member 
   */
  addMemberItem (member) {
    const itemsOpt = this.__listMembers.mget(_a.itemsOpt);
    const newMember = _.merge(member, itemsOpt);

    this.__listMembers.prepend(newMember);
  }

  /**
   * 
   * @param {*} member 
   * @param {*} source 
   * @returns 
   */
  updateMemberItem (member, source) {
    this.debug('updateMemberItem', member, this)

    if(_.isEmpty(member.drumate_id)) {
      this.warn('Member ID is required.');
      return
    }
    
    const item = source.getItemsByAttr('drumate_id', member.drumate_id)[0]

    const itemsOpt = this.__listMembers.mget(_a.itemsOpt)
    const updatedMember = _.merge(member, itemsOpt)

    if(!(_.isEmpty(item))) {
      item.model.set(updatedMember)
      item.render()
    }
  }

  /**
   * 
   * @param {*} memberId 
   * @param {*} source 
   * @returns 
   */
  deleteMemberItemById (memberId, source) {
    const member = source.getItemsByAttr('drumate_id', memberId)[0]
    const mlist = this.__listMembers.collection
    mlist.remove(mlist.findWhere({drumate_id: memberId}))
    return
  }

}


module.exports = ___widget_members_list
