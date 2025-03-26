/* ========================================================= *
*   Copyright Xialia.com  2011-2022
*   FILE : /ui/src/drumee/builtins/window/sharebox/widget/sharebox-setting/index.js
*   TYPE : Component
* ========================================================== */

/// <reference path="../../../../../../../@types/index.d.ts" />
const { copyToClipboard } = require("core/utils")

class ___widget_sharebox_setting extends LetcBox {

  /**
   * @param {object} opt
  */
  initialize(opt = {}) {
    // @ts-ignore
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this.notificationMode = _a.readonly;
    this.permissionMode = _a.view;
  }

  /**
   * @param {any} child
   * @param {any} pn
  */
  onPartReady(child, pn) {
    switch (pn) {
      case 'month-setting-input': 
      case 'hours-setting-input':
        return this.waitElement(child.el, () => {
          const maxValue = child.mget(_a.max)
          child.on('blur keyup', () => {
            if (parseInt(child.getValue()) > maxValue) {
              child.setValue(`${maxValue}`);
            }
          });
        })
    }
  }

  /**
   * 
   */
  onDomRefresh() {
    this.getNodeSettingsApi();
  }

  /**
   * @param {LetcBox} cmd
   * @param {any} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case 'close-popup':
        return this.goodbye();
      case 'copy-url-btn':
        copyToClipboard(this.data.link);
        this.__urlCopySuccessText.el.dataset.state = _a.open;
        return _.delay(() => {
          this.__urlCopySuccessText.el.dataset.state = _a.closed;
        }, Visitor.timeout(2000));

      case 'change-permission':
        return this.triggerChangePermission(cmd);
      // case 'notification-list-updated':
      case 'edit-notification-list':
        this.notificationMode = _a.edit;
        return this.refreshNotificationList();
      case 'edit-password':
        return this.getPart('password-content').feed(require('./skeleton/password').default(this, _a.edit))
      case 'save-password':
        return this.savePassword();
      case 'edit-permission':
        this.permissionMode = _a.edit;
        return this.getPart('permissions-setting').feed(require('./skeleton/permission').default(this, _a.edit))
      case 'save-permission':
        return this.savePermission();
      
      case 'toggle-validity-mode':
        return this.toggleValidityMode(cmd);

      case 'edit-validity':
        return this.getPart('validfor-content').feed(require('./skeleton/valid-until').default(this, _a.edit));
      case 'save-validity':
        return this.saveValidity();
      
      case 'save-notification-list':
        return this.saveNotification();
      case 'cancel-notification-list':
        this.notificationMode = _a.readonly;
        return this.refreshNotificationList();
      case 'add-drumate':
      case 'add-guest':
      case 'delete-member':
        return
        // return this.onAddUser(cmd);
        // return this.onDeleteUser(cmd);

      default:
        this.source = cmd;
        this.service = service;
        this.triggerHandlers();
        this.service = '';
    }
  }


  /**
   * 
   */
  savePassword() {
    let data = this.getData(_a.formItem);
    this.formData.password = data.password;
    this.data.hasPaswword = 0;
    if (!_.isEmpty(data.password)) {
      this.data.hasPaswword = 1;
    }
    this.saveSettings(_a.password, { password: data.password });
    return this.getPart('password-content').feed(require('./skeleton/password').default(this, _a.view));
  }

  /**
   * 
   */
  savePermission() {
    this.permissionMode = _a.view;
    if (this.formData.privilege != this.mget(_a.privilege)) {
      this.formData.privilege = this.mget(_a.privilege);
      this.saveSettings(_a.permission, { "permission": this.formData.privilege });
    }
    return this.getPart('permissions-setting').feed(require('./skeleton/permission').default(this, _a.view));
  }

  /**
   * @param {*} cmd 
  */
  toggleValidityMode (cmd) {
    const mode = cmd.mget(_a.value);
    this.debug('toggleValidityMode', mode, cmd, this);

    if (mode == _a.limited) {
      this.__setValidityWrapper.el.dataset.mode = _a.open;
      return this.getPart('validfor-content').feed(require('./skeleton/valid-until').default(this, _a.edit, 'toggle-edit'));
    } else {
      this.__setValidityWrapper.el.dataset.mode = _a.closed;
      this.formData.days = '0';
      this.formData.hours = '0';
      this.formData.validity_mode = _a.infinity;
      let data = {
        days: '0',
        hours: '0',
        validity_mode: _a.infinity
      }
      this.saveSettings(_a.expiry, data, (d) => {
        this.data.dmz_expiry = d.dmz_expiry || _a.infinity;
        this.getPart('validfor-content').feed(require('./skeleton/valid-until').default(this, _a.view));
        return this.triggerHandlers({service: 'update-expiry-status', status: this.data.dmz_expiry});
      });
    }
  }

