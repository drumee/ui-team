require('./skin');
const Tours = require('libs/tutorial-tours');
const { tour, flaggedIds, stepChrome } = require('./tours');

const SVC_OPT = { async: 1 };

// ── Responsive tiers ─────────────────────────────────────────────────────────
//
// The tour draws a MOCK of the product, so it cannot simply reflow the way a
// document would: at 1440 it has to read as the real desk, and at 390 it has to
// read as something a thumb can drive. Four tiers rather than a continuum,
// because each one is a different composition, not the same one squeezed.
//
// Stamped as an attribute on the widget root instead of being answered by media
// queries in each skin, for three reasons: the skins are keyed on fig.family
// and fig.group and would each need the same breakpoints repeated; the JS needs
// the same answer the CSS has (the carousel's slide distance, below); and a
// tour opened in a narrow WINDOW on a big screen is the same problem as a phone
// — a media query on the device would miss it.
//
// Widths are the viewport's. The boundaries are where this particular layout
// breaks, measured against the mock rather than borrowed from a framework:
// below 1366 the empty-state hero and its carousel stop both fitting at full
// size, below 1024 they stop sharing a row at all, and below 760 the rail and
// the panes have to give up their fixed widths.
const SIZE_TIERS = [
  { id: 'mobile', max: 759 },
  { id: 'narrow', max: 1023 },
  { id: 'compact', max: 1365 },
  { id: 'wide', max: Infinity },
];

// Height is its own axis, and the one that aspect ratio actually moves: a 21:9
// window and a rotated phone are both SHORT, and shortness is what pushes a
// callout off the bottom of the tour. Kept separate from the width tier so the
// two compose instead of multiplying into eight cases.
const SHORT_HEIGHT = 720;

