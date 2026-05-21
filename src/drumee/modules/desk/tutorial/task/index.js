const BADGE = {
  badge_text: 'STEP 5/5',
  title: 'Project tracker in folder',
  desc: `Track tasks, deadlines, and progress without leaving your folder. Every folder has its own project tracker so your team stays aligned on what's happening inside.`,
};

class __tutorial_task extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
  }

  async onDomRefresh() {
    this.feed(require('./skeleton')(this));
    const board = await this.ensurePart('kanban');
    this.triggerHandlers({
      service: 'spotlight:focus',
      target: board.el,
      tooltip: BADGE,
      direction: 'east',
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
      case 'skip-tour':
        return this.triggerHandlers({ service: 'skip-tour' });
    }
  }
}

module.exports = __tutorial_task;
