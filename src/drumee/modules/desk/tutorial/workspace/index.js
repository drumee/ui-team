const { stepBadge, isLastScreen, entryScreen } = require('../tours');

const BADGES = [
  {
    title: 'This is your Personal Workspace',
    desc: 'Only you can access this workspace. If you want to share, make a copy into the desired workspace.',
  },
  {
    title: 'This is an Internal Workspace',
    desc: 'Restricted to only your internal team.',
  },
  {
    title: 'This is an External Workspace',
    desc: 'Open to share externally with your clients — anyone with the link can view the folder structure and chat without logging in.',
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
    // When re-entered via Back from step 2, resume on the last sub-badge.
    this._stepIndex = entryScreen(this, BADGES.length);
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
      tooltip: {
        ...step,
        // The last of the six steps to lose its hardcoded badge. These three
        // sub-badges read "STEP 1/3 … 3/3" as the post-signup `workspace` tour
        // and "STEP 1/6" throughout as step one of the full tour.
        badge_text: stepBadge(this, this._stepIndex),
        // Was unconditional: badge 0 had nothing before it because this step
        // was always first. It still is in both tours, but the rule now comes
        // from the tour rather than from that assumption.
        hide_back: !!this.mget('is_first') && this._stepIndex === 0,
        done: isLastScreen(this, this._stepIndex, BADGES.length),
      },
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
      case 'back-step':
        // Walk back through the workspace sub-badges. Badge 0 hides Back, so
        // this only fires on badges 1+; guard anyway.
        if (this._stepIndex <= 0) return;
        this._stepIndex = this._stepIndex - 1;
        this._showBadge();
        break;
      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }
}

module.exports = __tutorial_workspace;