// Resize settles before anything is re-measured. Long enough to sit out a drag
// of the window edge, short enough that a rotation feels immediate.
const REFLOW_MS = 160;

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
   * How many screens of a step actually run.
   *
   * A step may declare a `live_screens` tail — screens that stop being a mock
   * and do something real. Today that is the workspace step's create form and
   * the invite screen after it, and they run on ONE of the three ways this tour
   * reaches the screen:
   *
   *   post-signup `workspace`   the run this is for. A brand-new account with
   *                             no workspace, being walked into making its
   *                             first one. Live.
   *   `?tutorial=workspace`     a preview. Deliberately exempt from the
   *                             seen-set so the same URL works twice — which
   *                             with a live form means twice the workspaces.
   *                             Mock.
   *   step 1 of `full`          Get help -> Product Tour, run by someone who
   *                             already has workspaces and asked to see the
   *                             product. Mock. (Also gated in the registry,
   *                             which declares no live_screens there; this is
   *                             belt as well as braces.)
   *
   * Gated HERE rather than in the registry because `preview` is not a registry
   * concept — it is a per-run attribute the launcher stamps — and splitting the
   * decision across two files is how one of them ends up forgotten.
   *
   * @param {Object} step a TOURS step
   * @returns {Number}
   */
  _screensFor(step) {
    const declared = ~~step.screens || 1;
    const live = ~~step.live_screens;
    if (!live) return declared;
    return this._canCreate() ? declared : Math.max(1, declared - live);
  }

  /** Is this the run that is allowed to create a real workspace? */
  _canCreate() {
    return this._tour.id === 'workspace' && !this.mget('preview');
  }

  /**
   * Turn a registry entry into the feed payloads _widgetAt hands out.
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
    // Progress counts every screen in the tour, so the host has to know the
    // total and where each step starts — a step widget can see its own screens
    // and nothing else. Computed once here rather than derived per screen.
    //
    // Through _screensFor, so a step whose tail is gated off is short by those
    // screens in the TOTAL as well as in its own count. Miss that and the last
    // callout of a six-screen run reads "STEP 6/8".
    const count = (s) => this._screensFor(s);
    const total = steps.reduce((n, s) => n + count(s), 0);
    const offsets = [];
    steps.reduce((n, s) => (offsets.push(n), n + count(s)), 0);

    return steps.map((step, i) => {
      const widget = {
        kind: step.kind,
        // NO `service` here, deliberately. ui-core binds an onclick to every
        // widget that is not `active: 0` and dispatches its own `service` to
        // its uiHandler (letc.js __handleClick -> triggerHandlers), and the
        // step widget's element is the whole pane. With `service: 'next-step'`
        // on it, every part of a step's scenery was a button that advanced the
        // WHOLE STEP: one stray click on the chat pane at screen 2 of 5 jumped
        // the tour to the meeting step, so screens 3, 4 and 5 — steps 9, 10
        // and 11 of the full tour — never appeared.
        //
        // The inner scenery is all `active: 0`, which means it has no click
        // handler of its own and the click bubbles up to here, so making the
        // pane inert is not enough on its own; the wrapper must not name a
        // service. `active: 0` is not the fix either — it would gag
        // triggerHandlers (letc.js:843) and with it the step's own handoff.
        //
        // The handoff is explicit instead: each step's last screen calls
        // triggerHandlers({ service: 'next-step' }). A stray click now reaches
        // onUiEvent with no service at all and falls through to `default`.
        uiHandler: [this],
        screen_count: count(step),
        screen_offset: offsets[i],
        tour_screens: total,
        is_first: i === 0,
        is_last: i === steps.length - 1,
      };
      return widget;
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
    this._applySize();
    this._bindResize();
    this.feed(require('./skeleton')(this));
    // Feed the FIRST step from the registry, exactly as _nextStep feeds every
    // later one. The shell used to hardcode `tutorial_workspace` into its step
    // slot, which meant every tour opened on the workspace step no matter which
    // tour had been asked for — the registry decided steps 2..n and the
    // skeleton silently decided step 1.
    const entry = this.mget('enter_at_screen');
    this._applyChrome();
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
   * The feed payload for a step, with extra attributes merged in.
   *
   * A step used to be able to be an ARRAY — inert backdrop entries followed by
   * the interactive widget — so that several steps could share one drawing of
   * the Files pane. 2.0 removed the need: every step's pane is part of what
   * that step teaches (migrate points at the Files CTA, share at the grid it
   * shares from), so each draws its own and nothing is inert scenery any more.
   *
   * @param {Number} i
   * @param {Object} opt attributes merged into the widget
   * @returns {Object} feed payload, or undefined past the last step
   */
  _widgetAt(i, opt = {}) {
    const w = this._widgets[i];
    return w ? { ...w, ...opt } : w;
  }

  /**
   * Put the shell into the context the current step is teaching.
   *
   * The rail and the breadcrumb are NOT constant across a tour: `full` opens on
   * the create-workspace dialog, where no workspace exists — so the rail has no
   * workspace tabs and the topbar names nothing — and then spends every later
   * step inside one. Rendering the shell once at mount left five workspace tabs
   * and a workspace name over a dialog whose whole point is that the user has
   * not made a workspace yet.
   *
   * Both are `sys_pn` slots, re-fed here rather than rebuilt: the rail's logo
   * and footer do not change, and neither does the utility cluster. What is fed
   * is the slot's CONTENTS — feeding the container itself back in would nest a
   * second __sb-nav inside the first.
   */
  _applyChrome() {
    const step = (this._tour.steps || [])[this._stepIndex];
    const { rail, crumb } = stepChrome(step);
    const sidebar = require('./skeleton/sidebar');
    const topbar = require('./skeleton/topbar');
    // navItems, not railItems: the slot is replaced whole, so the org's Dept.
    // entry has to come back with the workspace tabs or the org-home rail —
    // which has no tabs at all — is fed an empty list and renders bare.
    this.ensurePart('rail-nav').then((p) => p.feed(sidebar.navItems(this, rail)));
    this.ensurePart('crumb').then((p) => p.feed(crumb ? topbar.workspaceCrumb(this) : null));
  }

  /**
   * Stamp the size tier on the root, where every skin can see it.
   *
   * Two attributes rather than one combined class: width and height break the
   * layout independently, and a short WIDE window wants the wide composition
   * with less vertical padding, not the narrow one.
   *
   * @returns {Boolean} whether either value changed
   */
  _applySize() {
    if (!this.el || !this.el.dataset || typeof window === 'undefined') return false;
    // Which tour is running, for the skins. Stamped here rather than in a
    // second method because this is already the one place that writes to the
    // root's dataset, and it runs before the shell is fed. The workspace tour
    // is the one that reads it (skin: it drops the scrim).
    this.el.dataset.tour = this._tour.id;
    const w = window.innerWidth || 0;
    const h = window.innerHeight || 0;
    const tier = SIZE_TIERS.find((t) => w <= t.max) || SIZE_TIERS[SIZE_TIERS.length - 1];
    const short = h > 0 && h < SHORT_HEIGHT ? '1' : '0';
    const changed = this.el.dataset.size !== tier.id || this.el.dataset.short !== short;
    this.el.dataset.size = tier.id;
    this.el.dataset.short = short;
    return changed;
  }

  /**
   * Re-measure the tour when the window changes shape.
   *
   * The callout is placed from the rect of the thing it points at, read once
   * when the screen was raised. Resize the window — or rotate a tablet, which
   * is the same event — and that rect is stale: the card stays where the old
   * layout put it, which at worst is off the edge with its buttons out of
   * reach. So the current screen is re-focused rather than merely restyled.
   *
   * Unconditionally, not only when the TIER changed: a resize within one tier
   * still moves everything the callout was measured against.
   */
  _bindResize() {
    if (typeof window === 'undefined') return;
    this._onResize = () => {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => {
        if (this.isDestroyed && this.isDestroyed()) return;
        this._applySize();
        this.ensurePart('spotlight').then((s) => s && s.reflow && s.reflow());
      }, REFLOW_MS);
    };
    window.addEventListener('resize', this._onResize);
    // Rotation on iOS reports the new size a beat after `resize`; the debounce
    // above absorbs that, and this catches the browsers that fire only this.
    window.addEventListener('orientationchange', this._onResize);
  }

  _unbindResize() {
    if (typeof window === 'undefined' || !this._onResize) return;
    clearTimeout(this._resizeTimer);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('orientationchange', this._onResize);
    this._onResize = null;
  }

  /**
   *
   */
  _nextStep() {
    this._stepIndex++;
    if (this._widgets[this._stepIndex]) {
      this._showStep(this._widgetAt(this._stepIndex));
    } else {
      this._enterWorkspace();
    }
  }

  /**
   * Swap the step on screen: put the spotlight down, then bring the next one up.
   *
   * Ordered, and that ordering is the whole point. These used to be two
   * independent promise chains — clear the spotlight, feed the content — and
   * `clear()` ends in a SECOND async hop of its own (ensurePart('callout')
   * then feed(null)). A step that mounted quickly raised `spotlight:focus`,
   * had its callout rendered, and then the previous step's stale clear landed
   * and wiped it. The screen kept its scrim and lost its callout, which reads
   * as a tour with no way forward.
   *
   * The meeting step hit it every time: one screen, one part to await, and
   * preloaded — the shortest path from mount to callout in the tour. The
   * spotlight also guards this on its own side with a sequence token, so a
   * late clear from anywhere loses; this just keeps the visible order right.
   *
   * @param {Object|Array} payload from _widgetAt
   */
  async _showStep(payload) {
    this._applyChrome();
    const spotlight = await this.ensurePart('spotlight');
    if (spotlight && spotlight.clear) await spotlight.clear();
    const content = await this.ensurePart(_a.content);
    content.feed(payload);
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
    this._showStep(this._widgetAt(this._stepIndex, { enter_at_last: true }));
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
        // Not while a live screen is up. Everything before those is a mock, so
        // Escape costs the user a walkthrough they can reload into; on the
        // create form it would throw away a name they typed, and on the invite
        // screen it would dismiss the workspace they just made without ever
        // showing them it exists. Both of those screens carry their own way
        // out — Create, Skip this step, Invite later — and those are the ones
        // that hand the tour back deliberately.
        if (this._liveStepRunning()) return false;
        this._skipTour();
        return true;
      },
    });
  }

  /**
   * Is the step on screen showing something the user is filling in?
   *
   * Asked of the step rather than tracked here: the host knows which STEP is
   * running and nothing about which of its screens is, and the step already has
   * to know (it is the thing rendering them).
   */
  _liveStepRunning() {
    const part = this.getPart && this.getPart(_a.content);
    const step = part && part.children && part.children.last();
    return !!(step && _.isFunction(step.isLive) && step.isLive());
  }

  onBeforeDestroy() {
    this._unbindResize();
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
