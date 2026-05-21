const BADGE = {
  badge_text: 'STEP 3/5',
  title: 'Set who sees what',
  desc: 'Precision control at your fingertips. Choose between private, restricted, or open collaboration for every folder you curate.',
};

class __tutorial_settings extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
  }

  onDomRefresh() {
    this.feed(require('./skeleton')(this));
    this.triggerHandlers({
      service: 'spotlight:focus',
      target: this.el,
      tooltip: BADGE,
      direction: 'east',
      owner: this,
    });
  }

  onPartReady(child, pn) {
    switch (pn) {
      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.mget(_a.service);
    switch (service) {
      case 'next-step':
        return this.triggerHandlers();
      case 'skip-tour':
        return this.triggerHandlers({ service: 'skip-tour' });
    }
  }
}

module.exports = __tutorial_settings;
