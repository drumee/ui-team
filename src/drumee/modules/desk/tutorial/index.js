require('./skin');
const { workspaceContent } = require("./skeleton/toolkit")
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
      this._stepIndex = 0;
      this.ensurePart(_a.content).then((p) => {
        p.feed(this._widgets[this._stepIndex])
      })
    }
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
