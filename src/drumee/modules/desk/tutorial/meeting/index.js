const { stepBadge, isLastScreen } = require('../tours');

const BADGE = {
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
    // The design lands the connector on the left edge of the top-right tile,
    // which is what anchorFor('east') produces for that tile — the card comes
    // out at x 230..550 against the design's 228..548.
    const tile = await this.ensurePart('meeting-tile');
    this.triggerHandlers({
      service: 'spotlight:focus',
      target: tile.el,
      // The last hardcoded badge to go. meeting is a single-screen step, so
      // both modes give the same shape: "STEP 3/6" as step three of the full
      // tour (its only route — D7), and "STEP 1/1" if it were ever run alone,
      // which is honest for one screen.
      tooltip: {
        ...BADGE,
        badge_text: stepBadge(this, 0),
        hide_back: !!this.mget('is_first'),
        variant: 'figma',
        done: isLastScreen(this, 0, 1),
      },
      direction: 'east',
      // The design lights the whole room, not just the tile: its vignette is
      // an ellipse whose clear zone (610x836) is taller than the room itself.
      // Our hole is circular and clear to 55% of the radius, so ~600 puts the
      // room's full height inside it and leaves the fade at the edges.
      radius: 600,
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
