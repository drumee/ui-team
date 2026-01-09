require("./skin");
const { validity } = require("../hub/skeleton/toolkit")
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
    }).then((data = {}) => {
      this.data = data;

      // Get access_type from multiple sources: API data, model (from media), or default
      const accessTypeFromApi = (data.access_type) ? data.access_type : null;
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

      const initialFormData = {
        password: (data.password) ? data.password : '',
        hasPassword: (data.hasPaswword) ? data.hasPaswword : 0,
        hours: (data.hours) ? data.hours : '0',
        days: (data.days) ? data.days : '0',
        privilege: (data.permission) ? data.permission : _K.privilege.read,
        accessType: finalAccessType, // Use resolved access type
        validity_mode: (data.dmz_expiry === _a.infinity) ? _a.infinity : _a.limited
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
   * Toggle validity mode (only update pendingChanges, don't save)
   * @param {*} cmd 
   */
  toggleValidityMode(cmd) {
    const mode = cmd.mget('expiry') || cmd.mget(_a.value);
    this.debug('toggleValidityMode', mode, cmd, this);

    // Update formData immediately
    let formData = { ...this.formData }
    if (cmd.mget('expiry') == _a.infinity) {
      formData = {
        days: 0,
        hours: 0
      }
    } else if (!formData.expiry) {
      formData = {
        days: 0,
        hours: 1
      }
    }
    this.pendingChanges = this.__validityContent.getData();
    this.debug('toggleValidityMode', this.pendingChanges, formData, cmd.mget('expiry'), cmd, this);
    // Re-render immediately to show the change
    const part = this.getPart('validity-content');
    if (part && part.softClear) {
      part.softClear();
    }
    part.feed(validity(this, formData));
  }


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
}

module.exports = settings_share_hub;

