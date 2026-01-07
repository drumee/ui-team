require("./skin");

class settings_share_hub extends DrumeeMFS {
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

    // Initialize pending changes object to track all modifications
    this.pendingChanges = {};
    // Initialize initial data to compare changes
    this.initialData = {};
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
    const service = args.service || cmd.get(_a.service)
    this.debug('AAA:35 onUiEvent', service, cmd, args);
    switch (service) {
      case _e.close:
      case 'close-popup':
        if (this.mget(_a.media)) {
          this.triggerHandlers({
            service,
          });
          return;
        }
        return this.goodbye();
      case _a.back:
        // If back event comes from child widget (custom popup), render share-hub skeleton again
        // Otherwise, trigger handler to parent (hub)
        if (this._inCustomPopup) {
          // We're coming back from custom popup, render share-hub skeleton again
          this._inCustomPopup = false;
          this.feed(require('./skeleton').default(this));
          return;
        }
        // Otherwise, trigger handler to parent (hub)
        if (this.mget(_a.media)) {
          this.triggerHandlers({
            service,
          });
          return;
        }
        return this.goodbye();
      // case 'change-permission':
      //   return this.triggerChangePermission(cmd);

      case 'toggle-validity-mode':
        return this.toggleValidityMode(cmd);

      case 'toggle-password':
        return this.togglePassword(cmd);

      case 'toggle-password-visibility':
        return this.togglePasswordVisibility(cmd);

      // case 'change-access-type':
      //   return this.changeAccessType(cmd);

      case 'apply-all-save':
        return this.applyAllAndSave();

    }
  }

  /**
   * Apply all changes and save
   * Collects all pending changes and submits them
   */
  applyAllAndSave() {
    // Get current form values from inputs
    let formData = {};
    try {
      formData = this.getData(_a.formItem) || {};
    } catch (e) {
      this.debug('Error getting form data:', e);
    }
    let { upload, days, hours } = this.getData();

    this.formData.permission = _K.permission.download | _K.permission.anonymous
    if (upload) {
      this.formData.permission = _K.permission.upload | this.formData.permission
    }
    this.formData.days = days;
    this.formData.hours = hours;

    this.debug("AAA:97", upload, this.formData, this.getData())
    const opt = {
      service: SERVICE.hub.update_external_settings,
      hub_id: this.mget(_a.hub_id),
      ...this.formData
    };
    const completed = () => {
      this.pendingChanges = {};
      if (this.mget(_a.media)) {
        this.triggerHandlers({
          service: _a.back,
        });
      }

      // Always close popup even if there's an error
      return this.goodbye();
    }
    return this.postService(opt).then((responseData) => {
      this.debug("AAA:106", responseData)
      completed()
    }).catch((err) => {
      this.warn('Error saving settings:', err);
      completed()
    });;
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

      // Get access_type from multiple sources: API data, model (from media), or default
      const accessTypeFromApi = (data && data.access_type) ? data.access_type : null;
      const accessTypeFromModel = this.mget('access_type') || this.mget(_a.access_type);
      const areaFromModel = this.mget(_a.area); // 'public', 'private', 'share', 'dmz'

      // Map area to access_type if needed
      let mappedAccessType = null;
      if (areaFromModel === 'public' || areaFromModel === 'share' || areaFromModel === 'dmz') {
        mappedAccessType = 'public';
      } else if (areaFromModel === 'private') {
        mappedAccessType = 'private';
      }

      // Priority: API data > model access_type > mapped area > default
      const finalAccessType = accessTypeFromApi || accessTypeFromModel || mappedAccessType || 'private';

      this.debug('getNodeSettingsApi access_type resolution:', {
        api: accessTypeFromApi,
        model_access_type: accessTypeFromModel,
        area: areaFromModel,
        mapped: mappedAccessType,
        final: finalAccessType
      });

      const initialFormData = {
        password: (data && data.password) ? data.password : '',
        hasPassword: (data && data.hasPaswword) ? data.hasPaswword : 0,
        hours: (data && data.hours) ? data.hours : '0',
        days: (data && data.days) ? data.days : '0',
        privilege: (data && data.permission) ? data.permission : _K.privilege.read,
        accessType: finalAccessType, // Use resolved access type
        validity_mode: (data && data.dmz_expiry === _a.infinity) ? _a.infinity : _a.limited
      };

      // Store initial data for comparison
      this.initialData = {
        password: initialFormData.password,
        hasPassword: initialFormData.hasPassword,
        hours: initialFormData.hours,
        days: initialFormData.days,
        privilege: initialFormData.privilege,
        accessType: initialFormData.accessType,
        validity_mode: initialFormData.validity_mode
      };

      // Initialize formData and pendingChanges with initial values
      this.formData = { ...initialFormData };
      this.pendingChanges = {};

      // Set validityMode to edit if validity_mode is limited, so inputs are shown
      this.validityMode = (this.formData.validity_mode === _a.limited) ? _a.edit : _a.view;
      this.mset(_a.privilege, this.formData.privilege);
      this.feed(require('./skeleton').default(this));
    }).catch((err) => {
      this.debug("Error fetching settings:", err);
      // Fallback: use default values
      this.data = {};
      const defaultFormData = {
        password: '',
        hasPassword: 0,
        hours: '0',
        days: '0',
        privilege: _K.privilege.read,
        accessType: 'private',
        validity_mode: _a.infinity
      };

      // Store initial data
      this.initialData = { ...defaultFormData };
      this.formData = { ...defaultFormData };
      this.pendingChanges = {};

      this.mset(_a.privilege, this.formData.privilege);
      this.feed(require('./skeleton').default(this));
    });
  }

  /**
   * Check if a specific permission bit is set
   * @param {number} permissionBit - The permission bit to check (e.g., _K.permission.upload)
   * @returns {number} 1 if permission is set, 0 otherwise
   */
  permissionCheck(permissionBit) {
    const privilege = this.mget(_a.privilege) || 0;
    // Use bitwise AND to check if the specific permission bit is set
    return (privilege & permissionBit) ? 1 : 0;
  }

  /**
   * Toggle a specific permission bit (only update pendingChanges, don't save)
   * @param {*} cmd 
   */
  // triggerChangePermission(cmd) {
  //   const permissionBit = cmd.mget('permission');
  //   this.debug('AAA:178 triggerChangePermission', permissionBit, cmd, this);
  //   const oldPrivilege = this.mget(_a.privilege) || 0;

  //   // Toggle the specific permission bit using XOR
  //   // If bit is set, unset it; if not set, set it
  //   const newPrivilege = oldPrivilege ^ permissionBit;

  //   // Update privilege in model and formData
  //   this.mset(_a.privilege, newPrivilege);
  //   this.formData.privilege = newPrivilege;

  //   // Store in pendingChanges for later save
  //   this.pendingChanges.permission = newPrivilege;

  //   this.debug('AAA:188 privilege changed', oldPrivilege, '->', newPrivilege, 'bit:', permissionBit);
  //   // this.mset({ permission: newPrivilege })
  //   // this.debug("AAA:234", this.getData())
  //   // Update UI to reflect checkbox state change
  //   // this.updatePermissionItem();
  // }

  /**
   * 
   */
  updatePermissionItem() {
    const part = this.getPart('permissions-content');
    if (part && part.softClear) {
      part.softClear();
    }
    part.feed(require('./skeleton/permission').default(this, this.permissionMode));
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
   * Toggle validity mode (only update pendingChanges, don't save)
   * @param {*} cmd 
   */
  toggleValidityMode(cmd) {
    const mode = cmd.mget('expiry') || cmd.mget(_a.value);
    this.debug('toggleValidityMode', mode, cmd, this);

    // Update formData immediately
    this.formData.validity_mode = mode;

    // Store in pendingChanges
    this.pendingChanges.validity_mode = mode;

    if (mode == _a.limited) {
      this.validityMode = _a.edit;
      // Keep current days/hours values in pendingChanges if they exist
      if (!this.pendingChanges.days) {
        this.pendingChanges.days = this.formData.days || '0';
      }
      if (!this.pendingChanges.hours) {
        this.pendingChanges.hours = this.formData.hours || '0';
      }
    } else {
      // When switching to unlimited, reset days/hours in pendingChanges
      this.formData.days = '0';
      this.formData.hours = '0';
      this.pendingChanges.days = '0';
      this.pendingChanges.hours = '0';
      this.validityMode = _a.edit; // Keep in edit mode to allow switching back
    }

    // Re-render immediately to show the change
    const part = this.getPart('validity-content');
    if (part && part.softClear) {
      part.softClear();
    }
    part.feed(require('./skeleton/validity').default(this, this.validityMode));
  }

  /**
   * 
   */
  // saveValidity() {
  //   let fdata = this.getData(_a.formItem);
  //   if (this.formData.hours != fdata.hours || this.formData.days != fdata.days) {
  //     this.formData.days = fdata.days;
  //     this.formData.hours = fdata.hours;
  //     this.formData.validity_mode = _a.limited;
  //     let data = {
  //       days: fdata.days,
  //       hours: fdata.hours,
  //       validity_mode: _a.limited
  //     };
  //     this.saveSettings(_a.expiry, data, (d) => {
  //       this.data.dmz_expiry = d.dmz_expiry;
  //       this.validityMode = _a.view;
  //       this.getPart('validity-content').feed(require('./skeleton/validity').default(this, _a.view));
  //       return this.triggerHandlers({ service: 'update-expiry-status', status: this.data.dmz_expiry });
  //     });
  //   } else {
  //     this.validityMode = _a.view;
  //     this.getPart('validity-content').feed(require('./skeleton/validity').default(this, _a.view));
  //   }
  // }

  /**
   * Toggle password checkbox (only update pendingChanges, don't save)
   * @param {*} cmd 
   */
  togglePassword(cmd) {
    // Toggle password checkbox state
    const currentState = this.formData.hasPassword || 0;
    const newState = currentState ? 0 : 1;
    this.formData.hasPassword = newState;

    // Store in pendingChanges
    this.pendingChanges.hasPassword = newState;

    if (!newState) {
      this.formData.password = '';
      this.formData.passwordVisible = 0;
      this.pendingChanges.password = '';
    } else {
      // If enabling password, keep current password value if exists
      if (this.formData.password) {
        this.pendingChanges.password = this.formData.password;
      }
    }

    // Update UI to show/hide password input
    this.getPart('password-content').feed(require('./skeleton/password').default(this, _a.edit));
  }

  /**
   * Toggle password visibility (Show/Hide) - only UI change, no save
   */
  togglePasswordVisibility(cmd) {
    // Save current input value before re-rendering
    try {
      const passwordInput = this.getPart('password-input');
      if (passwordInput && passwordInput.getValue) {
        const currentValue = passwordInput.getValue();
        if (currentValue !== undefined && currentValue !== null) {
          this.formData.password = currentValue;
          // Update pendingChanges with current password value
          this.pendingChanges.password = currentValue;
        }
      } else {
        // Fallback: try to get value from formData
        const formData = this.getData(_a.formItem);
        if (formData && formData.password !== undefined) {
          this.formData.password = formData.password;
          this.pendingChanges.password = formData.password;
        }
      }
    } catch (e) {
      // If getPart fails, try getData as fallback
      try {
        const formData = this.getData(_a.formItem);
        if (formData && formData.password !== undefined) {
          this.formData.password = formData.password;
          this.pendingChanges.password = formData.password;
        }
      } catch (e2) {
        this.debug('Error getting password value:', e2);
      }
    }

    // Toggle visibility state (UI only, no save)
    const currentVisibility = this.formData.passwordVisible || 0;
    this.formData.passwordVisible = currentVisibility ? 0 : 1;

    // Update UI to toggle password visibility (value is preserved in formData.password)
    this.getPart('password-content').feed(require('./skeleton/password').default(this, _a.edit));
  }

  /**
   * 
   */
  // savePassword() {
  //   let data = this.getData(_a.formItem);
  //   this.formData.password = data.password || '';
  //   this.formData.hasPassword = 0;
  //   if (!_.isEmpty(data.password)) {
  //     this.formData.hasPassword = 1;
  //   }
  //   this.saveSettings(_a.password, { password: this.formData.password });
  //   return this.getPart('password-content').feed(require('./skeleton/password').default(this, _a.view));
  // }

  /**
   * Change access type (only update pendingChanges, don't save)
   * If "custom" is selected, open custom popup
   * @param {*} cmd 
   */
  // changeAccessType(cmd) {
  //   // Try multiple ways to get the value
  //   const accessType = cmd.mget('_value') ||
  //     cmd.mget(_a.value) ||
  //     cmd.get('_value') ||
  //     cmd.get(_a.value) ||
  //     cmd.value ||
  //     (cmd.el && cmd.el.dataset && cmd.el.dataset.value) ||
  //     (cmd.model && cmd.model.get && (cmd.model.get('_value') || cmd.model.get(_a.value))) ||
  //     'private';
  //   this.debug('changeAccessType', accessType, cmd, {
  //     mget_value: cmd.mget && cmd.mget(_a.value),
  //     mget__value: cmd.mget && cmd.mget('_value'),
  //     get_value: cmd.get && cmd.get(_a.value),
  //     get__value: cmd.get && cmd.get('_value'),
  //     cmd_value: cmd.value,
  //     dataset_value: cmd.el && cmd.el.dataset && cmd.el.dataset.value
  //   });

  //   // If "custom" is selected, open custom popup instead of updating access type
  //   if (accessType === 'custom') {
  //     return this.openCustomPopup();
  //   }

  //   // Update formData immediately
  //   this.formData.accessType = accessType;

  //   // Store in pendingChanges
  //   this.pendingChanges.accessType = accessType;

  //   // Update data object as well for immediate UI update
  //   if (!this.data) {
  //     this.data = {};
  //   }
  //   this.data.access_type = accessType;

  //   // Re-render the who-can-access section to update dropdown trigger label
  //   // Find the content part first
  //   const contentPart = this.getPart(`${this.fig.family}__content`);
  //   if (contentPart && contentPart.children && contentPart.children.length > 0) {
  //     // The who-can-access section is the first child (before first divider)
  //     const whoCanAccessPart = contentPart.children.at(0);
  //     if (whoCanAccessPart && whoCanAccessPart.feed) {
  //       whoCanAccessPart.softClear();
  //       whoCanAccessPart.feed(require('./skeleton/who-can-access').default(this));
  //     } else {
  //       // Fallback: re-render entire skeleton
  //       this.feed(require('./skeleton').default(this));
  //     }
  //   } else {
  //     // Fallback: re-render entire skeleton
  //     this.feed(require('./skeleton').default(this));
  //   }

  //   return false; // Prevent event bubbling to parent
  // }

  /**
   * Open custom access popup (child popup of share-hub)
   */
  // openCustomPopup() {
  //   // Set flag to indicate we're in custom popup
  //   this._inCustomPopup = true;
  //   // Feed custom widget as child popup, similar to how hub opens share-hub
  //   this.feed({
  //     kind: "settings_share_hub_custom",
  //     uiHandler: [this],
  //     media: this.mget(_a.media),
  //     hub_id: this.mget(_a.hub_id),
  //   });
  //   return false;
  // }

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
    return this.fetchService(opt).then((responseData) => {
      if (callback && _.isFunction(callback)) {
        callback(responseData);
      }
      return responseData;
    });
  }
}

module.exports = settings_share_hub;

