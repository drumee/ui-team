require('./skin');
// The `.tutorial-main*` rules this widget's shell depends on — the responsive
// size tiers and `--pane-fit` — live ONLY in desk/tutorial/skin/index.scss,
// which is otherwise pulled into the bundle only when the desk tour itself
// mounts (no step skin and no spotlight skin imports it; they all start at
// `@use "mixins/drumee"`). Without this, a session where the desk tour never
// ran would find none of those rules in the document: an unstyled, unsized
// overlay, failing silently. A JS require rather than a sass @use, because
// webpack dedupes the module — both chunks loading it costs one copy of the
// CSS, where an @use would inline a second copy into this chunk.
require('desk/tutorial/skin');
const Tours = require('libs/tutorial-tours');
const { tour } = require('desk/tutorial/tours');
const { REFLOW_MS, tierFor, buildStepWidgets } = require('desk/tutorial/host-kit');

/**
 * A tour, run over a folder window instead of over a picture of the desk.
 *
 * `desk_tutorial` mounts into the desk's overlay and draws a full-screen MOCK
 * of the product — its own topbar, its own dark rail, its own breadcrumb — with
 * the step content in the middle. That is right for a tour raised from the desk
 * with nothing else on screen. It is wrong for a tour raised from a folder
 * window about that folder window, which is what this host is for: the thing
 * being explained is already there, so the tour is laid ON it.
 *
 * WHAT IT SHARES. Everything that matters to a step: the registry
 * (desk/tutorial/tours), the payload each step is fed (desk/tutorial/host-kit),
 * the spotlight widget, and the `next-step` / `back-step` / `end-tour` /
 * `spotlight:*` vocabulary. The six step widgets are used unmodified and do not
 * know which host they are in — which is the property that made a second host
 * cheap, and the property to preserve.
 *
 * WHAT IT DOES NOT HAVE.
 *
 *   mock chrome    no rail, no topbar, no _applyChrome. The real ones are
 *                  underneath.
 *   an exit path   `desk_tutorial` ends a tour by writing `tutorial_done`,
 *                  opening the workspace the tour created and chaining the
 *                  migrate tour. None of that means anything over a folder
 *                  window that is already open, and `tutorial_done` is
 *                  load-bearing for the seen-set inference — writing it because
 *                  someone dismissed a three-screen tour would be wrong. This
 *                  host dismisses itself and stops.
 *   live screens   `_canCreate()` is false, so the workspace tour's create form
 *                  and invite screen are dropped and every screen is a mock.
 *
 * SEEN-SET AND SINGLE-FLIGHT ARE SHARED, not forked: they live in
 * libs/tutorial-tours and belong to the ACCOUNT, so a tour seen here is
 * suppressed on the desk and the other way round. The claim is taken by the
 * folder window before this widget is fed (see __window_folder.showTutorial),
 * and released on this widget's destroy.
 */
