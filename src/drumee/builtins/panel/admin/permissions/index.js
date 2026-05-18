/* ==================================================================== *
* Widget automatically generated on 2026-04-17T03:11:41.828Z
* npm run add-widget -- --fig=admin.permissions --dest=src/drumee/builtins/panel/admin/permissions
* ==================================================================== */

class __admin_permissions extends LetcBox{

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
    this._settings = {};
  }

  async onDomRefresh() {
    await this._loadData();
    this.feed(require('./skeleton')(this));
  }

  async _loadData() {
    try {
      const data = await this.fetchService(SERVICE.admin.get_permissions, {});
      this.mset('compliance_score',  data.compliance_score);
      this.mset('pending_requests',  data.pending_requests);
      this.mset('last_audit',        data.last_audit);
      this.mset('creation_rule',     data.creation_rule);
      this.mset('collab_rule',       data.collab_rule);
      this.mset('sender_rule',       data.sender_rule);
      this.mset('require_approval',  data.require_approval);
      this._settings = {
        creation_rule:    data.creation_rule,
        collab_rule:      data.collab_rule,
        sender_rule:      data.sender_rule,
        require_approval: data.require_approval,
      };
    } catch (e) {
    }
  }

  getPendingRequests() {
    return this.fetchService(SERVICE.admin.get_pending_requests, {});
  }

  onPartReady(child, pn) {
    switch (pn) {
      case 'rules':
        this._rules = child;
        break;
      case 'pending-list':
        this._pendingList = child;
        break;
      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.get(_a.service);
    switch (service) {
      case 'rules-changed':
        this._settings = { ...this._settings, ...args.settings };
        break;
      case 'save-changes':
        this._saveSettings();
        break;
      case 'approve-request':
        this._handleRequest('approve', args.data);
        break;
      case 'reject-request':
        this._handleRequest('reject', args.data);
        break;
      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }

  async _saveSettings() {
    try {
      await this.postService(SERVICE.admin.save_permissions, this._settings);
    } catch (e) {
    }
  }

  async _handleRequest(action, data) {
    try {
      await this.postService(SERVICE.admin.handle_workspace_request, { action, ...data });
      if (this._pendingList) this._pendingList.reload();
    } catch (e) {
    }
  }
}

module.exports = __admin_permissions