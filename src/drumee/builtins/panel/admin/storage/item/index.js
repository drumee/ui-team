class __admin_storage_file extends LetcBox {

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
        this.triggerHandlers({ service: 'file-selection-changed', item: this });
        break;
      case 'file-options':
        this.triggerHandlers({ service: 'file-options', data: this.getAttr() });
        break;
      case 'delete-file':
        this.triggerHandlers({ service: 'delete-file', data: this.getAttr() });
        break;
      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }
}

module.exports = __admin_storage_file;