class __window_tutorial extends LetcBox {

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    this._tour = tour(this.mget('tour'));
    // `canCreate: false` — no run of any tour creates anything in here. The
    // workspace tour's live tail is dropped, so its screen count and its
    // progress badge both shrink to the mock-only six.
    this._widgets = buildStepWidgets(this, this._tour, { canCreate: false });
    this._stepIndex = this._entryStep();
  }

  /**
   * Which step `?window_tutorial=<id>&step=<n>` asked to open on. 0 for every
   * normal run — nothing but the URL ever sets it.
   */
  _entryStep() {
    const raw = this.mget('enter_at_step');
    if (raw == null || raw === '') return 0;
    return Math.max(0, Math.min(this._widgets.length - 1, ~~raw - 1));
  }

  /**
   * The confetti, over the migrate tour's first step.
   *
   * WHY HERE. This is the arrival at the end of the post-signup walkthrough:
   * the workspace tour makes a workspace, opens it, comes down, and hands the
   * migrate tour to that window (desk/tutorial/index.js, _chainMigrateTour).
   * The burst belongs to that moment, so it is raised by the host that is on
   * screen when it plays rather than by the tour that ended.
   *
   * THE HOST IS THE CONDITION, not a flag. It used to arrive as a `celebrate`
   * model attribute, threaded from the handing-over tour through the broadcast
   * and buildStepWidgets down to the step — five places to carry one boolean.
   * Nothing else mounts `migrate` in a window, so asking which host we are in
   * answers the same question with none of that.
   *
   * NOT IN THE STEP. tutorial_migrate is drawn by both hosts and deliberately
   * knows about neither; a burst raised there would also fire on the desk-level
   * run, which no workspace precedes.
   *
   * ONLY ON THE FIRST STEP, so `?window_tutorial=migrate&step=2` — a QA link
   * into the middle of the tour — celebrates nothing. The migrate tour has one
   * step today, which is exactly why the guard is written down rather than
   * assumed.
   *
   * After the feed, so the pane it plays over is on screen.
   */
  _maybeCelebrate() {
    if (this._tour.id !== 'migrate' || this._stepIndex !== 0) return;
    require('desk/tutorial/confetti').celebrate(this);
  }

  onDomRefresh() {
    // The tour is on screen.
    //
    //   armed()    cancels the single-flight guard's fetch timer. From here only
    //              this widget's destroy releases the guard, so a slow chunk
    //              cannot let a second tour mount on top.
    //   markSeen() records the tour, once per user ever. Here and not at the
    //              trigger: a tour whose chunk failed to load never reaches this
    //              line and so is never burned. And not on completion either —
    //              a reload mid-tour would replay it indefinitely.
    Tours.armed();
    // A preview is exempt from the seen-set on the way IN, so burning the flag
    // on the way OUT is the wrong half of the same rule.
    // MOUNT-MARKING IS SKIPPED for a tour the registry says is earned rather
    // than shown (`mark_on: 'success'` — the migrate tour). Recording it here
    // would mean someone who opened it and did nothing never sees it again,
    // which is the opposite of what that tour is for. _markDone() records it
    // when the user actually creates or uploads something.
    if (this._tour.flag && !this.mget('preview') && this._tour.mark_on !== 'success') {
      Tours.markSeen(this._tour.flag, this);
    }
    this._bindEscape();
    this._applySize();
    this._observeSize();
    this.feed(require('./skeleton')(this));
    const entry = this.mget('enter_at_screen');
    this.ensurePart(_a.content).then((p) => {
      p.feed(this._widgetAt(this._stepIndex, entry ? { enter_at_screen: entry } : {}));
      this._maybeCelebrate();
    });
    this._preloadSteps();
  }

  /**
   * Pull the remaining step widgets down in the background, so pressing Next
   * renders from memory rather than from the network.
   *
   * Every step widget is a bare `import()` in seeds.js. Left alone, pressing
   * Next is the moment the chunk is requested: Kind.get() hands back the lazy
   * loader placeholder, which mounts EMPTY, waits on the network, then respawns
   * itself — and the spotlight is left measuring a placeholder while it happens.
   *
   * Fire and forget: a warm-up that fails costs nothing, because the step still
   * loads on demand exactly as it does today.
   */
  _preloadSteps() {
    if (typeof Kind === 'undefined' || !_.isFunction(Kind.waitFor)) return;
    for (const step of (this._tour.steps || []).slice(1)) {
      Promise.resolve(Kind.waitFor(step.kind)).catch((e) => {
        this.warn && this.warn(`[window-tutorial] could not preload ${step.kind}`, e);
      });
    }
  }

  /**
   * The feed payload for a step, with extra attributes merged in.
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
   * Stamp the size tier on the root, where every skin can see it.
   *
   * MEASURED FROM THIS WIDGET'S OWN BOX, which is the one real difference from
   * the desk host and the reason this method could not simply be inherited.
   * `desk_tutorial` reads window.innerWidth, which is the right question when
   * the tour IS the viewport. Here it is the wrong box by a wide margin: a
   * popup folder window is around 1000px on a 1920px screen, so the viewport
   * answers "wide", `--pane-fit` stays 1, and a 985px board mock is drawn at
   * full size inside a pane that cannot hold it.
   *
   * Two attributes rather than one combined class: width and height break the
   * layout independently, and a short WIDE overlay wants the wide composition
   * with less vertical padding, not the narrow one.
   *
   * @returns {Boolean} whether either value changed
   */
  /**
   * Lay this host over the window it is about.
   *
   * The tour is mounted in the DESK's overlay, not inside the folder window —
   * appending it to the window put it in that window's Marionette collection,
   * where any `feed()` (and a pane being opened is fed repeatedly while it
   * builds) silently dropped it. So the tour now owns a stable slot and takes
   * responsibility for its own geometry instead.
   *
   * Both rects are viewport-relative and the host is absolutely positioned
   * inside the overlay, so the window's box is expressed relative to the
   * overlay's — the same conversion `anchorFor` makes for the callout.
   *
   * @returns {Boolean} whether a target was found and applied
   */
  _syncToWindow() {
    const ws = this.mget('target_window');
    const el = ws && ws.el;
    if (!el || !el.isConnected || !this.el || !this.el.parentElement) return false;
    const box = el.getBoundingClientRect();
    const host = this.el.parentElement.getBoundingClientRect();
    if (!box.width || !box.height) return false;
    const st = this.el.style;
    st.position = 'absolute';
    st.left = `${box.left - host.left}px`;
    st.top = `${box.top - host.top}px`;
    st.width = `${box.width}px`;
    st.height = `${box.height}px`;
    // The window rounds its corners and the tour must not square them off.
    st.borderRadius = getComputedStyle(el).borderRadius;
    st.overflow = 'hidden';
    return true;
  }

  _applySize() {
    if (!this.el || !this.el.dataset || !this.el.getBoundingClientRect) return false;
    // Geometry first: the tier is measured from this host's box, and that box is
    // only right once it has been laid over its window.
    this._syncToWindow();
    this.el.dataset.tour = this._tour.id;
    // The tier rules are written `.tutorial-main[data-size="..."]`, so the bare
    // class has to sit on the same element as the attribute. desk_tutorial gets
    // it free because its widget family literally IS tutorial-main; this
    // widget's family is window-tutorial, so without this line every tier rule
    // and the whole --pane-fit scaling is dead code against an element the
    // selector never matches.
    this.el.classList.add('tutorial-main');
    const box = this.el.getBoundingClientRect();
    const { size, short } = tierFor(box.width, box.height);
    const changed = this.el.dataset.size !== size || this.el.dataset.short !== short;
    this.el.dataset.size = size;
    this.el.dataset.short = short;
    return changed;
  }

  /**
   * Re-measure the tour when the overlay changes shape.
   *
   * A ResizeObserver on this element, NOT a window resize listener. The desk
   * host can watch the window because its box IS the window; this one cannot.
   * A folder window is dragged, zoomed, tiled, snapped and un-zoomed — see
   * toggleZoom, tileToSide, _applyBounds and the `desk:chrome` re-fit in
   * builtins/window/folder — and not one of those raises a viewport event.
   *
   * The callout is placed from the rect of the thing it points at, read once
   * when the screen was raised, so a box that changes without this leaves the
   * card where the old layout put it: at worst off the edge with its buttons
   * out of reach. The current screen is therefore re-FOCUSED, not merely
   * restyled.
   *
   * Unconditionally, not only when the TIER changed: a resize within one tier
   * still moves everything the callout was measured against.
   */
  _observeSize() {
    const settle = () => {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => {
        if (this.isDestroyed && this.isDestroyed()) return;
        this._applySize();
        this.ensurePart('spotlight').then((s) => s && s.reflow && s.reflow());
      }, REFLOW_MS);
    };
    this._settleSize = settle;

    if (typeof ResizeObserver !== 'undefined' && this.el) {
      this._ro = new ResizeObserver(settle);
      this._ro.observe(this.el);
      // ALSO watch the window this tour is laid over. This host no longer lives
      // inside that window, so a window that is dragged, zoomed, tiled or
      // resized changes nothing about this element's own box — observing only
      // ourselves would leave the tour behind, still sitting where the window
      // used to be.
      const ws = this.mget('target_window');
      if (ws && ws.el) this._ro.observe(ws.el);
      return;
    }
    // No ResizeObserver: catch what a viewport event can still tell us. Strictly
    // worse — a window dragged or tiled inside a still viewport goes unseen —
    // but better than a callout that never re-places at all.
    if (typeof window === 'undefined') return;
    window.addEventListener('resize', settle);
    window.addEventListener('orientationchange', settle);
  }

  _unobserveSize() {
    clearTimeout(this._resizeTimer);
    if (this._ro) {
      this._ro.disconnect();
      this._ro = null;
    }
    if (typeof window !== 'undefined' && this._settleSize) {
      window.removeEventListener('resize', this._settleSize);
      window.removeEventListener('orientationchange', this._settleSize);
    }
    this._settleSize = null;
  }

  /**
   * Escape leaves the tour, exactly as the callout's skip control does.
   *
   * CAPTURE phase, deliberately. The desk already owns a bubble-phase Escape
   * (`desk-escape`, modules/desk/index.js) and its match guards on
   * `!e.defaultPrevented`, so a capture binding that reports it acted gets
   * preventDefault() from the hotkeys lib and the desk's handler then declines
   * the same keypress on its own terms.
   *
   * No live-screen guard, unlike the desk host: `canCreate` is false here, so
   * no screen is ever a form the user is filling in, and there is nothing an
   * accidental Escape can throw away that a reload would not.
   */
  _bindEscape() {
    const hotkeys = require('libs/hotkeys');
    this._escapeHotkey = hotkeys.register({
      name: `window-tutorial-escape-${this._id}`,
      phase: 'capture',
      match: (e) => e.key === 'Escape' && !e.defaultPrevented,
      run: () => {
        if (this.isDestroyed && this.isDestroyed()) return false;
        this._endTour();
        return true;
      },
    });
  }

  /**
   * Swap the step on screen: put the spotlight down, then bring the next one up.
   *
   * Ordered, and that ordering is the whole point. As two independent promise
   * chains, a step that mounted quickly raised `spotlight:focus`, had its
   * callout rendered, and then the previous step's stale clear landed and wiped
   * it — a tour with a scrim and no way forward.
   *
   * @param {Object} payload from _widgetAt
   */
  async _showStep(payload) {
    const spotlight = await this.ensurePart('spotlight');
    if (spotlight && spotlight.clear) await spotlight.clear();
    const content = await this.ensurePart(_a.content);
    content.feed(payload);
  }

  _nextStep() {
    this._stepIndex++;
    if (this._widgets[this._stepIndex]) {
      this._showStep(this._widgetAt(this._stepIndex));
      return;
    }
    // WALKING THE WHOLE TOUR COUNTS AS DOING IT. There is nothing past the last
    // step, so arriving here means the user pressed Done on it — which is a
    // completion, and for a `mark_on: 'success'` tour it has to be recorded
    // like one.
    //
    // Only this route. Escape and the callout's skip also end the tour and
    // reach _endTour directly; they leave it armed, which is the difference
    // between finishing something and getting out of it.
    this._markDone();
  }

  /**
   * Step back. No-op on the first step, where there is nothing to go back to.
   */
  _prevStep() {
    if (this._stepIndex <= 0) return;
    this._stepIndex--;
    // A step that runs internal screens must land on its LAST screen when
    // re-entered via Back — where the user left off, not back at the start.
    this._showStep(this._widgetAt(this._stepIndex, { enter_at_last: true }));
  }

  /**
   * Leave, however it was reached — the last Done, the callout's skip, Escape.
   *
   * All three are the same act HERE: there is no completion to record beyond
   * the mount-time markSeen, and the desk releases single-flight from this
   * widget's destroy, so every ending settles the guard the same way.
   *
   * A step that wants something to happen on the way out arranges it BEFORE
   * handing back — the migrate tour's last Done queues the real import dialog
   * against this release (see _openTheRealThing in desk/tutorial/migrate). This
   * method stays the plain exit the three endings share; it is not the place to
   * ask which one it was.
   *
   * softDestroy runs a 0.5s fade and raises `destroy` on its completion, so the
   * folder window is revealed underneath rather than snapping back.
   */
  _endTour() {
    if (this._exiting) return;
    this._exiting = true;
    this.softDestroy();
  }

  /**
   * Perform a real action on the window this tour is drawn over.
   *
   * Dispatched at that window's own `onUiEvent`, which is where the real menu's
   * rows land too — `sharebox` delegates the same way
   * (`this.wm.onUiEvent(cmd, { service })`). So a folder created from the tour
   * goes through the product's create dialog, and Upload opens the real file
   * picker, rather than the tour reimplementing either.
   *
   * The trigger passed along is this host: handlers read `cmd.mget(...)` off it
   * for a few services, and a live widget answering those is safer than a
   * literal.
   *
   * @param {String} action a service name the folder window handles
   * @param {Object} [cmd] the widget that was clicked. Forwarded as the
   *   handler's `cmd`, because the product reads its payload off the trigger —
   *   `newDocument` takes the file name from `cmd.mget(_a.name)`, so the row
   *   itself has to be what arrives, not this host.
   */
  _actOnWindow(action, cmd) {
    const ws = this.mget('target_window');
    if (!action || !ws || !_.isFunction(ws.onUiEvent)) return false;
    if (ws.isDestroyed && ws.isDestroyed()) return false;
    this._watchForSuccess(ws);

    // `add-folder` is intercepted, and it is the only one that has to be.
    //
    // It opens a DIALOG inside the folder window, and nothing in a window can
    // paint above this tour: `isolation: isolate` on the window manager's root
    // traps every layer inside it (wm/skin/index.scss), by design. Raising the
    // dialog cannot work, and neither can raising its window or its layer —
    // both are inside that same isolated context. So the tour draws the dialog
    // itself, at desk level, where it can actually be seen.
    //
    // The other two need nothing: `new-document` creates without a dialog, and
    // `_e.upload` opens the OS file picker, which is not ours to stack.
    if (action === 'add-folder') return this._openCreateFolder(ws);

    try {
      ws.onUiEvent(cmd || this, { service: action });
    } catch (e) {
      this.warn && this.warn(`[window-tutorial] "${action}" failed on the window`, e);
      return false;
    }
    return true;
  }

  /**
   * Draw the product's create-folder dialog, on top of this tour.
   *
   * The SAME skeleton the folder window uses, rendered with that window's own
   * BEM prefix so it takes the styles it already has — this is the product's
   * dialog in a different place, not a copy of it.
   *
   * @param {Object} ws the folder window the folder will be created in
   */
  _openCreateFolder(ws) {
    this._dialogFor = ws;
    return this.ensurePart('dialog').then((p) => {
      p.feed(require('builtins/window/folder/skeleton/create-folder-dialog')(this, {
        prefix: 'window-folder__create-folder',
      }));
      // Focus the field the way the window does: ensurePart resolves when the
      // EntryBox mounts, before its inner <input> exists.
      this.ensurePart('create-folder-name').then((entry) => _.delay(() => {
        const input = entry && entry.el && entry.el.querySelector('input');
        if (input) { input.focus(); input.select(); }
      }, 60));
    });
  }

  /**
   * Take the dialog down, leaving the tour as it was.
   *
   * Marked, then cleared on a timer, so the exit animation gets frames —
   * clearing on the spot destroys the element before a single one is painted
   * and only the entrance is ever seen. Same idiom, and the same 160ms, as
   * media/form's own close.
   *
   * A timer rather than `animationend`: reduced-motion disables the animation
   * outright, and that event would then never fire, leaving the dialog up
   * forever.
   */
  _closeCreateFolder() {
    this._dialogFor = null;
    const p = this.getPart && this.getPart('dialog');
    if (!p || !_.isFunction(p.clear)) return;
    const card = p.el && p.el.querySelector('.window-folder__create-folder-dialog');
    if (!card || !card.dataset) return p.clear();
    card.dataset.closing = '1';
    setTimeout(() => {
      if (this.isDestroyed && this.isDestroyed()) return;
      p.clear();
    }, 160);
  }

  /**
   * Hand the typed name to the window, which does the creating.
   *
   * `createFolderFromDialog` reads its value from `cmd.getValue()` before it
   * looks for its own part, so passing the entry widget is all it needs — the
   * validation, the destination node and the service call stay the window's,
   * and a folder made here is indistinguishable from one made any other way.
   *
   * @param {Object} entry the EntryBox that was submitted
   */
  /**
   * Hand the typed name to the window, which does the creating.
   *
   * THE ENTRY IS LOOKED UP, NOT TAKEN FROM THE TRIGGER. Two different widgets
   * raise `create-folder-submit` — the field, on Enter, and the Create button —
   * and only one of them has a value. Trusting the trigger therefore worked
   * from the keyboard and silently produced "New folder" from the button, which
   * is the way almost everyone submits.
   *
   * The window's own handler survives that through a second fallback,
   * `this.getPart("create-folder-name")` — but that reads the WINDOW's tree,
   * and this dialog is rendered in the tour's, so it finds nothing. Reading our
   * own part is the equivalent, and it does not care which control was used.
   *
   * Read BEFORE the dialog closes: clearing destroys the entry_reminder, whose
   * getValue() then returns undefined through a `_entry` that went with it.
   *
   * @param {Object} _trigger whatever raised the submit; deliberately unused
   */
  _submitCreateFolder(_trigger) {
    const ws = this._dialogFor;
    const entry = this.getPart && this.getPart('create-folder-name');
    const name = entry && _.isFunction(entry.getValue) ? entry.getValue() : null;
    this._closeCreateFolder();
    if (!ws || !_.isFunction(ws.createFolderFromDialog)) return;
    if (ws.isDestroyed && ws.isDestroyed()) return;
    // A stand-in carrying the value, because the real entry is gone by now.
    // createFolderFromDialog asks its `cmd` for exactly one thing —
    // `cmd.getValue()` — so this is the whole of what it needs, and the
    // validation, destination and service call all stay the window's.
    ws.createFolderFromDialog({ getValue: () => name });
  }

  /**
   * Record the tour as done once the window actually receives something.
   *
   * ONE OF THE TWO WAYS THIS TOUR IS COMPLETED — a folder created or files
   * uploaded. The other is walking it to the end, which _nextStep records.
   *
   * `newContent` is the folder window's arrival hook — a create and an upload
   * both land there — so it is the one honest signal that the user did the
   * thing rather than merely opening a dialog or a file picker they then
   * cancelled. That distinction is the whole point of marking this tour on
   * success: a cancelled picker must leave it armed for next time.
   *
   * Wrapped rather than listened to, because the window raises no event of its
   * own for this. Installed once, and it restores nothing — the wrapper calls
   * through and stays harmless for the life of the window.
   */
  _watchForSuccess(ws) {
    if (this._watching || !ws || !_.isFunction(ws.newContent)) return;
    this._watching = true;
    const original = ws.newContent.bind(ws);
    ws.newContent = (...a) => {
      const out = original(...a);
      this._markDone();
      return out;
    };
  }

  /**
   * The user did it. Record the tour and take it down.
   *
   * Only for a tour the registry marks on success, and never for a preview —
   * an explicitly requested run is exempt from the seen-set in both directions,
   * exactly as it is on the way in.
   */
  _markDone() {
    if (this._done) return;
    this._done = true;
    if (this._tour.flag && !this.mget('preview')) {
      Tours.markSeen(this._tour.flag, this);
    }
    this._endTour();
  }

  onBeforeDestroy() {
    this._unobserveSize();
    if (this._escapeHotkey) {
      require('libs/hotkeys').unregister(this._escapeHotkey);
      this._escapeHotkey = null;
    }
    if (super.onBeforeDestroy) super.onBeforeDestroy();
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.mget(_a.service);
    switch (service) {
      case 'next-step':
        this._nextStep();
        break;
      case 'back-step':
        this._prevStep();
        break;
      // Raised by the callout's skip control, which the spotlight wires at this
      // widget rather than at the step.
      case 'end-tour':
        this._endTour();
        break;
      // A step created a workspace. It cannot — canCreate is false — but the
      // case is named rather than left to `default`, so the event is swallowed
      // here instead of bubbling to the folder window as an unknown service.
      case 'workspace-created':
        break;
      // A step asking for a REAL action on the window underneath. The migrate
      // tour's + New rows and its Upload button raise this; the step names the
      // service and never learns which window it lands on.
      // The hosted dialog's own controls.
      case 'create-folder-submit':
        this._submitCreateFolder(trigger);
        break;
      case 'close-folder-dialog':
        this._closeCreateFolder();
        break;

      case 'window-tutorial:act':
        this._actOnWindow(args.action, args.cmd);
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

module.exports = __window_tutorial;
