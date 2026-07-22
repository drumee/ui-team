require('./skin');
const { workspaceContent } = require("./skeleton/toolkit")

const SVC_OPT = { async: 1 };

class tutorial_main extends LetcBox {

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    this._stepIndex = 0;
    this._widgets = [
      { kind: 'tutorial_workspace', service: "next-step", uiHandler: [this] },
      [
        workspaceContent(this, { aspect: "faded" }),
        { kind: 'tutorial_folder', service: "next-step", uiHandler: [this] }
      ],
      [
        workspaceContent(this, { aspect: "faded" }),
        { kind: 'tutorial_folder', aspect: "faded" },
        { kind: 'tutorial_settings', service: "next-step", uiHandler: [this] }
      ],
      [
        workspaceContent(this, { aspect: "faded" }),
        { kind: 'tutorial_meeting', service: "next-step", uiHandler: [this] },
      ],
      [
        workspaceContent(this, { aspect: "faded" }),
        { kind: 'tutorial_task', service: "next-step", uiHandler: [this] },
      ],
    ];

  }

  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  /**
   *
   */
  _nextStep() {
    this._stepIndex++;
    if (this._widgets[this._stepIndex]) {
      this.ensurePart('spotlight').then((s) => s.clear && s.clear());
      this.ensurePart(_a.content).then((p) => {
        p.feed(this._widgets[this._stepIndex])
      })
    } else {
      this._enterWorkspace();
    }
  }

  /**
   * Step back to the previous tutorial step. No-op on the first step,
   * where there is nothing to go back to.
   */
  _prevStep() {
    if (this._stepIndex <= 0) return;
    this._stepIndex--;
    // The workspace step (index 0) has internal sub-badges; when re-entered via
    // Back it must land on its LAST badge (where it left off), not the first.
    const widget = this._stepIndex === 0
      ? { ...this._widgets[0], enter_at_last: true }
      : this._widgets[this._stepIndex];
    this.ensurePart('spotlight').then((s) => s.clear && s.clear());
    this.ensurePart(_a.content).then((p) => {
      p.feed(widget)
    })
  }

  /**
   * Exit the tutorial and record that the user has seen it so it doesn't
   * auto-show again on subsequent sessions via a forced URL param.
   */
  _enterWorkspace() {
    localStorage.onboarding_step = "0";
    const exit = () => this.softDestroy();
    this.postService(
      SERVICE.drumate.update_settings,
      { hub_id: Visitor.id, settings: { tutorial_done: true } },
      SVC_OPT
    ).then(exit).catch(exit);
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.mget(_a.service);
    switch (service) {
      case 'next-step':
        this._nextStep()
        break;
      case 'back-step':
        this._prevStep();
        break;
      case 'spotlight:focus':
        this.ensurePart('spotlight').then((s) => s.focus(args));
        break;
      case 'spotlight:clear':
        this.ensurePart('spotlight').then((s) => s.clear());
        break;
      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }
}

module.exports = tutorial_main;
