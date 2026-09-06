require('./skin');
const Tours = require('libs/tutorial-tours');
const { tour, flaggedIds, stepChrome } = require('./tours');
const { REFLOW_MS, tierFor, screensFor, buildStepWidgets } = require('./host-kit');

const SVC_OPT = { async: 1 };

// The size tiers, the short-height threshold and the resize debounce moved to
// ./host-kit, which is where both hosts read them from — the desk host measures
// the viewport, the in-window host measures its own overlay, and the numbers
// they measure against are the same. The reasoning for each boundary lives
// there, next to the values.

// How long the hand-off waits for the new workspace to actually appear, and
// how often it looks.
//
// Wm.loadWorkspace is fire-and-forget — it returns undefined and mounts the
// pane from inside a media.attributes fetch — so the only honest answer to "did
// it open" is to watch for the pane. The budget covers a slow link; past it the
// open has failed (loadWorkspace has its own 'cannot resolve workspace root'
// path) and there is no window for the next tour to be drawn on.
const OPEN_WAIT_MS = 8000;
const OPEN_POLL_MS = 60;

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
   *   `?tutorial=workspace`     also live. This was mock at first, on the
   *                             grounds that the preview URL is exempt from the
   *                             seen-set and so runs twice — but loading it
   *                             twice does not create two workspaces. Nothing
   *                             is created until someone types a name and
   *                             presses Create, which is the same deliberate
   *                             act as opening the real dialog. Gating it only
   *                             made the feature unreachable: this URL is the
   *                             one way anybody who is not a fresh signup can
   *                             see it at all.
   *   step 1 of `full`          Get help -> Product Tour, run by someone who
   *                             already has workspaces and asked to SEE the
   *                             product, not to make another one. Mock — and
   *                             gated in the registry, which declares no
   *                             live_screens there.
   *
   * @param {Object} step a TOURS step
   * @returns {Number}
   */
  _screensFor(step) {
    return screensFor(step, this._canCreate());
  }

  /**
   * Is this the run that is allowed to create a real workspace?
   *
   * The standalone tour, however it was reached. `full` is excluded by the
   * registry rather than here — it simply declares no live tail.
   */
  _canCreate() {
    return this._tour.id === 'workspace';
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
    return buildStepWidgets(this, t, { canCreate: this._canCreate() });
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
    // `mark_on: 'success'` opts a tour OUT of being recorded here. The migrate
    // tour is the only one: it asks the user to create or upload something, and
    // someone who opened it and did neither has not been taught anything, so it
    // is offered again. Recorded by the in-window host when the action lands
    // (builtins/window/tutorial, _markDone) — this host has no live controls to
    // earn it with, so on the desk that tour simply stays armed.
    if (this._tour.flag && !this.mget('preview') && this._tour.mark_on !== 'success') {
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
   * The rail is NOT constant across a tour: `full` opens on the create-workspace
   * dialog, where no workspace exists and so the rail has no workspace tabs, and
   * then spends every later step inside one. Rendering the shell once at mount
   * left five workspace tabs over a dialog whose whole point is that the user
   * has not made a workspace yet.
   *
   * A `sys_pn` slot, re-fed here rather than rebuilt: the rail's logo and footer
   * do not change. What is fed is the slot's CONTENTS — feeding the container
   * itself back in would nest a second __sb-nav inside the first.
   *
   * It used to re-feed two more slots, the workspace crumb and the utility
   * cluster. Both belonged to the mock topbar, which no tour draws any more;
   * awaiting parts that never mount would simply hang.
   */
  _applyChrome() {
    const step = (this._tour.steps || [])[this._stepIndex];
    const { rail } = stepChrome(step);
    const sidebar = require('./skeleton/sidebar');
    // navItems, not railItems: the slot is replaced whole, so the org's Dept.
    // entry has to come back with the workspace tabs or the org-home rail —
    // which has no tabs at all — is fed an empty list and renders bare.
    this.ensurePart('rail-nav').then((p) => p.feed(sidebar.navItems(this, rail)));
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
    const { size, short } = tierFor(w, h);
    const changed = this.el.dataset.size !== size || this.el.dataset.short !== short;
    this.el.dataset.size = size;
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
      // WALKING THE WHOLE TOUR COUNTS AS DOING IT, for a tour that is recorded
      // on success rather than on sight.
      //
      // onDomRefresh deliberately skips markSeen for those (`mark_on:
      // 'success'` — the migrate tour), so that someone who opens one and does
      // nothing is offered it again. Nothing then recorded it here either, so a
      // user who walked every screen to the last Done was also offered it
      // again — and the topbar's "+ New" menu, which fires it on every open,
      // would have gone on doing so forever.
      //
      // Only this route. _skipTour is the Escape / skip path and leaves the
      // tour armed, which is the difference between finishing something and
      // getting out of it.
      if (this._tour.flag && !this.mget('preview') && this._tour.mark_on === 'success') {
        Tours.markSeen(this._tour.flag, this);
      }
      // Through _enterCreated, which opens the workspace the tour made before
      // taking the tour down. With none — every other tour — it is exactly
      // _enterWorkspace.
      this._enterCreated();
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
    // the one that can be pressed twice.
    // Without this the second press runs
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
    // Leaving early still lands the user in the workspace, if one was made.
    // Escape means "I am done with the tour", not "undo what I just built" —
    // and the alternative is the desk home with a new row in the sidebar and
    // no sign of where it went.
    this._openCreatedAndChain();
    this.softDestroy();
  }

  /**
   * Open the workspace the tour just made, and come down over it.
   *
   * NOTHING ELSE OPENS IT. The create broadcasts `workspace:refresh`, and the
   * only listeners are the sidebar's workspace list and the activate-workspace
   * flow — neither of which navigates. So a tour that ended here left the user
   * on the desk home looking at a list with a new row in it, rather than inside
   * the thing they had just been walked through making.
   *
   * Ordered deliberately: the workspace is opened FIRST and the tour torn down
   * after, so the fade reveals a workspace that is already there instead of a
   * blank desk that fills in afterwards.
   *
   */
  _enterCreated() {
    this._openCreatedAndChain();
    return this._enterWorkspace();
  }

  /**
   * Open the workspace, and hand on to the next tour only once it is actually
   * on screen.
   *
   * Not fire-and-hope: loadWorkspace returns the instant it is CALLED, which is
   * a different event from the workspace opening — it mounts the pane from
   * inside a media.attributes fetch. The next tour is drawn ON that pane, so
   * without this gate it would be handed a window that is not there yet, or one
   * that never arrives at all.
   *
   * Deliberately NOT awaited by the caller. The tour comes down on its own
   * schedule — the fade is what reveals the workspace underneath — so making
   * the teardown wait on the network would hold a dead tour on screen. This
   * runs alongside it and lands whenever the pane does.
   */
  _openCreatedAndChain() {
    return this._openCreated().then((pane) => {
      if (pane) this._chainMigrateTour(pane);
      return pane;
    });
  }

  /**
   * Hand the user on to the `migrate` tour, once they are standing in the
   * workspace this one just made.
   *
   * WHY HERE. The migrate tour teaches how files arrive in a workspace, and
   * the honest moment for that is the first time the user is looking at an
   * empty one — which is exactly this callback: the pane is confirmed on
   * screen (see _workspaceOnScreen; loadWorkspace has no completion signal of
   * its own, so it is polled for). It briefly hung off the rail's Files button
   * instead, which fired whenever the user happened to press Files, days later
   * and mid-task.
   *
   * DEFERRED TO THIS WIDGET'S DESTROY, not raised inline, and that is still
   * two independent reasons even though the delay on top of it is gone:
   *
   *   single-flight  libs/tutorial-tours holds `_inFlight` from the claim until
   *                  the running tour is released, and the desk wires that
   *                  release to this widget's destroy
   *                  (modules/desk/index.js, onPartReady "desk-tutorial").
   *                  Claiming now would hit `if (_inFlight) return false` and
   *                  be dropped in silence.
   *   the screen     this tour is still ON it while it fades.
   *
   * Ordering is not a coincidence either: the desk registers its release
   * handler on this same `destroy` event at mount, and handlers run in
   * registration order — so release has already cleared single-flight by the
   * time this one runs.
   *
   * NO DELAY ON TOP. There used to be a further 3s, on the reading that the
   * destroy fires into a desk still assembling itself. It does not: softDestroy
   * runs its 0.5s gsap fade and calls its `_fire` on the animation's onComplete
   * (ui-core letc/addons/backbone/view/utils.js), so `destroy` is raised AFTER
   * this tour has faded out and left the DOM, and the panes were confirmed up
   * before this method was ever reached (_workspaceOnScreen). So the 3s was
   * three seconds of empty desk between one tour and the next, and the hand-off
   * reads as one continuous walkthrough without it.
   *
   * IN THE WINDOW, NOT ON THE DESK. This used to `fire('migrate')`, which
   * broadcasts on the desk's tour channel and mounts `desk_tutorial` — a
   * second full-screen tour drawing its own mock desk, over the real workspace
   * that had just been made and opened. The migrate tour is about a folder
   * window, and there is now a host that draws a tour ON one
   * (builtins/window/tutorial), so it runs there: the user watches the tour
   * over the workspace they just created rather than over a picture of one.
   *
   * `pane.showTutorial(...)` rather than a broadcast built here, because that
   * is the product's own entry point for an in-window tour and it takes the
   * claim. Every gate therefore still stays where it belongs — kill switch,
   * mobile, the account-scoped seen-set, single-flight — and this method says
   * only "the moment has come". A user who has already seen `migrate` gets
   * nothing.
   *
   * Waiting for the fade matters more now than it did: the window underneath
   * is what the tour draws ON, and raising it earlier would put an in-window
   * tour beneath a full-screen one still fading off it.
   *
   * No `_canCreate()` check: the caller only reaches here with a pane, and a
   * pane only exists when a workspace was created, which only the `workspace`
   * tour's live screens do. One gate, in one place.
   *
   * @param {Object} pane the folder window of the workspace just created
   */
  _chainMigrateTour(pane) {
    if (this._migrateChained || !_.isFunction(this.once)) return;
    if (!pane || !_.isFunction(pane.showTutorial)) return;
    this._migrateChained = true;
    this.once(_e.destroy, () => {
      // `this` is gone by now — deliberately nothing off it is touched. The
      // pane was captured above and is the only thing this needs.
      try {
        if (pane.isDestroyed && pane.isDestroyed()) return;
        // `celebrate` is what makes this hand-off — and ONLY this hand-off —
        // throw the confetti on the migrate tour's first screen. A workspace
        // has just been made, opened and confirmed on screen; the same tour
        // raised from the rail has no such moment behind it.
        pane.showTutorial('migrate', { celebrate: 1 });
      } catch (e) {
        // A chained tour is never load-bearing for the tour that chained it.
      }
    });
  }

  /**
   * Open the workspace the tour made, and resolve with its pane once it is up.
   *
   * The descriptor is whatever libs/create-workspace normalised, and it is
   * already in the shape loadWorkspace wants for BOTH kinds: a hub is
   * `{hub_id, ...}`, and a personal workspace is the home-root folder row
   * (`{hub_id: Visitor.id, nid, area: personal}`) — the same explicit shape
   * desk's _workspaceTarget builds, so the folder opens rather than Home.
   *
   * @returns {Promise<Object|null>} the workspace pane, or null if it never
   *   arrived — the caller uses that to decide whether to hand on to the next
   *   tour, and it is the window that tour is drawn on.
   */
  _openCreated() {
    const ws = this._createdWorkspace || this._createdFromStep();
    if (!ws || !ws.hub_id || typeof Wm === 'undefined') return Promise.resolve(null);
    // Remembered either way: _skipTour and _enterCreated can both reach here,
    // and whichever arrives second must not open the workspace twice.
    this._createdWorkspace = ws;
    try {
      Wm.loadWorkspace(ws);
    } catch (e) {
      this.warn && this.warn('[tutorial] could not open the new workspace', e);
      return Promise.resolve(null);
    }
    return this._workspaceOnScreen(ws.hub_id);
  }

  /**
   * Ask the running step what it created, rather than waiting to be told.
   *
   * The step DOES tell us — it raises `workspace-created` the moment the create
   * resolves — and when that lands this is never called. But that raise goes
   * through ui-core's triggerHandlers, which is the CLICK dispatcher: it
   * returns without dispatching when `window.pointerDragged` is set
   * (letc/addons/letc.js), a flag the resize handler raises
   * (letc/addons/dom/events-handler.js, before its own `srcElement != window`
   * guard) and which nothing clears but a pointerup or a keyup.
   *
   * A raise straight out of a click is safe — the pointerup that delivered it
   * just cleared the flag. The create's raise is not: it happens after an
   * await on the network, and a resize anywhere in that round trip sets the
   * flag with nothing left to clear it. The raise is then dropped in silence,
   * and the tour ends having built a workspace it never opens.
   *
   * So the value is READ at the moment it is needed instead of being relied on
   * to have arrived. Both callers run while the step is still mounted —
   * _nextStep is reached from the step's own hand-back, and _skipTour from a
   * hotkey over a live tour — so `_created` is there to be read.
   *
   * @returns {Object|null} the workspace the step made, if it made one
   */
  _createdFromStep() {
    const part = this.getPart && this.getPart(_a.content);
    const step = part && part.children && part.children.last();
    const ws = step && !(step.isDestroyed && step.isDestroyed()) && step._created;
    return ws && ws.hub_id ? ws : null;
  }

  /**
   * Resolve once the workspace's pane is mounted — or with null if it is not.
   *
   * WATCHED, not awaited, because there is nothing to await: loadWorkspace
   * returns undefined and does its real work inside a media.attributes fetch,
   * calling an internal apply() that feeds the pane into headlessLayer. It has
   * no promise, no callback and no broadcast that means "this workspace is
   * open" — `workspace:focus` comes closest and is suppressed on exactly this
   * path, because apply() sets _curWorkspace BEFORE the pane mounts and
   * onWorkspaceRaised then sees sameContext and stays quiet.
   *
   * So the condition IS the evidence: Wm._findWorkspaceWindow is the accessor
   * loadWorkspace itself uses to decide whether a hub's pane already exists,
   * and it answers non-null only once apply() has fed it. Polled rather than
   * hooked so a failed open simply times out instead of leaving a listener
   * behind on a destroyed widget.
   *
   * Resolves immediately when the pane is already there — re-running the tour
   * against an existing workspace still hands on to the next one.
   *
   * @param {String|Number} hub_id
   * @returns {Promise<Object|null>}
   */
  _workspaceOnScreen(hub_id) {
    if (typeof Wm === 'undefined' || !_.isFunction(Wm._findWorkspaceWindow)) {
      return Promise.resolve(null);
    }
    const deadline = Date.now() + OPEN_WAIT_MS;
    return new Promise((resolve) => {
      const look = () => {
        let pane = null;
        try {
          pane = Wm._findWorkspaceWindow(hub_id);
        } catch (e) {
          return resolve(null);
        }
        if (pane) return resolve(pane);
        if (Date.now() >= deadline) {
          this.warn && this.warn('[tutorial] the new workspace never opened');
          return resolve(null);
        }
        setTimeout(look, OPEN_POLL_MS);
      };
      look();
    });
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
      // The step made a workspace. The host is what opens it and hands on to
      // the next tour, because both outlive the step — the tour is coming down
      // around them.
      case 'workspace-created': {
        const ws = args.workspace || {};
        if (ws.hub_id) this._createdWorkspace = ws;
        break;
      }

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
