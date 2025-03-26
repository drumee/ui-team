class ___widget_members_listItem extends LetcBox {

  /**
   * 
   * @param {*} opt 
   */
  initialize (opt={}){
    require('./skin');
    super.initialize(opt);
    this._type  = this.mget(_a.type) || this.mget(_a.origin)
    this.selectedMembersList = this.mget('selectedList') || []
    this.declareHandlers();
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh(){
    this.feed(require('./skeleton').default(this));
    if (this._type == 'choose-member') {  //to prevent self check for whoCanSee
      this.selfMemberCheck()
    }
    return
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent (cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    switch(service) {
      case  'remove-admin':
        this.source = cmd
        return this.triggerHandlers({service: service})
          
      case  'admin-settings':
        return this.updateMenuItems()
      
      case _a.view:
      case _a.manage:
      case 'security':
      case 'owner-rights':
        return this.triggerChangePermission(cmd)

      case 'set-admin-rights':
        return this.submitChangePermission()
      
      default:
        this.source = cmd;
        this.triggerHandlers({service: service})
    }
  }

  /**
   * 
   * @returns 
   */
  selfMemberCheck () {
    if (!this.mget('memberCheck')) {
      return
    }
    this.el.dataset.mode = _a.open
    if (this.mget('drumate_id') == this.mget(_a.uiHandler).memberData.drumate_id) {
      this.el.dataset.mode = _a.closed
    }
    return
  }

  /**
   * 
   */
  updateMenuItems () {
    this.getPart('settings-menu-content').feed(require('./skeleton/menu-item').default(this))
  }

  /**
   * 
   * @param {*} check 
   * @returns 
   */
  permissionCheck(check) {
    let result = 0
    if (this.mget(_a.privilege) >= check) {
      result = 1
    }

    return result
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  triggerChangePermission (cmd) {
    const newState = cmd.getState()
    let val = cmd.mget('_value')
    let newVal = val

    if ((newState != 1) && (val != 3)) {
      newVal = val - 1
    }

    this.mset(_a.privilege, newVal)
    return  this.updateMenuItems()
  }

  /**
   * 
   * @returns 
   */
  submitChangePermission () {
    this.postService({
      service   : SERVICE.adminpanel.member_admin_add,
      orgid     : this.mget('orgId'),
      users     : [this.mget('drumate_id')],
      privilege : this.mget(_a.privilege),
    }).then((data)=>{
      this.render();
      this.el.click();
    })
  }


  /**
   * 
   * @returns 
   */
  getUserState () {
    let _state = 0
    if ((this._type == 'choose-member') || (this._type == 'choose-admin')) {
      const memberId = this.mget('drumate_id') || this.mget(_a.id)
      if ((this.selectedMembersList.length > 0) && this.selectedMembersList.includes(memberId)) {
        _state = 1
      }
    }
    return _state
  }

}

___widget_members_listItem.initClass();

module.exports = ___widget_members_listItem
