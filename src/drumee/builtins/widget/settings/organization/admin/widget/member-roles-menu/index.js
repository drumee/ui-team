
class ___widget_member_rolesMenu extends LetcBox {

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();

    this.rolesSelected = [];
    this._userId = this.mget('userId');
    this._orgId = this.mget('orgId');
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @param {*} section 
   * @returns 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case 'roles-dropdown':
        if (this.autoSave) {
          child.on(_e.close, () => {
            if (this.refreshRole) {
              return this.refreshRole = false;
              // return this.reloadMenu();
            }
          });

          return child.on(_e.open, () => {
            this.refreshRole = true;
            return this.reloadMenu()
          });
        }
        break;
    }
  }

  /**
   * 
   */
  onDomRefresh(){
    this.fetchRoles = 1;
    this.autoSave = 1;

    if (this.mget('fetchRoles') === 0) {
      this.fetchRoles = 0;
    }
    if (this.mget('autoSave') === 0) {
      this.autoSave = 0;
    }

    if (this.fetchRoles) {
      this.fetchRolesData();
    }
    this.refreshRole = true;

    this.feed(require('./skeleton').default(this));
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);

    switch (service) {
      case 'trigger-role-select':
        return;
      
      case 'save-role':
        return this.saveRole();
      
    }
  }

  /**
   * 
   * @returns 
   */
  reloadMenu(){
    this.getPart('roles-dropdown').renderItems(require('./skeleton/item').default(this));
  }
                  
  /**
   * 
   * @returns 
   */
  fetchRolesData(){
    this.fetchService({ 
      service   : SERVICE.adminpanel.role_assigned,
      orgid     : this._orgId,
      user_id   : this._userId,
      //hub_id    : Visitor.id
    }).then((data)=>{
      this.rolesSelected = data;
      this.reloadMenu();
    })
  }

  /**
   * 
   * @returns 
   */
  getRoleListApi(){
    const api = { 
      service : SERVICE.adminpanel.role_show,
      orgid   : this._orgId,
    };
    return api;
  }

  /**
   * 
   * @returns 
   */
  saveRole() {
    const data = this.getPart('role-menu-list').getData(_a.formItem);
    if (!this.autoSave) {
      this.rolesSelected = data.roles.filter(row=> row.role).map(row=> { return {role_id: row.role}; });
      this.getPart('roles-dropdown')._closeItems();
      return;
    }
      
    const selectedRoles = data.roles.filter(row=> row.role).map(row=> row.role);        
    this.postService({
      service   : SERVICE.adminpanel.role_assign,
      user_id   : this._userId,
      role      : selectedRoles,
      orgid     : this._orgId,
      //hub_id    : Visitor.get(_a.id)
    }).then((data)=>{
      this.rolesSelected = data;
      this.refreshRole = true;
      this.getPart('roles-dropdown')._closeItems();
    })
  }

}



module.exports = ___widget_member_rolesMenu;
