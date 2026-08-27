require('./skin');
const Tours = require('libs/tutorial-tours');
const { tour, flaggedIds, BADGE_BY_FLOW } = require('./tours');
const BACKDROPS = require('./skeleton/toolkit/backdrops');

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
// them while the first step is on screen and being read.
//
// Only the ACTIVE tour's kinds are warmed. The six-step tour warmed all five
// later steps because it was always going to render them; a contextual tour of
// one step has no business fetching four chunks it will never mount.

class tutorial_main extends LetcBox {

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    this._stepIndex = 0;
    this._tour = tour(this.mget('tour'));
    this._widgets = this._buildWidgets(this._tour);
    // ?tutorial=<id>&step=<n> — 1-based, clamped. Only useful for a multi-step
    // tour; for the rest it is always 0 and costs nothing.
    this._stepIndex = this._entryStep();
  }

  /**
   * Which step `?tutorial=<id>&step=<n>` asked to open on. 0 for every normal
   * run — nothing but the URL ever sets it.
   */
  _entryStep() {
    const raw = this.mget('enter_at_step');
    if (raw == null || raw === '') return 0;
    return Math.max(0, Math.min(this._widgets.length - 1, ~~raw - 1));
  }

  /**
   * Turn a registry entry into the feed payloads _widgetAt hands out.
   *
   * A step is either one widget, or an array whose LAST entry is the
   * interactive widget and whose earlier entries are inert backdrop. That shape
   * is load-bearing: _widgetAt merges `enter_at_last` onto the last entry, and
   * steps that run several internal screens read it to resume where the user
   * left off.
   *
   * Everything a step needs to know about its position in the tour is stamped
   * here as model attributes, so the step widgets stay ignorant of which tour
   * they are in.
   *
   * @param {Object} t a TOURS entry
   * @returns {Array}
   */
  _buildWidgets(t) {
    const steps = t.steps || [];
    // 'flow' counts every screen in the tour, so the host has to know the total
    // and where each step starts — a step widget can see its own screens and
    // nothing else. Computed once here rather than derived per screen.
    const total = steps.reduce((n, s) => n + (~~s.screens || 1), 0);
    const offsets = [];
    steps.reduce((n, s) => (offsets.push(n), n + (~~s.screens || 1)), 0);

    const mode = t.badge === BADGE_BY_FLOW ? BADGE_BY_FLOW : 'steps';
    if (t.badge && t.badge !== BADGE_BY_FLOW && t.badge !== 'steps') {
      this.warn && this.warn(
        `[tutorial] tour "${t.id}" has an unknown badge mode "${t.badge}"; ` +
        `falling back to step numbering`
      );
    }

    return steps.map((step, i) => {
      const widget = {
        kind: step.kind,
        service: 'next-step',
        uiHandler: [this],
        badge_mode: mode,
        // Used by 'steps' mode, and as the fallback if a step somehow renders
        // before its flow numbers land.
        badge_text: (LOCALE.TUTORIAL_STEP || 'STEP {0}/{1}').format(i + 1, steps.length),
        screen_count: step.screens || 1,
        screen_offset: offsets[i],
        tour_screens: total,
        is_first: i === 0,
        is_last: i === steps.length - 1,
      };
      const backdrop = (step.backdrop || [])
        .map((name) => (BACKDROPS[name] ? BACKDROPS[name](this) : null))
        .filter(Boolean);
      return backdrop.length ? [...backdrop, widget] : widget;
    });
  }

  onDomRefresh() {
    // The tour is on screen. Two separate things follow, in this order:
    //
    //   armed()    cancels the single-flight guard's fetch timer. From here
    //              only this widget's destroy releases the guard, so a slow
    //              read cannot let a second tour mount on top.
    //   markSeen() records the tour, once per user ever. Deliberately here and
    //              not at the trigger: a tour whose chunk failed to load never
    //              reaches this line and so is never burned. And not on
    //              completion either — with no skip control and _enterWorkspace
    //              reachable only by pressing through every screen, a reload
    //              mid-tour would replay it on the next qualifying click,
    //              indefinitely.
    Tours.armed();
    // `preview` is set by the ?tutorial= launcher. An explicitly requested tour
    // is exempt from the seen-set on the way IN (D3), so burning the flag on
    // the way OUT is the wrong half of the same rule: previewing `migrate` once
    // would kill the real + New trigger for that account forever, and a UI
    // check would be a one-shot. Contextual runs still record normally.
    if (this._tour.flag && !this.mget('preview')) {
      Tours.markSeen(this._tour.flag, this);
    }
    this._bindEscape();
    this.feed(require('./skeleton')(this));
    // Feed the FIRST step from the registry, exactly as _nextStep feeds every
    // later one. The shell used to hardcode `tutorial_workspace` into its step
    // slot, which meant every tour opened on the workspace step no matter which
    // tour had been asked for — the registry decided steps 2..n and the
    // skeleton silently decided step 1.
    const entry = this.mget('enter_at_screen');
    this.ensurePart(_a.content).then((p) =>
      p.feed(this._widgetAt(this._stepIndex, entry ? { enter_at_screen: entry } : {})),
    );
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
    // Skip the step already on screen — the shell pulled it in to render it.
    const kinds = this._tour.steps.slice(1).map((s) => s.kind);
    for (const kind of kinds) {
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
    // Done is the one control in the tour that waits on the network, so it is
    // the one that can be pressed twice. Without this the second press runs
    // the whole exit again — a second update_settings write, and for `full` a
    // second round of markSeen posts.
    if (this._exiting) return;
    this._exiting = true;
    // The write below is the only thing between the press and the tour
    // vanishing; on a slow link that is a silent pause. Mark the button
    // pending for its duration. Nothing clears it: either branch below
    // destroys the tour, which takes the button with it.
    this.ensurePart('spotlight').then((s) => s.busy && s.busy());
    localStorage.onboarding_step = "0";
    // Finishing the six-step tour means the user has seen everything, so it
    // records every flagged tour rather than only the legacy boolean. Without
    // this, someone who fired one contextual tour and later ran the full tour
    // from Get help would still be interrupted by the remaining three: the map
    // exists by then, so the tutorial_done inference no longer applies.
    if (this._tour.id === 'full') {
      for (const id of flaggedIds()) Tours.markSeen(id, this);
    }
    const exit = () => this.softDestroy();
    // Still written: an older client reads this boolean to decide it has
    // nothing to show, and the seen-set inference for pre-existing users
    // depends on it.
    this.postService(
      SERVICE.drumate.update_settings,
      { hub_id: Visitor.id, settings: { tutorial_done: true } },
      SVC_OPT
    ).then(exit).catch(exit);
  }

  /**
   * Leave the tour without finishing it.
   *
   * Deliberately NOT _enterWorkspace(), which is the DONE path and does two
   * things skip must not:
   *
   *   tutorial_done   Writing it because someone dismissed a three-screen tour
   *                   is wrong on its face, and it is load-bearing: S7 reads
   *                   `tutorial_done` truthy + `tutorials_seen` ABSENT as "has
   *                   seen everything". The map is never absent once a tour has
   *                   mounted, so the inference does not fire today — but a QA
   *                   reset clears the map, and then a single skip would
   *                   permanently suppress every tour.
   *   write-all       For `full`, Done marks all five flagged tours seen. Skipping
   *                   `full` on screen 1 would record the user as having seen
   *                   every tour they just declined to watch.
   *
   * So skip writes NOTHING. It does not have to: the tour was recorded when it
   * mounted (D4), which is what stops it re-triggering. Skipping `full` records
   * nothing at all, which is correct — `full` is unflagged, and a user who left
   * it early has not seen the contextual tours, so those stay armed.
   *
   * softDestroy() is the same teardown Done uses, so everything chained on
   * `destroy` — the reward flow, LAUNCH30, the invited-workspace prompt, the
   * Get-help return, the single-flight release — behaves identically.
   */
  /**
   * Escape leaves the tour, exactly as the skip control does.
   *
   * CAPTURE phase, deliberately. The desk already owns a bubble-phase Escape
   * (`desk-escape`, modules/desk/index.js), and its match guards on
   * `!e.defaultPrevented` — so a capture binding that reports it acted gets
   * preventDefault() from the hotkeys lib and the desk's handler then declines
   * the same keypress on its own terms. The two interlock through the existing
   * contract rather than racing.
   *
   * `inTextEntry` is not checked: the tour renders its own mock desk and has no
   * focusable inputs, so there is nothing to type into.
   *
   * A full-screen thing you cannot dismiss with Escape is a UX smell, and the
   * permanence argument does not apply here — the tour is already recorded from
   * mount, so an accidental Escape costs exactly what an accidental reload
   * already costs.
   */
  _bindEscape() {
    const hotkeys = require('libs/hotkeys');
    this._escapeHotkey = hotkeys.register({
      name: `tutorial-escape-${this._id}`,
      phase: 'capture',
      match: (e) => e.key === 'Escape' && !e.defaultPrevented,
      run: () => {
        if (this.isDestroyed && this.isDestroyed()) return false;
        this._skipTour();
        return true;
      },
    });
  }

  onBeforeDestroy() {
    if (this._escapeHotkey) {
      require('libs/hotkeys').unregister(this._escapeHotkey);
      this._escapeHotkey = null;
    }
    if (super.onBeforeDestroy) super.onBeforeDestroy();
  }

  _skipTour() {
    this.softDestroy();
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
      // Raised by the callout's skip control, which the spotlight wires at this
      // widget rather than at the step — see tooltip.js. One case here instead
      // of a forwarding case in each of the six step files.
      case 'end-tour':
        this._skipTour();
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
