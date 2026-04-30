const { tooltipBadge } = require('../skeleton/toolkit');

const BADGES = [
  {
    badge_text: 'STEP 2/5',
    title: 'Chat lives in folder',
    desc: `Chat lives here. Every folder has its own persistent context. Discuss files and tag teammates without leaving your workspace.`,
    direction: 'north',
  },
];

class __tutorial_folder extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._stepIndex = 0;
  }

  onDomRefresh() {
    this.feed(require('./skeleton')(this));
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
        break;
    }
  }
}

module.exports = __tutorial_folder;
