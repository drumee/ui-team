/* ==================================================================== *
* Widget automatically generated on 2026-04-17T03:26:09.141Z
* npm run add-widget -- --fig=admin.security --dest=src/drumee/builtins/panel/admin/security
* ==================================================================== */

class __admin_security extends LetcBox{

  //constructor(...args) {
  //  super(...args);
  //}


  /**
   * 
   */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
  }

  async onDomRefresh() {
    await this._loadSettings();
    this.feed(require('./skeleton')(this));
  }

  async _loadSettings() {
    try {
      const data = await this.fetchService(SERVICE.admin.get_security_settings, {});
      Object.entries(data).forEach(([k, v]) => this.mset(k, v));
    } catch (e) {
    }
  }

  getWorkspaces() {
    return this.fetchService(SERVICE.admin.get_workspace_security, {});
  }

  onPartReady(child, pn) {
    switch (pn) {
      case 'ws-grid':
        this._wsGrid = child;
        break;
      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.get(_a.service);
    switch (service) {
      case 'toggle-tfa':
        this._toggleSetting(trigger, 'save-tfa-settings');
        break;
      case 'toggle-sso':
        this._toggleSetting(trigger, 'save-sso-settings');
        break;
      case 'edit-workspace-security':
        this.triggerHandlers({ service: 'edit-workspace-security', data: args.data });
        break;
      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }

  async _toggleSetting(trigger, saveService) {
    const key   = trigger.el.dataset.key;
    const state = !this.mget(key);
    this.mset(key, state);
    try {
      await this.postService(SERVICE.admin[saveService] || saveService, { key, value: state });
    } catch (e) {
      this.mset(key, !state);
    }
  }
}

module.exports = __admin_security