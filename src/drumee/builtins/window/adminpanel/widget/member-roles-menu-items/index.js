/* ==================================================================== *
*   Copyright Xialia.com  2011-2020
*   FILE : /src/drumee/builtins/window/adminpanel/widget/member-roles-menu-items/index.js
*   TYPE : Component
* ==================================================================== */

//########################################

class ___widget_member_rolesMenu_items extends LetcBox {
  /* ===========================================================
  *
  * ===========================================================*/
  initialize(opt = {}) {
    require('./skin');
    super.initialize();
    return this.declareHandlers();
  }

  /* ===========================================================
  *
  * ===========================================================*/
  onPartReady(child, pn, section) {
    switch (pn) {
      case _a.none:
        return this.debug("Created by kind builder");
      default:
        return this.debug("Created by kind builder");
    }
  }

  /* ===========================================================
  *
  * ===========================================================*/
  onDomRefresh(){
    return this.feed(require('./skeleton').default(this));
  }

  /* ===========================================================
  *
  * ===========================================================*/
  onChildBubble (c) {}
    // Do not remove : prevent multiple events from children
  
  /* ===========================================================
  *
  * ===========================================================*/
  onUiEvent(cmd) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    this.debug(`onUiEvent Service = ${service}`, cmd, this);

    switch (service) {
      case 'trigger-role-select':
        this.source = cmd;
        this.service = service;
        return this.triggerHandlers();
          
      default:
        this.status = _a.idle;
        return this.debug("Created by kind builder 58");
    }
  }

  /* ===========================================================
  *
  * ===========================================================*/
  __dispatchPush (service, data) {
    switch (service) {
      case SERVICE.no_service:
        this.debug('Created by kind builder', service, data)
    }
  }

  /* ===========================================================
  *
  * =========================================================== */
  getStatus() {
    const roleId = this.mget('role_id');
    const selectedRoles = this.mget(_a.uiHandler).rolesSelected
    if (_.isEmpty(selectedRoles))
      return 0;
    if (selectedRoles.find(row => row.role_id ===  roleId)) {
      return 1;
    }
    return 0;
  }

}



module.exports = ___widget_member_rolesMenu_items;
