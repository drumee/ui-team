const { folder, chatPanel } = require('../skeleton/toolkit');

const CHAT_BADGE = {
  badge_text: 'STEP 2/5',
  title: 'Chat lives in folder',
  desc: 'Chat lives here. Every folder has its own persistent context. Discuss files and tag teammates without leaving your workspace.',
};

class __tutorial_folder extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
  }

  async onDomRefresh() {
    if (this.mget(_a.service)) {
      this.feed(folder(this, chatPanel));
      const panel = await this.ensurePart('chat-panel');
      this.triggerHandlers({
        service: 'spotlight:focus',
        target: panel.el,
        tooltip: CHAT_BADGE,
        direction: 'east',
        owner: this,
      });
    } else {
      this.feed(folder(this));
    }
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

module.exports = __tutorial_folder;
