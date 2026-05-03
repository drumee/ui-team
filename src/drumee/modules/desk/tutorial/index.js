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
      this.ensurePart(_a.content).then((p) => {
        p.feed(this._widgets[this._stepIndex])
      })
    } else {
      this._enterWorkspace();
    }
  }

  /**
   * Exit the tutorial, mirroring the standalone onboarding flow:
   * mark onboarding complete on the backend, push profile, then tear
   * down the overlay regardless of network outcome.
   */
  _enterWorkspace() {
    localStorage.onboarding_step = "0";
    const exit = () => this.softDestroy();
    this.postService(SERVICE.onboarding.mark_complete, {}, SVC_OPT)
      .then(() => this.postService(SERVICE.onboarding.update_profile, {}, SVC_OPT))
      .then(exit)
      .catch(exit);
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.mget(_a.service);
    this.debug("NEXT", service)
    switch (service) {
      case 'next-step':
        this._nextStep()
        break;
      case 'skip-tour':
        this._nextStep()
        break;
      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }
}

module.exports = tutorial_main;
