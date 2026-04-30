const { tooltipBadge } = require('../skeleton/toolkit');

const BADGES = [
  {
    badge_text: 'STEP 1/5',
    title: 'This is Private',
    desc: 'Only you and specified collaborators can see its contents on the desk.',
  },
  {
    badge_text: 'STEP 1/5',
    title: 'This is Restricted share',
    desc: 'Reserved only for specifically designated people.',
  },
  {
    badge_text: 'STEP 1/5',
    title: 'This is Link share',
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
    const overlay = await this.ensurePart('overlay');
    const card = await this.ensurePart(`workspace-item-${this._stepIndex}`);
    const overlayOffset = overlay.$el.offset();
    const { left, top } = card.$el.offset();
    const data = {
      ...step,
      style: {
        left: left + card.$el.width() / 2 - overlayOffset.left,
        top: top + card.$el.height() + 20 - overlayOffset.top,
      },
    };
    card.setState(1);
    card.triggerMethod("also:click") // Propagate state to the others
    overlay.feed(tooltipBadge(this, data));
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.mget(_a.service);
    switch (service) {
      case 'next-step':
        const max = BADGES.length - 1;
        this._stepIndex = this._stepIndex + 1;
        if (this._stepIndex > max) {
          this._stepIndex = -1;
          return this.triggerHandlers()
        }
        this._showBadge();
        break;
      case 'skip-tour':
        this.ensurePart('overlay').then((overlay) => overlay.feed(null));
        break;
      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }
}

module.exports = __tutorial_workspace;
