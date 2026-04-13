class __activity_item extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
  }

  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    this.triggerHandlers({ service });
  }
}

module.exports = __activity_item;
