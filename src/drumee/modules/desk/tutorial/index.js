require('./skin');
const { workspaceContent } = require("./skeleton/toolkit")

const SVC_OPT = { async: 1 };

// Every step widget is a bare `import()` in seeds.js, so each one is its own
// webpack chunk with no prefetch hint. Left alone, pressing Next is the moment
// the chunk is requested: Kind.get() hands back the lazy loader placeholder,
// which mounts EMPTY, waits on the network, then respawns itself once the module
// lands (see ui-core letc/kind/loader.js). The user pays a round trip plus a
// mount-and-rebuild on every step boundary, and the spotlight is left measuring
// a placeholder while it happens.
//
// Kind.waitFor resolves the import and registers the class, after which
// Kind.get() answers synchronously — no placeholder, no respawn, no fetch. Warm
// them while step 1 is on screen and being read.
//
// Step 1 (tutorial_workspace), the spotlight and media_grid are all pulled in by
// the shell itself, so they are already on their way and are not listed here.
const PRELOAD_KINDS = [
  'tutorial_folder',
  'tutorial_meeting',
  'tutorial_task',
  'tutorial_share',
  'tutorial_migrate',
];

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
      // Step 3 is the meeting room. It used to be the permissions step ("Set
      // who sees what", tutorial_settings) with the meeting at step 4; that
      // step was retired, and its widget and kind registration are still on
      // disk, just unused.
      [
        workspaceContent(this, { aspect: "faded" }),
        { kind: 'tutorial_meeting', service: "next-step", uiHandler: [this] },
      ],
      [
        workspaceContent(this, { aspect: "faded" }),
        { kind: 'tutorial_task', service: "next-step", uiHandler: [this] },
      ],
      // Step 5 — secure share. Three internal screens, like steps 2 and 4.
      [
        workspaceContent(this, { aspect: "faded" }),
        { kind: 'tutorial_share', service: "next-step", uiHandler: [this] },
      ],
      // Step 6 — Google Drive migration. Its menu and dialog sit over the desk,
      // so the workspace grid behind them is the step's own subject matter and
      // is NOT faded here.
      [
        workspaceContent(this),
        { kind: 'tutorial_migrate', service: "next-step", uiHandler: [this] },
      ],
    ];

  }

  onDomRefresh() {
    this.feed(require('./skeleton')(this));
    this._preloadSteps();
  }

  /**
   * Pull the remaining step widgets down in the background so that pressing
   * Next renders from memory rather than from the network. Fire and forget: a
   * warm-up that fails costs nothing, because the step still loads on demand
   * exactly as it does today.
   */
  _preloadSteps() {
    if (typeof Kind === 'undefined' || !_.isFunction(Kind.waitFor)) return;
    for (const kind of PRELOAD_KINDS) {
      Promise.resolve(Kind.waitFor(kind)).catch((e) => {
        this.warn && this.warn(`[tutorial] could not preload ${kind}`, e);
      });
    }
  }

  /**
   * The feed payload for a step, optionally with extra attributes merged into
   * the widget that OWNS the step.
   *
   * A step is either a single widget or an array whose LAST entry is the
   * interactive widget and whose earlier entries are inert faded backdrop
   * (see `_widgets`). `enter_at_last` therefore has to land on the last entry,
   * not on the array — steps that run several internal screens (workspace,
   * folder) read it to resume where they left off.
   *
   * @param {Number} i
   * @param {Object} opt attributes merged into the interactive widget
   * @returns {Object|Array} feed payload, or undefined past the last step
   */
  _widgetAt(i, opt = {}) {
    const w = this._widgets[i];
    if (!w) return w;
    if (_.isArray(w)) {
      const last = w.length - 1;
      return w.map((k, n) => (n === last ? { ...k, ...opt } : k));
    }
    return { ...w, ...opt };
  }

  /**
   *
   */
  _nextStep() {
    this._stepIndex++;
    if (this._widgets[this._stepIndex]) {
      this.ensurePart('spotlight').then((s) => s.clear && s.clear());
      this.ensurePart(_a.content).then((p) => {
        p.feed(this._widgetAt(this._stepIndex))
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
    // Steps that run internal screens (workspace's sub-badges, folder's three
    // screens) must land on their LAST screen when re-entered via Back — where
    // the user left off, not back at the start. Steps without internal screens
    // ignore the flag.
    const widget = this._widgetAt(this._stepIndex, { enter_at_last: true });
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
