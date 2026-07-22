const BADGE = {
  badge_text: 'STEP 4/5',
  title: 'Meeting in folder',
  desc: `Every folder has its own meeting space. Start a call directly from the folder you're working in, your files and conversations stay in the same place.`,
};

class __tutorial_meeting extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
  }

  async onDomRefresh() {
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
      case 'back-step':
        return this.triggerHandlers({ service: 'back-step' });
    }
  }
}

module.exports = __tutorial_meeting;
