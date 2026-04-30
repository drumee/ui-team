require('./skin');

class tutorial_main extends LetcBox {

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
  }

  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.mget(_a.service);
    this.debug("NEXT", service)
    switch (service) {
      case 'next-step':
        break;
      case 'skip-tour':
        this.ensurePart('overlay').then((overlay) => overlay.feed(null));
        break;
      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }
}

module.exports = tutorial_main;
