require('./skin');

const badge = require('./skeleton/badge');

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

class desk_tutorial extends LetcBox {

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    this._anchorTop = 0;
    this._anchorLeft = 0;
    this._stepIndex = 0;
  }

  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
    this._showBadge();
  }


  /**
   * 
   * @returns 
   */
  async _showBadge() {
    const data = BADGES[this._stepIndex];
    if (!data) {
      this.warn(`Data not found for step ${this._stepIndex}`)
      return;
    }
    const overlay = await this.ensurePart('overlay');
    const card = await this.ensurePart(`workspace-card-${this._stepIndex}`);
    const workspace = await this.ensurePart(`workspace-container`);
    let { left, top } = card.$el.offset()
    data.style = {
      left: left + card.$el.width() / 2,
      top: top + card.$el.height() + 20
    }
    overlay.feed(badge(this, data));
    // overlay.el.style.top = `${top}px`
    // overlay.el.style.left = `${left}px`
    const tooltip = await this.ensurePart('badge-tooltip');
    this.debug("AAA:62", data.style, workspace.$el.offset(), tooltip, card)
  }

  /**
   * 
   * @param {*} trigger 
   * @param {*} args 
   */
  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.mget(_a.service);
    switch (service) {
      case 'next-step':
        this._stepIndex = Math.min(this._stepIndex + 1, BADGES.length - 1);
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

module.exports = desk_tutorial;
