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

      case 'toggle-password':
        return this.togglePassword(cmd);

      case 'toggle-password-visibility':
        return this.togglePasswordVisibility(cmd);


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
    this.__passwordInputWrapper.el.dataset.status = ""
    if (args.passwordSet && !args.password && !this.mget('hasPassword')) {
      this.__passwordInputWrapper.el.dataset.status = _a.error
      return
    }
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
    let modelData = this.model.toJSON();
    // Handle API typo: hasPaswword (2 w's) -> hasPassword (1 w)
    let hasPassword = modelData.hasPassword;
    if (hasPassword === undefined && modelData.hasPaswword !== undefined) {
      hasPassword = modelData.hasPaswword;
    }
    let { passwordVisible, days, hours, permission, password: apiPassword } = modelData;
    if (permission < _K.privilege.read) permission = _K.privilege.read
    // Get password from form input first, fallback to API response if available
    let formPassword = this.getData().password;
    let password = formPassword || apiPassword || '';
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
      return;
    }
    this.fetchService({
      service: SERVICE.hub.get_external_room_attr,
      hub_id: hubId
    }).then((data = {}) => {
      // Handle API typo: hasPaswword (2 w's) -> hasPassword (1 w)
      if (data.hasPaswword !== undefined) {
        data.hasPassword = data.hasPaswword;
      }
      this.mset(data)
      this.feed(require('./skeleton').default(this, this.data(), _a.edit));
    }).catch((err) => {
      this.mset({ privilege: _K.privilege.read, days: 0, hours: 0 });
      this.feed(require('./skeleton').default(this));
    });
  }


  /**
   * Toggle password checkbox (only update pendingChanges, don't save)
   * @param {*} cmd 
   */
  togglePassword(cmd) {
    // Get new state from cmd, or toggle from current state
    let newState = cmd.mget(_a.state);
    if (newState === undefined || newState === null) {
      // If cmd doesn't have state, toggle from current wrapper state
      const currentState = this.__passwordInputWrapper?.getState() || 0;
      newState = 1 ^ currentState; // Toggle: 0 -> 1, 1 -> 0
    }
    
    // Find checkbox element and update its state
    const passwordContent = this.getPart('password-content');
    if (passwordContent && passwordContent.el) {
      const checkboxEl = passwordContent.el.querySelector(`.${this.fig.family}-password__checkbox`);
      if (checkboxEl) {
        // Update checkbox element state
        checkboxEl.setAttribute(_a.data.state, newState);
        
        // Find checkbox component and update its state
        const findCheckboxComponent = (parent) => {
          if (!parent || !parent.children) return null;
          for (let child of parent.children.toArray()) {
            if (child.el === checkboxEl) {
              return child;
            }
            const found = findCheckboxComponent(child);
            if (found) return found;
          }
          return null;
        };
        
        const checkboxComponent = findCheckboxComponent(passwordContent);
        if (checkboxComponent && typeof checkboxComponent.setState === 'function') {
          checkboxComponent.setState(newState);
        } else if (checkboxComponent && checkboxComponent.model) {
          checkboxComponent.model.set(_a.state, newState);
        }
      }
    }
    
    // Update password input wrapper state
    if (this.__passwordInputWrapper) {
      this.__passwordInputWrapper.setState(newState);
    }
  }

  /**
   * Toggle password visibility (Show/Hide) - only UI change, no save
   */
  togglePasswordVisibility(cmd) {
    const passwordInput = this.getPart('password-input');
    if (!cmd.mget(_a.state)) {
      passwordInput.mset({ type: _a.password })
      cmd.set({ content: LOCALE.SHOW })
    } else {
      passwordInput.mset({ type: _a.type })
      cmd.set({ content: LOCALE.HIDE })
    }
    passwordInput.reload();
  }
}

module.exports = settings_share_hub;

