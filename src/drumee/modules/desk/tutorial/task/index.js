const { screen } = require('./skeleton');

const BADGE = {
  badge_text: 'STEP 4/4',
  title: 'Project tracker in folder',
  desc: `Track tasks, deadlines, and progress without leaving your folder. Every folder has its own project tracker so your team stays aligned on what's happening inside.`,
};

/**
 * Step 4 walks the five tracker views behind ONE parent step, the same way
 * tutorial_workspace runs its sub-badges and tutorial_folder its three screens:
 * navigation stays inside this widget until the last view, and only then does
 * it hand back to tutorial_main. The badge reads STEP 4/4 throughout.
 *
 * The copy is identical on all five screens because the design repeats one
 * callout across all five frames (Figma 5:75112, 3202:123320, 3202:185373,
 * 3202:185461, 3202:185481).
 *
 * Each entry owns the view it renders, the part the spotlight points at, and
 * the direction the connector leaves the card — `west` throughout, as the
 * design puts the card to the RIGHT of what it marks.
 */
const SCREENS = [
  // The card the design's connector lands on, inside the In Progress column.
  // The hole is widened past that card's own rect: the design's vignette
  // clears an ellipse of roughly 650x370, so the board around the card reads
  // as lit rather than just the one card.
  { view: 'board', target: 'board-card', direction: 'west', radius: 520 },
  // The busiest day of the week strip. Same vignette as the board frame
  // (clear ellipse ~650x370), so the hole is widened past the column's own
  // rect and the surrounding week reads as lit.
  { view: 'calendar', target: 'cal-day', direction: 'west', radius: 520 },
  // The selected row's bar. Its own rect is a thin ribbon, so the hole is sized
  // explicitly to take in the surrounding timeline.
  { view: 'gantt', target: 'gantt-bar', direction: 'west', radius: 420 },
  // The status cell of the highlighted row. The table is full-width, so the
  // badge anchors there and the hole is sized to take in the rows around it.
  { view: 'list', target: 'list-focus', direction: 'west', radius: 420 },
  // Status overview: the donut and its legend.
  { view: 'health', target: 'health-status', direction: 'west' },
];

class __tutorial_task extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._screenIndex = 0;
  }

  async onDomRefresh() {
    // Re-entered via Back from a later step: resume where we left off. No step
    // follows Step 4 today, so nothing exercises this in the shipped tour — it
    // is here so appending a step cannot regress the behaviour.
    if (this.mget('enter_at_last')) this._screenIndex = SCREENS.length - 1;
    this._showScreen();
  }

  onPartReady(child, pn) {
    switch (pn) {
      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }

  /**
   * Render the current view and move the spotlight onto its target.
   *
   * The part is awaited rather than read straight after `feed`, because the
   * body is rebuilt on every view change and only answers once the new DOM has
   * landed.
   */
  async _showScreen() {
    const s = SCREENS[this._screenIndex];
    if (!s) {
      this.warn(`Data not found for screen ${this._screenIndex}`);
      return;
    }
    this.feed(screen(this, s.view));
    const target = await this.ensurePart(s.target);
    this.triggerHandlers({
      service: 'spotlight:focus',
      target: target.el,
      // Back is live on every screen: from the first it walks out to Step 3,
      // so there is never a dead end to hide it for.
      tooltip: { ...BADGE, variant: 'figma' },
      direction: s.direction,
      radius: s.radius,
      owner: this,
    });
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.mget(_a.service);
    switch (service) {
      case 'next-step':
        // Only the last view hands the tour back to tutorial_main; the bare
        // triggerHandlers() lets it read this widget's own service attribute.
        // Step 4 is last, so that completes the tutorial.
        if (this._screenIndex >= SCREENS.length - 1) return this.triggerHandlers();
        this._screenIndex = this._screenIndex + 1;
        return this._showScreen();
      case 'back-step':
        // Back off the first view leaves Step 4 entirely (→ Step 3).
        if (this._screenIndex <= 0) return this.triggerHandlers({ service: 'back-step' });
        this._screenIndex = this._screenIndex - 1;
        return this._showScreen();
    }
  }
}

module.exports = __tutorial_task;
