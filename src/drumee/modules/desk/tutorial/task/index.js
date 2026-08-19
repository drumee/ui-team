const { screen } = require('./skeleton');
const { stepBadge, isLastScreen, entryScreen } = require('../tours');

const BADGE = {
  title: 'Project tracker in folder',
  desc: `Track tasks, deadlines, and progress without leaving your folder. Every folder has its own project tracker so your team stays aligned on what's happening inside.`,
};

/**
 * Step 4 walks the five tracker views behind ONE parent step, the same way
 * tutorial_workspace runs its sub-badges and tutorial_folder its three screens:
 * navigation stays inside this widget until the last view, and only then does
 * it hand back to tutorial_main. The badge reads STEP 4/5 throughout.
 *
 * The copy is identical on all five screens because the design repeats one
 * callout across all five frames (Figma 5:75112, 3202:123320, 3202:185373,
 * 3202:185461, 3202:185481).
 *
 * Each entry owns the view it renders, the part the spotlight points at, and
 * the direction the connector leaves the card — `west` throughout, as the
 * design puts the card to the RIGHT of what it marks.
 */
// `radius` is only the fallback for when the bar cannot be measured — the hole
// is normally sized by _holeRadius() so the view switcher stays readable on
// every screen.
const SCREENS = [
  // The card the design's connector lands on, inside the In Progress column.
  { view: 'board', target: 'board-card', direction: 'west', radius: 520 },
  // The busiest day of the week strip.
  { view: 'calendar', target: 'cal-day', direction: 'west', radius: 520 },
  // The selected row's bar — its own rect is a thin ribbon.
  { view: 'gantt', target: 'gantt-bar', direction: 'west', radius: 520 },
  // The status cell of the highlighted row; the table itself is full-width.
  { view: 'list', target: 'list-focus', direction: 'west', radius: 420 },
  // Status overview: the donut and its legend.
  { view: 'health', target: 'health-status', direction: 'west', radius: 520 },
];

class __tutorial_task extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._screenIndex = 0;
  }

  async onDomRefresh() {
    // Re-entered via Back from Step 5: resume on the view we left off on.
    this._screenIndex = entryScreen(this, SCREENS.length);
    this._showScreen();
  }

  onPartReady(child, pn) {
    switch (pn) {
      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }

  /**
   * Radius that keeps the whole view-switcher bar inside the lit area.
   *
   * The hole is a circle centred on the screen's target and is fully clear out
   * to 55% of its radius (see spotlight/skin). The bar is the window's full
   * width, so a circle that holds it entirely inside that clear core needs a
   * radius of ~1200-1600px — on a 1440x1024 stage that stops the vignette
   * dimming anything at all. COVERAGE places the bar's far corner at 72%
   * instead: the bar reads end to end while the edges of the window still fade.
   *
   * Measured from the DOM rather than tabulated per screen, so it stays right
   * if the window or the bar changes.
   *
   * @param {Element} el the spotlight target
   * @returns {Number|null} null when the bar cannot be measured
   */
  _holeRadius(el) {
    const COVERAGE = 0.72;
    if (!el || typeof el.getBoundingClientRect !== 'function') return null;
    if (!this.el || typeof this.el.querySelector !== 'function') return null;
    const bar = this.el.querySelector(`.${this.fig.family}__bar`);
    if (!bar) return null;
    const t = el.getBoundingClientRect();
    const b = bar.getBoundingClientRect();
    if (!t.width || !b.width) return null;
    const cx = t.left + t.width / 2;
    const cy = t.top + t.height / 2;
    const far = Math.max(
      Math.hypot(b.left - cx, b.top - cy),
      Math.hypot(b.right - cx, b.top - cy),
      Math.hypot(b.left - cx, b.bottom - cy),
      Math.hypot(b.right - cx, b.bottom - cy),
    );
    return Math.round(far / COVERAGE);
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
      // Numbering, Back and Done all come from the tour. These five views read
      // "STEP 1/5 … 5/5" as their own tour and "STEP 4/6" throughout as step
      // four of the full one — five screens, one step number, which is what the
      // six-step tour has always shown.
      tooltip: {
        ...BADGE,
        badge_text: stepBadge(this, this._screenIndex),
        // Live whenever a previous step exists; hidden on view 1 of its own
        // tour, where back-step would reach the host with nowhere to go.
        hide_back: !!this.mget('is_first') && this._screenIndex === 0,
        variant: 'figma',
        done: isLastScreen(this, this._screenIndex, SCREENS.length),
      },
      direction: s.direction,
      // Measured so the whole view switcher stays lit; s.radius is the fallback.
      radius: this._holeRadius(target.el) || s.radius,
      owner: this,
    });
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.mget(_a.service);
    switch (service) {
      case 'next-step':
        // Only the last view hands the tour back to tutorial_main; the bare
        // triggerHandlers() lets it read this widget's own service attribute.
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
