const BADGE = {
  badge_text: 'STEP 3/6',
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
      tooltip: { ...BADGE, variant: 'figma' },
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
