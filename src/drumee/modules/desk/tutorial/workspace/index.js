const BADGES = [
  {
    badge_text: 'STEP 1/5',
    title: 'This is Private',
    desc: 'You and only you can access its content. If you want to share, make a copy into the desired Worksapces',
  },
  {
    badge_text: 'STEP 1/5',
    title: 'This is Restricted Workspace',
    desc: 'Reserved only for explicitly designated people.',
  },
  {
    badge_text: 'STEP 1/5',
    title: 'This is Shared Worksapce',
    desc: 'Allowing anyone with the link to access it, allowing guests to view the folder structure and chat without logging in.',
  },
];

class __tutorial_workspace extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._stepIndex = 0;
  }

  onDomRefresh() {
    this.feed(require('./skeleton')(this));
    this._showBadge();
  }

  onPartReady(child, pn) {
    switch (pn) {
      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }

  async _showBadge() {
    const step = BADGES[this._stepIndex];
    if (!step) {
      this.warn(`Data not found for step ${this._stepIndex}`);
      return;
    }
    const card = await this.ensurePart(`workspace-item-${this._stepIndex}`);
    card.setState(1);
    card.triggerMethod('also:click'); // Propagate state to siblings
    this.triggerHandlers({
      service: 'spotlight:focus',
      target: card.el,
      tooltip: step,
      direction: 'north',
      owner: this,
    });
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.mget(_a.service);
    switch (service) {
      case 'next-step':
        const max = BADGES.length - 1;
        this._stepIndex = this._stepIndex + 1;
        if (this._stepIndex > max) {
          this._stepIndex = -1;
          return this.triggerHandlers();
        }
        this._showBadge();
        break;
      case 'skip-tour':
        this.triggerHandlers({ service: 'skip-tour' });
        break;
      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }
}

module.exports = __tutorial_workspace;