  /**
   * 
   */
  saveValidity() {
    let fdata = this.getData(_a.formItem);
    if (this.formData.hours != fdata.hours || this.formData.days != fdata.days) {
      this.formData.days = fdata.days;
      this.formData.hours = fdata.hours;
      this.formData.validity_mode = _a.limited;
      let data = {
        days: fdata.days,
        hours: fdata.hours,
        validity_mode: _a.limited
      }
      this.saveSettings(_a.expiry, data, (d) => {
        this.data.dmz_expiry = d.dmz_expiry;
        this.getPart('validfor-content').feed(require('./skeleton/valid-until').default(this, _a.view));
        return this.triggerHandlers({service: 'update-expiry-status', status: this.data.dmz_expiry});
      });
    }
  }

  /**
   * 
   */
  getNodeSettingsApi() {
    this.postService({
      service: SERVICE.hub.get_external_room_attr,
      hub_id: this.mget(_a.media).actualNode().hub_id
    }).then((data) => {
      this.data = data;
      this.formData = {
        email: data.members || [],
        password: data.password,
        hours: data.hours,
        days: data.days,
        privilege: data.permission
      }
      this.mset(_a.privilege, data.permission)
      this.feed(require('./skeleton').default(this));
    })
  }

  permissionCheck(check){
    let result = 0
    if (this.mget(_a.privilege) >= check) {
      result = 1
    }
    return result
  }

  /**
   * @param {*} cmd 
   */
  triggerChangePermission(cmd) {
    let val = cmd.mget('_value')
    let oldPrivilege = this.mget(_a.privilege);
    if (val > 1 && val === oldPrivilege) {
      let p = val >> 1
      this.mset(_a.privilege, p)
    } else {
      this.mset(_a.privilege, val)
    }
    return this.updatepermissionItem()
  }

  /**
   * 
   */
  updatepermissionItem() {
    this.getPart('permissions-setting').feed(require('./skeleton/permission').default(this, this.permissionMode));
  }

  /**
   * 
   * @param {expiry|permission|password} flag 
   * @param {object} data 
   * @param {function} callback 
   */
  saveSettings(flag, data = {}, callback = null) {
    const opt = {
      service: SERVICE.hub.update_external_settings,
      hub_id: this.mget(_a.media).mget('hub_id'),
      flag: flag,
      ...data
    };
    this.postService(opt).then((data) => {
      if (callback && _.isFunction(callback)) {
        callback(data);
      }
    })
  }


  /**
   * 
   */
  refreshNotificationList() {
    this.formData.email = this.formData.email.map((row)=>{
      if(row.uiHandler){delete row.uiHandler;}
      if(row.service){delete row.service;}
      if(row.mode){delete row.mode;}
      return row;
    })
    this.getPart('notification_list-wrapper').feed(require('./skeleton/notification-list').default(this))
  }

  /**
   * 
   */
  saveNotification() {
    let widgetEmail = this.getItemsByKind('widget_simple_invitation')[0]
    if(widgetEmail.submitEmail()){
      this.notificationMode = _a.readonly;
      let oldList = this.formData.email.map(row=>row.email);
      let newList = widgetEmail.getMembersList().map(row=>row.email);
      let dataOptions = {
        service : SERVICE.hub.update_external_members,
        email   : newList,
        hub_id  : this.mget(_a.media).mget('hub_id')
      }
      this.postService(dataOptions).then((res) => {
        let widgetEmail = this.getItemsByKind('widget_simple_invitation')[0];
        this.formData.email = widgetEmail.getMembersList();
        return this.refreshNotificationList();
      })
      return;
    }
  }

/**
 * 
 * @param {*} cmd 
 * @returns 
 */
  onDeleteUser(cmd){
    if(this.notificationMode == _a.edit){
      return;
    }
    let data = cmd.source;
    this.debug(data)
    let opt = {
      service : SERVICE.hub.delete_external_member,
      hub_id: this.mget(_a.media).mget('hub_id'),
      email: [data.email],
    }
    this.postService(opt).then((res) => {
      let widgetEmail = this.getItemsByKind('widget_simple_invitation')[0];
      this.formData.email = widgetEmail.getMembersList();
    })
  }

}


module.exports = ___widget_sharebox_setting
