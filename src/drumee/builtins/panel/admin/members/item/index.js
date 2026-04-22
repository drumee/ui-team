class __admin_members_item extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
  }

  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  onPartReady(child, pn) {
    switch (pn) {
      case 'checkbox':
        this._checkbox = child;
        break;
      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.get(_a.service);
    switch (service) {
      case 'toggle-select':
        this.mset('selected', !this.mget('selected'));
        this.triggerHandlers({ service: 'member-selection-changed', item: this });
        break;
      case 'edit-member':
        this.triggerHandlers({ service: 'edit-member', data: this.getAttr() });
        break;
      case 'delete-member':
        this.triggerHandlers({ service: 'delete-member', data: this.getAttr() });
        break;
      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }
}

module.exports = __admin_members_item;
