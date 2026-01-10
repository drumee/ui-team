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

      // case 'toggle-validity-mode':
      //   return this.toggleValidityMode(cmd);

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
    let args = {
      ...this.getData(),
      ...this.__permissionForm.gatherData()
    }
    args.permission = args.privilege;
    this.debug("AAA:102", args)
    // return;
    // this.formData.permission = _K.permission.download | _K.permission.anonymous
    // if (upload) {
    //   this.formData.permission = _K.permission.upload | this.formData.permission
    // }
    // this.formData.days = days;
    // this.formData.hours = hours;

    const opt = {
      service: SERVICE.hub.update_external_settings,
      hub_id: this.mget(_a.hub_id),
      ...args
    };
    const completed = () => {
      // this.pendingChanges = {};
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
   * Return relevant require by the widget permission
   */
  data() {
    let { hasPassword, passwordVisible, days, hours, permission } = this.model.toJSON()
    if (permission < _K.privilege.read) permission = _K.privilege.read
    let { password } = this.getData()
    return {
      days,
      hours,
      permission,
      privilege: permission,
      password,
      passwordVisible,
      hasPassword: hasPassword || (password ? 1 : 0)
    }
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
      this.debug('AAA:164', data)
      this.mset(data)
      this.feed(require('./skeleton').default(this, this.data(), _a.edit));
    }).catch((err) => {
      this.debug("Error fetching settings:", err);
      this.mset({ privilege: _K.privilege.read, days: 0, hours: 0 });
      this.feed(require('./skeleton').default(this));
    });
  }


  /**
   * Toggle password checkbox (only update pendingChanges, don't save)
   * @param {*} cmd 
   */
  togglePassword(cmd) {
    this.__passwordInputWrapper.setState(cmd.mget(_a.state))
  }

  /**
   * Toggle password visibility (Show/Hide) - only UI change, no save
   */
  togglePasswordVisibility(cmd) {
    const passwordInput = this.getPart('password-input');
    if (!cmd.mget(_a.state)) {
      passwordInput.mset({ type: _a.password })
      cmd.set({ content: "Show" })
    } else {
      passwordInput.mset({ type: _a.type })
      cmd.set({ content: "Hide" })
    }
    passwordInput.reload();
  }
}

module.exports = settings_share_hub;

