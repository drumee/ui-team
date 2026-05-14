class __admin_roles extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._settings = {
      creation_rule:    this.mget('creation_rule')    || 'hub-admin-only',
      collab_rule:      this.mget('collab_rule')      || 'anyone-in-hub',
      sender_rule:      this.mget('sender_rule')      || 'any-ws-member',
      require_approval: !!this.mget('require_approval'),
    };
  }

  async onDomRefresh() {
    await this._loadStats();
    this.feed(require('./skeleton')(this));
  }

  async _loadStats() {
    try {
      const data = await this.fetchService(SERVICE.admin.get_roles_stats, {});
      this.mset('compliance_score',  data.compliance_score);
      this.mset('pending_requests',  data.pending_requests);
      this.mset('last_audit',        data.last_audit);
      this.mset('require_approval',  data.require_approval);
      this.mset('creation_rule',     data.creation_rule);
      this.mset('collab_rule',       data.collab_rule);
      this.mset('sender_rule',       data.sender_rule);
    } catch (e) {
    }
  }

  getPendingRequests() {
    return this.fetchService(SERVICE.admin.get_pending_requests, {});
  }

  onPartReady(child, pn) {
    switch (pn) {
      case 'pending-list':
        this._pendingList = child;
        break;
      case 'approval-toggle':
        this._approvalToggle = child;
        break;
      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.get(_a.service);
    switch (service) {
      case 'save-changes':
        this._saveSettings();
        break;
      case 'set-creation-rule':
        this._settings.creation_rule = trigger.el.dataset.value;
        break;
      case 'set-collab-rule':
        this._settings.collab_rule = trigger.el.dataset.value;
        break;
      case 'set-sender-rule':
        this._settings.sender_rule = trigger.el.dataset.value;
        break;
      case 'toggle-approval':
        this._settings.require_approval = !this._settings.require_approval;
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
      await this.postService(SERVICE.admin.save_roles_settings, this._settings);
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

module.exports = __admin_roles;
