class __admin_security_workspace extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
  }

  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.get(_a.service);
    switch (service) {
      case 'edit-workspace-security':
        this.triggerHandlers({ service: 'edit-workspace-security', data: this.getAttr() });
        break;
      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }
}

module.exports = __admin_security_workspace;
