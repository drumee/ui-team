require("./skin");

class settings_hub_edit extends DrumeeMFS {
  /**
   * @param {object} opt
   */
  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    if (opt.media) {
      this.copyPropertiesFrom(opt.media);
    }
    this.permissionMode = _a.edit;
    this.validityMode = _a.view;
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
    const service = args.service || 
                    cmd.service || 
                    cmd.get(_a.service) || 
                    cmd.get(_a.name) ||
                    (cmd.mget && (cmd.mget(_a.service) || cmd.mget(_a.name))) ||
                    cmd.name;
    switch (service) {
      case _a.back:
      case _e.close:
        // Trigger event to parent (settings_hub) to go back
        if (this.mget(_a.media)) {
          this.triggerHandlers({
            service,
          });
          return;
        }
        return this.goodbye();

      case 'close-popup':
        if (this.source && this.source.dialogWrapper && typeof this.source.dialogWrapper.clear === "function") {
          this.source.dialogWrapper.clear();
        }
        return this.goodbye();

      case 'change-permission':
        return this.triggerChangePermission(cmd);

      case 'save-permission':
        return this.savePermission();

      case 'toggle-validity-mode': 
        return this.toggleValidityMode(cmd);

      case 'edit-validity':
        this.validityMode = _a.edit;
        return this.getPart('validity-content').feed(require('./skeleton/validity').default(this, _a.edit));

      case 'save-validity':
        return this.saveValidity();

      case 'toggle-password':
        return this.togglePassword(cmd);

      case 'toggle-password-visibility':
        return this.togglePasswordVisibility(cmd);

      case 'save-password':
        return this.savePassword();

      case 'change-access-type':
        return this.changeAccessType(cmd);

      case 'apply-all-save':
        return this.applyAllAndSave();

      default:
        this.source = cmd;
        this.service = service;
        this.triggerHandlers();
        this.service = '';
    }
  }

  /**
   * Apply all changes and save
   */
  applyAllAndSave() {
    // Save all settings
    this.savePermission();
    if (this.formData.hasPassword && this.formData.password) {
      this.savePassword();
    }
    if (this.formData.validity_mode === _a.limited) {
      this.saveValidity();
    }
    // Close popup after saving
    if (this.source && this.source.dialogWrapper && typeof this.source.dialogWrapper.clear === "function") {
      this.source.dialogWrapper.clear();
    }
    if (this.mget(_a.media)) {
      this.triggerHandlers({
        service,
      });
      return;
    }
    return this.goodbye();
  }

  /**
   * 
   */
  getNodeSettingsApi() {
    const hubId = this.mget(_a.hub_id);
    if (!hubId) {
      this.debug("No hub_id found");
      return;
    }

    this.fetchService({
      service: SERVICE.hub.get_external_room_attr,
      hub_id: hubId
    }).then((data) => {
      this.data = data || {};
      this.formData = {
        password: (data && data.password) ? data.password : '',
        hasPassword: (data && data.hasPaswword) ? data.hasPaswword : 0,
        hours: (data && data.hours) ? data.hours : '0',
        days: (data && data.days) ? data.days : '0',
        privilege: (data && data.permission) ? data.permission : _K.privilege.read,
        accessType: (data && data.access_type) ? data.access_type : 'private', // 'public' or 'private'
        validity_mode: (data && data.dmz_expiry === _a.infinity) ? _a.infinity : _a.limited
      };
      this.mset(_a.privilege, this.formData.privilege);
      this.feed(require('./skeleton').default(this));
    }).catch((err) => {
      this.debug("Error fetching settings:", err);
      // Fallback: use default values
      this.data = {};
      this.formData = {
        password: '',
        hasPassword: 0,
        hours: '0',
        days: '0',
        privilege: _K.privilege.read,
        accessType: 'private',
        validity_mode: _a.infinity
      };
      this.mset(_a.privilege, this.formData.privilege);
      this.feed(require('./skeleton').default(this));
    });
  }

  /**
   * 
   */
  permissionCheck(check) {
    let result = 0;
    if (this.mget(_a.privilege) >= check) {
      result = 1;
    }
    return result;
  }

  /**
   * @param {*} cmd 
   */
  triggerChangePermission(cmd) {
    let val = cmd.mget('_value');
    let oldPrivilege = this.mget(_a.privilege);
    if (val > 1 && val === oldPrivilege) {
      let p = val >> 1;
      this.mset(_a.privilege, p);
    } else {
      this.mset(_a.privilege, val);
    }
    return this.updatePermissionItem();
  }

  /**
   * 
   */
  updatePermissionItem() {
    this.getPart('permissions-content').feed(require('./skeleton/permission').default(this, this.permissionMode));
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
    return this.getPart('permissions-content').feed(require('./skeleton/permission').default(this, _a.view));
  }

  /**
   * @param {*} cmd 
   */
  toggleValidityMode(cmd) {
    const mode = cmd.mget(_a.value);
    this.debug('toggleValidityMode', mode, cmd, this);

    if (mode == _a.limited) {
      this.formData.validity_mode = _a.limited;
      this.validityMode = _a.edit;
      return this.getPart('validity-content').feed(require('./skeleton/validity').default(this, _a.edit, 'toggle-edit'));
    } else {
      this.formData.days = '0';
      this.formData.hours = '0';
      this.formData.validity_mode = _a.infinity;
      this.data = this.data || {};
      this.data.dmz_expiry = _a.infinity;
      let data = {
        days: '0',
        hours: '0',
        validity_mode: _a.infinity
      };
      this.saveSettings(_a.expiry, data, (d) => {
        this.data.dmz_expiry = d.dmz_expiry || _a.infinity;
        this.validityMode = _a.view;
        this.getPart('validity-content').feed(require('./skeleton/validity').default(this, _a.view));
        return this.triggerHandlers({ service: 'update-expiry-status', status: this.data.dmz_expiry });
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
      };
      this.saveSettings(_a.expiry, data, (d) => {
        this.data.dmz_expiry = d.dmz_expiry;
        this.validityMode = _a.view;
        this.getPart('validity-content').feed(require('./skeleton/validity').default(this, _a.view));
        return this.triggerHandlers({ service: 'update-expiry-status', status: this.data.dmz_expiry });
      });
    } else {
      this.validityMode = _a.view;
      this.getPart('validity-content').feed(require('./skeleton/validity').default(this, _a.view));
    }
  }

  /**
   * @param {*} cmd 
   */
  togglePassword(cmd) {
    // Toggle password checkbox state
    const currentState = this.formData.hasPassword || 0;
    const newState = currentState ? 0 : 1;
    this.formData.hasPassword = newState;
    
    if (!newState) {
      this.formData.password = '';
      this.formData.passwordVisible = 0;
      this.saveSettings(_a.password, { password: '' });
    }
    
    // Update UI to show/hide password input
    this.getPart('password-content').feed(require('./skeleton/password').default(this, _a.edit));
  }

  /**
   * Toggle password visibility (Show/Hide)
   */
  togglePasswordVisibility(cmd) {
    // Save current input value before re-rendering
    try {
      const passwordInput = this.getPart('password-input');
      if (passwordInput && passwordInput.getValue) {
        const currentValue = passwordInput.getValue();
        if (currentValue !== undefined && currentValue !== null) {
          this.formData.password = currentValue;
        }
      } else {
        // Fallback: try to get value from formData
        const formData = this.getData(_a.formItem);
        if (formData && formData.password !== undefined) {
          this.formData.password = formData.password;
        }
      }
    } catch (e) {
      // If getPart fails, try getData as fallback
      try {
        const formData = this.getData(_a.formItem);
        if (formData && formData.password !== undefined) {
          this.formData.password = formData.password;
        }
      } catch (e2) {
        this.debug('Error getting password value:', e2);
      }
    }
    
    // Toggle visibility state
    const currentVisibility = this.formData.passwordVisible || 0;
    this.formData.passwordVisible = currentVisibility ? 0 : 1;
    
    // Update UI to toggle password visibility (value is preserved in formData.password)
    this.getPart('password-content').feed(require('./skeleton/password').default(this, _a.edit));
  }

  /**
   * 
   */
  savePassword() {
    let data = this.getData(_a.formItem);
    this.formData.password = data.password || '';
    this.formData.hasPassword = 0;
    if (!_.isEmpty(data.password)) {
      this.formData.hasPassword = 1;
    }
    this.saveSettings(_a.password, { password: this.formData.password });
    return this.getPart('password-content').feed(require('./skeleton/password').default(this, _a.view));
  }

  /**
   * @param {*} cmd 
   */
  changeAccessType(cmd) {
    const accessType = cmd.mget(_a.value) || 
                       cmd.get(_a.value) || 
                       cmd.value || 
                       (cmd.el && cmd.el.dataset && cmd.el.dataset.value) ||
                       (cmd.model && cmd.model.get && cmd.model.get(_a.value)) ||
                       'private';
    this.debug('changeAccessType', accessType, cmd);
    this.formData.accessType = accessType;
    this.data = this.data || {};
    this.data.access_type = accessType;
    // Update UI immediately to show new label
    this.feed(require('./skeleton').default(this));
    // Save access type setting
    this.saveSettings('access_type', { access_type: accessType }, (responseData) => {
      // Update data after successful save
      if (responseData && responseData.access_type) {
        this.data.access_type = responseData.access_type;
        this.formData.accessType = responseData.access_type;
      }
      // Feed again to ensure UI is updated with latest data
      this.feed(require('./skeleton').default(this));
    });
    return false; // Prevent event bubbling to parent
  }

  /**
   * 
   * @param {expiry|permission|password|access_type} flag 
   * @param {object} data 
   * @param {function} callback 
   */
  saveSettings(flag, data = {}, callback = null) {
    const opt = {
      service: SERVICE.hub.update_external_settings,
      hub_id: this.mget(_a.hub_id),
      flag: flag,
      ...data
    };
    this.fetchService(opt).then((data) => {
      if (callback && _.isFunction(callback)) {
        callback(data);
      }
    });
  }
}

module.exports = settings_hub_edit;

