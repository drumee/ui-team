
const __core = require('../core');
class __hub_permission extends __core {

  /**
   * 
   */
  initialize(opt) {
    super.initialize();
    this.hub = this.mget(_a.hub);
    this.default_privilege = this.hub.mget('visitor').privilege || this.hub.mget('default_privilege') || _K.privilege.read;
    this.model.set({
      label: LOCALE.PERMISSION,
      value: this.default_privilege,
      content: this.privilegeToLabel(this.default_privilege)
    });
    this.prefix = this.mget(_a.figPrefix) || this.hub.prefix;
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
      case "wrapper-dialog":
        return this.dialogWrapper = child;
    }
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    return this.reload();
  }

  /**
   * 
   */
  privilegeToLabel(privilege) {
    let label;
    switch (parseInt(privilege)) {
      case 0: 
      case 1: 
      case 2: 
      case _K.privilege.read: 
      case _K.permission.view:
        label = LOCALE.PERMISSION_READ;
        break;
      case _K.privilege.write:
      case _K.permission.download:
      case _K.permission.upload:
        label = LOCALE.PERMISSION_UPLOAD_DOWNLOAD;
        break;
      case _K.privilege.delete: 
      case _K.permission.modify:
        label = LOCALE.PERMISSION_DELETE_ORGANIZE;
        break;
      case _K.privilege.admin: 
      case _K.permission.admin:
        label = LOCALE.ADMINISTRATOR;
        break;
      case _K.privilege.owner: 
      case _K.permission.owner:
        label = LOCALE.OWNER;
        break;
      default:
        label = "LOCALE.UNDEFINED";
    }

    return label;
  }

  /**
   * 
   */
  reload() {
    if (this.hub.media.mget(_a.privilege) & _K.permission.admin) {
      return this.feed(require("../skeleton/common/edit")(this));
    } else {
      return this.feed(require("../skeleton/common/view")(this));
    }
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  _edit(cmd) {
    if (!this.dialogWrapper.isEmpty()) {
      this.dialogWrapper.clear();
      return;
    }

    const opt = {
      kind: 'invitation_permission',
      className: "mb-10",
      debug: __filename,
      source: cmd,
      hub_id: this.mget(_a.hub_id),
      permission: this.hub.mget('default_privilege'),
      skeleton: require('invitation/permission/skeleton/main'),
      service: _e.commit,
      uiHandler: [this],
      styleOpt: {
        top: 0
      }
    };
    return this.dialogWrapper.feed(opt);
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd) {
    const service = cmd.status || cmd.service || cmd.mget(_a.service);
    switch (service) {
      case _e.edit:
        this._edit(cmd);
        break;

      case _e.commit:
        this.postService({
          service: SERVICE.hub.update_settings,
          hub_id: this.hub.media.mget(_a.hub_id),
          vars: {
            default_privilege: cmd.getData().permission
          }
        }).then((data)=>{
          var settings = JSON.parse(data.settings);
          this.mset(settings);
          this.hub.mset(settings);
          this.default_privilege = this.hub.mget('visitor').privilege || this.hub.mget('default_privilege') || settings.default_privilege;
          this.model.set({
            value: this.default_privilege,
            content: this.privilegeToLabel(this.default_privilege)
          });
          this.reload();
          return this.dialogWrapper.children.last().softDestroy();  
        })
        break;
    }
    super.onUiEvent();
  }

}

module.exports = __hub_permission;
