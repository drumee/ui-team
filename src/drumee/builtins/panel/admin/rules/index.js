/* ==================================================================== *
* Widget automatically generated on 2026-04-17T03:03:26.839Z
* npm run add-widget -- --fig=admin.rules --dest=src/drumee/builtins/panel/admin/rules
* ==================================================================== */

class __admin_rules extends LetcBox{

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
    this._settings = {
      creation_rule:    this.mget('creation_rule')    || 'hub-admin-only',
      collab_rule:      this.mget('collab_rule')      || 'anyone-in-hub',
      sender_rule:      this.mget('sender_rule')      || 'any-ws-member',
      require_approval: !!this.mget('require_approval'),
    };
  }

  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  onPartReady(child, pn) {
    switch (pn) {
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
      case 'set-creation-rule':
        this._settings.creation_rule = trigger.el.dataset.value;
        this.triggerHandlers({ service: 'rules-changed', settings: this._settings });
        break;
      case 'set-collab-rule':
        this._settings.collab_rule = trigger.el.dataset.value;
        this.triggerHandlers({ service: 'rules-changed', settings: this._settings });
        break;
      case 'set-sender-rule':
        this._settings.sender_rule = trigger.el.dataset.value;
        this.triggerHandlers({ service: 'rules-changed', settings: this._settings });
        break;
      case 'toggle-approval':
        this._settings.require_approval = !this._settings.require_approval;
        this.triggerHandlers({ service: 'rules-changed', settings: this._settings });
        break;
      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }

  getSettings() {
    return { ...this._settings };
  }
}

module.exports = __admin_rules