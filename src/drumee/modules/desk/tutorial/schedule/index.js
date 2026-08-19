const skeleton = require('./skeleton');
const { stepBadge, isLastScreen } = require('../tours');

const BADGE = {
  title: 'Meet in your folder',
  desc: 'Every folder has its own meeting. Start calls from your folder.  or Schedule it for later.',
};

/**
 * The closing screen of `folder_task`: the folder's Meeting tab, where a call
 * is started or put on the calendar.
 *
 * It is deliberately a separate step from tutorial_meeting, which is the call
 * itself and belongs to the `full` tour. Figma redrew node 5:75093 from the
 * room to this scheduler; rather than replace the room — which `full` still
 * walks through as its third step — this adds the scheduler as its own step,
 * which is also what the design's own "STEP 9/9" asks for: three folder
 * screens plus five tracker views plus this one.
 */
class __tutorial_schedule extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
  }

  async onDomRefresh() {
    this.feed(skeleton(this));
    const cal = await this.ensurePart('sched-cal');
    // The design lights the calendar and points the card at the Tuesday
    // column's header — its vignette (a radialGradient at 842,295 of the
    // 1440x1024 frame, radii ~615 x 842) covers the whole grid, while the
    // connector leaves the card at mid-height and lands on the day header.
    // target and anchor exist precisely so those two can differ.
    const day = await this.ensurePart('sched-day');
    this.triggerHandlers({
      service: 'spotlight:focus',
      target: cal.el,
      anchor: day.el,
      tooltip: {
        ...BADGE,
        badge_text: stepBadge(this, 0),
        hide_back: !!this.mget('is_first'),
        variant: 'figma',
        done: isLastScreen(this, 0, 1),
      },
      direction: 'east',
      // Our hole is circular and clear to 55% of the radius, so ~620 puts the
      // grid inside the clear core and leaves the fade past the window edge —
      // the horizontal reach of the design's own ellipse.
      radius: 620,
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

module.exports = __tutorial_schedule;
