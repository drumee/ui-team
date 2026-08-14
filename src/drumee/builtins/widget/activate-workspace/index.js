/**
 * Workspace activation flow.
 *
 * A two-step walkthrough that takes a brand-new account from an empty desk to
 * a workspace with a file in it. It runs once, straight after the product tour
 * (see modules/desk `_maybeStartActivateWorkspace`), and it is the tour's
 * practical half: the tour SHOWS the product on a mock desk, this one has the
 * user build the real thing.
 *
 *   step1        → "Create your workspace", informational
 *   step1_guide  → the walkthrough that creates it (see guide-create.js). It
 *                  spotlights the real desk chrome — New → Workspace → the
 *                  form — and ends when the workspace exists, whichever type
 *                  the user picked
 *   step2        → "Open workspace", which reopens what Step 1 created
 *   step2_guide  → the walkthrough inside that workspace (see guide-upload.js):
 *                  + New → From device → the upload → the files panel it
 *                  landed in. The last Next ends the flow
 *   done         → modal, then the flow closes for good
 *
 * WHAT THIS IS NOT. It descends from the reward flow (builtins/widget/
 * reward-flow), which walks the same two surfaces for the "Claim your free
 * storage" campaign, and the two share their engine (libs/guided-flow). It
 * does NOT share the campaign: there is no eligibility gate, no email CTA to
 * arrive from, no capped slot to win, and nothing to report to a funnel. It is
 * onboarding, so the only thing it can cost a user who walks away is the
 * walkthrough itself.
 *
 * That is why there is no exit guard here. reward-flow traps F5, the Back
 * button and the tab close, because abandoning it forfeits a prize the user is
 * three clicks from claiming, and a stray refresh must not do that. Nothing is
 * forfeit here, so the browser's own controls are left alone: a refresh
 * mid-flow simply lands the user back on their desk, with whatever they have
 * already built still there. The one guard kept is the in-app one — clicking
 * the dimmed backdrop asks before tearing the walkthrough down, because that
 * click is as often a miss as a decision.
 *
 * And no resume. The flow is one session long: a reload ends it rather than
 * picking it up at Step 2, so nothing about it is persisted — not the step,
 * not the workspace. See the design doc,
 * docs/superpowers/specs/2026-08-13-activate-workspace-design.md
 */
const { dropModal, doneModal } = require("./skeleton/modal");
const { baseStep, isGuiding } = require("../../../libs/guided-flow/steps");
const { readDescriptor } = require("../../../libs/guided-flow/descriptor");
const { coachAnchor, coachCenter } = require("../../../libs/guided-flow/anchor");

/**
 * How long "Open workspace" waits for the workspace window before handing the
 * user back their card to try again. Loading is a fetch plus a mount; anything
 * past this is a failure, not slowness.
 */
const OPEN_WORKSPACE_TIMEOUT_MS = 4000;

class __activate_workspace extends LetcBox {
  static initClass() {
    require("./skin");
  }

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();

    this._step = "step1";
    this._modalOpen = false;
    this._dropGuardOpen = false;
    // The workspace Step 1 created, which Step 2 reopens. Memory only: the flow
    // does not survive a reload by design, so persisting it would write a key
    // that nothing ever reads back.
    this._workspace = null;

    // The completion signal for Step 2. Fires per FILE, so the upload guide —
    // not this — decides what it means: it has two beats left to run.
    this._onUploaded = () => this.onUploadDone();
    if (typeof RADIO_MEDIA !== "undefined") {
      RADIO_MEDIA.on(_e.uploaded, this._onUploaded);
    }

    // media_form broadcasts "workspace:refresh" after desk.create_hub succeeds
    // (and after the create-folder path a personal workspace takes) — the
    // completion signal for Step 1.
    this._onWorkspaceRefresh = (payload) => this.onWorkspaceCreated(payload);
    if (typeof RADIO_BROADCAST !== "undefined") {
      RADIO_BROADCAST.on("workspace:refresh", this._onWorkspaceRefresh);
    }
  }

  onDomRefresh() {
    this._captureHost();
    this._portalToBody();
    this._render();
  }

  /**
   * The flow is fed into the desk `overlay` part — a full-viewport backdrop
   * that, when open, is `pointer-events:auto` and would swallow clicks meant
   * for the real desk chrome the walkthrough points at (the vignette/cutout are
   * `pointer-events:none` and pass the click down, but the overlay element then
   * catches it). Neutralise its pointer-events while we're active. Captured
   * BEFORE the portal below, while our root is still inside it.
   */
  _captureHost() {
    if (!this.el || !this.el.closest) return;
    const host = this.el.closest(".desk-module__overlay");
    if (!host || !host.style) return;
    this._host = host;
    this._hostPE = host.style.pointerEvents;
    host.style.pointerEvents = "none";
  }

  /**
   * Re-parent our root to document.body. The desk `overlay` part is a stacking
   * context nested (z 10010) far below the window-manager wrapper-modal that
   * hosts the create-workspace form (--z-index-modal, 100000). Trapped inside
   * the overlay, NO z-index on the flow can lift the coach above that modal,
   * and its Back would be unclickable. At document.body the root escapes every
   * desk stacking context and its own z-index competes at the true document
   * root (see skin). Event routing is unaffected (uiHandler is a JS reference).
   */
  _portalToBody() {
    if (!this.el || typeof document === "undefined") return;
    if (this.el.parentElement !== document.body) {
      document.body.appendChild(this.el);
    }
  }

  _restoreHost() {
    const host = this._host;
    if (!host || !host.style) return;
    host.style.pointerEvents = this._hostPE || "";
    this._host = null;
  }

  onBeforeDestroy() {
    this._unbind();
  }

  _unbind() {
    if (this._onUploaded && typeof RADIO_MEDIA !== "undefined") {
      RADIO_MEDIA.off(_e.uploaded, this._onUploaded);
      this._onUploaded = null;
    }
    if (this._onWorkspaceRefresh && typeof RADIO_BROADCAST !== "undefined") {
      RADIO_BROADCAST.off("workspace:refresh", this._onWorkspaceRefresh);
      this._onWorkspaceRefresh = null;
    }
    this._stopCreateGuide();
    this._stopUploadGuide();
    this._clearOpenTimer();
    this._restoreHost();
  }

  // ───────── walkthroughs ─────────

  /**
   * Lazily build and start the Step 1 walkthrough. `./guide-create` is required
   * lazily so this orchestrator stays requirable (and unit-testable) under
   * Node — the guide no-ops when there is no DOM.
   *
   * @param {String} [pinAt] sub-step to hold until its surface is on screen.
   *   Unused today; kept because pinAt is how a caller that re-opens a surface
   *   itself keeps the guide from reconciling into the gap first.
   */
  _startCreateGuide(pinAt) {
    // Each run establishes its own workspace. Back → Continue restarts Step 1
    // and the user may pick a different type this time, so the previous
    // attempt's result must not carry over.
    this._workspace = null;
    if (!this._createGuide) {
      const { ActivateCreateGuide } = require("./guide-create");
      this._createGuide = new ActivateCreateGuide(this);
    }
    // Before start(), which reconciles once as it comes up: the pin is what
    // that first pass reads, so setting it after would be too late.
    if (pinAt) this._createGuide.pinAt(pinAt);
    this._createGuide.start();
  }

  _stopCreateGuide() {
    if (this._createGuide) this._createGuide.stop();
  }

  /** Lazily build and start the Step 2 walkthrough, for the same reason. */
  _startUploadGuide() {
    if (!this._uploadGuide) {
      const { ActivateUploadGuide } = require("./guide-upload");
      this._uploadGuide = new ActivateUploadGuide(this);
    }
    this._uploadGuide.start();
  }

  _stopUploadGuide() {
    if (this._uploadGuide) this._uploadGuide.stop();
  }

  /**
   * Give up on a workspace window that never appeared and hand the user back
   * the Step 2 card, whose button asks for it again.
   *
   * The descriptor is deliberately KEPT, unlike reward-flow's equivalent, which
   * drops it and falls through to a card that uploads from the desk topbar
   * instead. There is no such fallback here — Step 2 exists to put the file in
   * the workspace Step 1 made — so forgetting it would leave a card whose only
   * button has nothing to open. A retry is the better failure.
   */
  _armOpenTimer() {
    this._clearOpenTimer();
    this._openTimer = setTimeout(() => {
      this._openTimer = null;
      if (this._step !== "step2_guide") return;
      if (this._uploadGuide?._sub) return; // it landed
      this._stopUploadGuide();
      this._goto("step2");
    }, OPEN_WORKSPACE_TIMEOUT_MS);
  }

  _clearOpenTimer() {
    if (this._openTimer) {
      clearTimeout(this._openTimer);
      this._openTimer = null;
    }
  }

  /**
   * Close the workspace this flow opened, as the closing modal appears.
   *
   * Drives the window's OWN close service rather than calling
   * Desk.onWorkspaceClosed() or clearing headlessLayer directly: window_folder
   * counts the surviving workspace tabs first and only tears the desk back down
   * to "no workspace open" (breadcrumb, sidebar tree, layer) when this was the
   * last one. A user who already had other workspaces open keeps them.
   */
  _closeWorkspace() {
    if (!this._workspace || typeof Wm === "undefined") return;
    if (typeof Wm._findWorkspaceWindow !== "function") return;
    const pane = Wm._findWorkspaceWindow(this._workspace.hub_id);
    if (!pane || pane.isDestroyed?.()) return;
    if (typeof pane.onUiEvent !== "function") return;
    // `cmd` is never dereferenced on this path: folder/index.js resolves the
    // service from args first (`args.service || cmd.service || cmd.mget(...)`),
    // and the base handler reads only `this`.
    pane.onUiEvent({}, { service: _e.close });
  }

  /**
   * Close the upload-progress window.
   *
   * Driven through the window's own close service so it unregisters from the
   * pool instead of just leaving the DOM. Called when Step 2's walkthrough
   * rewinds off a failed upload: those failed rows are what the guide reads as
   * "still failing", so the window has to go for the rewind to land anywhere.
   */
  closeUploadProgress() {
    if (typeof Wm === "undefined" || typeof Wm.getItemsByKind !== "function") {
      return;
    }
    const wins = Wm.getItemsByKind("window_upload_progress") || [];
    for (const w of wins) {
      if (!w || w.isDestroyed?.() || typeof w.onUiEvent !== "function") continue;
      w.onUiEvent({}, { service: _e.close });
    }
  }

  /**
   * Close the create-workspace modal. The form is fed into Wm's `wrapper-modal`
   * part, so clearing that part closes it.
   *
   * Driven directly rather than by clicking the form's close button: the
   * framework debounces EVERY widget click globally for 300ms (letc
   * __handleClick shares one `_clickTimestap`), so a synthetic click issued
   * from within the user's own Back click is silently swallowed.
   */
  closeCreateForm() {
    if (typeof Wm === "undefined" || typeof Wm.ensurePart !== "function") return;
    Wm.ensurePart("wrapper-modal").then((p) => {
      if (typeof p?.clear === "function") p.clear();
    });
  }

  /**
   * Empty the shared wrapper-modal AND mark it closed.
   *
   * Emptying alone is not enough: with content gone but `data-state="open"`
   * still set, that host stays a full-viewport invisible blocker over the desk.
   */
  _clearWrapperModal() {
    if (typeof Wm === "undefined" || !Wm.__wrapperModal) return;
    Wm.__wrapperModal.clear();
    if (Wm.__wrapperModal.el?.dataset) {
      Wm.__wrapperModal.el.dataset.state = "closed";
      delete Wm.__wrapperModal.el.dataset.guidedOverlay;
    }
  }

  /** Open/close the topbar Add-new dropdown (the desk owns the `addmenu` part).
   *  The `guided-*` services are the desk's generic names for these two, which
   *  it answers alongside the `reward-*` originals — see its onUiEvent. */
  setAddMenu(open) {
    this.triggerHandlers({ service: "guided-set-add-menu", open: !!open });
  }

  /** Expand/collapse the create flyout inside the merged topbar New menu. */
  setNewCreateMenu(open) {
    this.triggerHandlers({
      service: "guided-set-new-create-menu",
      open: !!open,
    });
  }

  /**
   * Paint the spotlight cutout over `rect` (a viewport-space DOMRect) and feed
   * the coach tooltip. Called by a guide as it walks the live desk chrome.
   *
   * @param {DOMRect} rect
   * @param {{text: string, showBack?: boolean, showNext?: boolean,
   *          nextDisabled?: boolean, above?: boolean, radius?: string,
   *          hole?: boolean}} opt
   */
  spotlight(rect, opt = {}) {
    if (!this.el) return;
    const {
      text, showBack = true, showNext = false, nextDisabled = false,
      above = false, radius = "", hole = true,
    } = opt;
    const cx = rect.left + rect.width / 2;
    if (hole === false) {
      // Dim EVERYTHING, spotlight nothing. A zero-size cutout still spreads its
      // 100vmax box-shadow over the whole viewport (see skin __cutout), and the
      // guide-scrim's clip-path hole collapses with it so every click is
      // caught. For a sub-step that only asks the user to read: cutting the
      // surface out would leave it fully lit — and when that surface is a
      // workspace window filling the screen, nothing would be dimmed at all.
      this.el.style.setProperty("--cut-x", "50vw");
      this.el.style.setProperty("--cut-y", "50vh");
      this.el.style.setProperty("--cut-w", "0px");
      this.el.style.setProperty("--cut-h", "0px");
      this.el.style.setProperty("--cut-radius", "0px");
    } else {
      // Rectangular cutout: clear the target's rect and dim only the rest — no
      // highlight ring. It matches the target's box and rounding EXACTLY:
      // padding it out would leak an undimmed ring of background around the
      // target, and a mismatched radius would show bright corners.
      this.el.style.setProperty("--cut-x", `${rect.left}px`);
      this.el.style.setProperty("--cut-y", `${rect.top}px`);
      this.el.style.setProperty("--cut-w", `${rect.width}px`);
      this.el.style.setProperty("--cut-h", `${rect.height}px`);
      this.el.style.setProperty("--cut-radius", radius || "4px");
    }
    // Nothing is spotlighted → there is no target to sit beside, so centre it.
    const anchor = hole === false
      ? coachCenter()
      : coachAnchor(rect, cx, { prefAbove: above });
    this.ensurePart("guide-callout").then((p) => {
      if (!p) return;
      p.feed(
        require("../../../libs/guided-flow/coach")(this, {
          text,
          style: anchor.style,
          side: anchor.side,
          showBack,
          showNext,
          nextDisabled,
          backService: "activate-back",
          nextService: "activate-guide-next",
        }),
      );
    });
  }

  /** Remove the coach callout. feed(null) does NOT empty a part — prepareData
   *  wraps null into [null], so the coach would be left on screen. Reset the
   *  collection instead (same rationale as _closeDropGuard). */
  clearSpotlight() {
    this.ensurePart("guide-callout").then((p) => {
      if (!p) return;
      if (typeof p.collection?.reset === "function") {
        p.collection.reset();
      } else if (typeof p.feed === "function") {
        p.feed(null);
      }
    });
  }

  // ───────── skeleton accessors ─────────

  getStep() { return this._step; }

  /** True once Step 1 has left us a workspace to reopen. Read by the skeleton,
   *  which lifts the root clear of the workspace window while one is open. */
  hasWorkspace() { return !!this._workspace; }

  // ───────── state ─────────

  _render() {
    this.feed(require("./skeleton")(this));
  }

  /** Move to `step` and re-render. Nothing is persisted: the flow is one
   *  session long, and a reload ends it rather than resuming it. */
  _goto(step) {
    this._step = step;
    this._render();
  }

  // ───────── external completion signals ─────────

  /**
   * A workspace was created (media_form → the RADIO_BROADCAST
   * "workspace:refresh" this subscribes to). Only meaningful while guiding.
   *
   * Every workspace type ends Step 1 here — personal, internal (team) and
   * external (share) alike. reward-flow splits them because its Step 2 invites
   * members, so the permission panel that follows an internal create IS its
   * next step and the flow has to be handed to it. Step 2 here is an upload,
   * which no branch can satisfy early, so all three simply carry on: the guide
   * sees the follow-up panel through its perm phase (the user still has to
   * close it) and completes.
   */
  onWorkspaceCreated(payload) {
    if (this._step !== "step1_guide") return;
    // Remember it for Step 2, which reopens this exact workspace. media_form
    // sends the descriptor on both creation paths.
    const ws = readDescriptor(payload?.workspace);
    if (ws) this._workspace = ws;
    if (payload?.personal) {
      // A personal workspace is a folder at the home root, not a hub: nothing
      // opens after it, so there is no perm phase to wait through. Routed
      // through the same completion as the other two branches so the
      // no-descriptor case is handled in one place.
      return this.onCreateGuideComplete();
    }
    // The area picks the guide's safety budget for the follow-up surface: the
    // external branch's is a lazily imported window and needs far longer than
    // the internal branch's panel. Passed even when the descriptor was
    // unusable (undefined → the guide waits the long budget).
    if (this._createGuide) this._createGuide.onWorkspaceCreated(ws?.area);
    else this.onCreateGuideComplete();
  }

  /**
   * The Step 1 walkthrough is done — the workspace exists and any follow-up
   * panel has been closed.
   *
   * A run that arrives here with no descriptor stops here too. All three create
   * paths broadcast one (media_form sends hub_id and nid on each), so this means
   * a payload that came back without the ids — and Step 2 is nothing but
   * "reopen that workspace and upload into it", so its card would carry a button
   * that cannot act. Ending quietly is the honest outcome: the workspace the
   * user just made is real and is theirs, and neither a dead card nor a closing
   * modal claiming a file was uploaded would be true.
   */
  onCreateGuideComplete() {
    if (this._step !== "step1_guide") return;
    this._stopCreateGuide();
    if (!this._workspace) return this._finish();
    this._goto("step2");
  }

  /**
   * A file upload completed — the LAST step, but not the end of it.
   *
   * The walkthrough has two beats left, spotlighting the upload in progress and
   * then the files panel it landed in (see guide-upload). Finishing here would
   * tear the workspace down in the same frame the first file arrived, so the
   * user never sees the thing the whole step was for. The guide's last Next
   * comes back through onUploadGuideComplete.
   */
  onUploadDone() {
    if (this._step !== "step2_guide") return;
    if (this._uploadGuide) this._uploadGuide.onUploaded();
  }

  /** The Step 2 walkthrough's final beat was dismissed — the user has seen
   *  their files. Called by the guide's Next on the "files" sub-step. */
  onUploadGuideComplete() {
    if (this._step !== "step2_guide") return;
    this._complete();
  }

  /**
   * Both steps are done: close the workspace the flow opened and show the
   * closing modal.
   *
   * The workspace goes because the flow opened it, not the user — the desk is
   * handed back at Home, the way they left it. Unlike reward-flow's equivalent
   * there is nothing to claim and nobody to ask, so this is the whole ending.
   */
  _complete() {
    this._stopUploadGuide();
    this._clearOpenTimer();
    this._closeWorkspace();
    this._step = "done";
    // Re-render BEFORE opening the modal. stop() only clears the coach; the
    // cutout and the full-viewport __guide-scrim stay in the markup, and a
    // guiding root outranks the wrapper-modal that hosts the modal — leaving
    // them would grey the card out and eat its button.
    this._render();
    // "bare": the re-render above leaves a full-viewport vignette behind the
    // modal, so the wrapper-modal must not stack a second dim on top of it.
    if (!this._openModal(doneModal(this), "bare")) this._finish();
  }

  // ───────── modals ─────────

  /**
   * @returns {boolean} false when there is no modal host to render into —
   *   callers decide whether that is fatal for their step.
   */
  _openModal(tree, overlay = "1") {
    if (typeof Wm === "undefined" || !Wm.__wrapperModal) return false;
    Wm.__wrapperModal.feed(tree);
    Wm.__wrapperModal.el.dataset.state = "open";
    Wm.__wrapperModal.el.dataset.overlay = "blur";
    // Align the backdrop with the flow's own dim (--overlay-bg) instead of the
    // app's frosted-glass blur, so the modal reads as part of the same overlay
    // as the vignette. "bare" when the flow root is ALREADY painting a
    // full-viewport vignette behind it: the glass still has to go, but a second
    // dim of the same colour would just double the darkness. See the skin.
    Wm.__wrapperModal.el.dataset.guidedOverlay = overlay;
    this._modalOpen = true;
    return true;
  }

  _closeModal() {
    if (!this._modalOpen) return;
    if (typeof Wm !== "undefined" && Wm.__wrapperModal) {
      Wm.__wrapperModal.clear();
      Wm.__wrapperModal.el.dataset.state = "closed";
      delete Wm.__wrapperModal.el.dataset.overlay;
      delete Wm.__wrapperModal.el.dataset.guidedOverlay;
    }
    this._modalOpen = false;
  }

  /**
   * Open the "Leave setup?" guard into the flow's OWN `drop-modal` part rather
   * than Wm.__wrapperModal, because during the Step 1 walkthrough that
   * wrapper-modal is holding the create-workspace form — feeding the guard
   * there would replace the form and discard the name the user has typed,
   * which is precisely what a "Continue" has to preserve.
   *
   * The root sits below the wrapper-modal (z 10020 vs 100000), so lift it while
   * the guard is up or the guard paints UNDER the very surface it is guarding.
   * Set imperatively, like the --cut-* vars: raising the guard must not
   * re-render the flow.
   */
  _openDropGuard() {
    this._dropGuardOpen = true;
    this._markRootDrop(true);
    this.ensurePart("drop-modal").then((p) => {
      if (!p) return;
      // Feed first, then flag open — the modal opts its own pointer events back
      // in (see skin __modal), so it stays clickable regardless; data-open only
      // drives the host's backdrop dim, and setting it after feed keeps a
      // re-render from wiping it.
      p.feed(dropModal(this));
      if (p.el?.dataset) p.el.dataset.open = "1";
    });
  }

  _closeDropGuard() {
    this._dropGuardOpen = false;
    this._markRootDrop(false);
    this.ensurePart("drop-modal").then((p) => {
      if (!p) return;
      // feed(null) does NOT empty a part: prepareData wraps null into [null], so
      // the modal is left in place. Reset the collection to actually remove it.
      if (typeof p.collection?.reset === "function") {
        p.collection.reset();
      } else if (typeof p.feed === "function") {
        p.feed(null);
      }
      if (p.el?.dataset) delete p.el.dataset.open;
    });
  }

  /**
   * Flag the flow ROOT while the guard is up.
   *
   * `data-drop` turns the flow's own dim off, because the guard's backdrop is
   * now supplying one and two of them are not one colour (see the skin), and
   * lifts the root: the guard renders inside our stacking context, so it cannot
   * climb over the wrapper-modal it is guarding on its own.
   *
   * The skeleton's root box is fed as a child of our element; falling back to
   * the element itself keeps this working if it is ever the root, since the
   * rules match on the class either way.
   */
  _markRootDrop(on) {
    const root =
      this.el?.querySelector?.(`.${this.fig.family}__root`) || this.el;
    if (!root?.dataset) return;
    if (on) {
      root.dataset.drop = "1";
      return;
    }
    delete root.dataset.drop;
  }

  /**
   * Final exit — from "Leave setup", or the closing modal's button.
   *
   * Nothing is written anywhere. The flow runs once because it is chained to
   * the end of the product tour and nothing else re-triggers it, so there is no
   * latch to set; and a user who leaves it has lost nothing that a latch would
   * need to remember.
   */
  _finish() {
    // Once. Both the guard's "Leave setup" and the closing modal's button land
    // here, and either can be clicked twice before the teardown below has run.
    if (this._finishing) return;
    // Latched BEFORE the surfaces are cleared, so anything that calls back into
    // the flow as they come down finds a flow on its way out.
    this._finishing = true;
    this._closeModal();
    // Stop the walkthroughs BEFORE tearing their surfaces down: a guide's
    // observer would otherwise read the create form vanishing as the user
    // having closed it, and complete a step on a flow that is already leaving.
    this._unbind();
    this._closeHandoffSurfaces();
    this.softDestroy();
  }

  /**
   * Take down the surfaces the flow HANDED THE USER TO, on the way out.
   *
   * Reached from "Leave setup". None of them is ours — they are other widgets,
   * opened because the walkthrough walked the user into them — but that is
   * exactly why they cannot be left behind: they strand on a desk whose flow no
   * longer exists, with nothing left to close them. For the wrapper-modal it is
   * worse than untidy: emptied and still `data-state="open"` it is an invisible
   * full-viewport blocker over the desk.
   *
   * Gated on the step, so an exit from anywhere else — the closing modal's own
   * button — cannot reach in and shut something the user opened for themselves.
   */
  _closeHandoffSurfaces() {
    if (this._step === "step1_guide") {
      // The create-workspace form, or the permission panel that follows it —
      // media_form feeds `permission_restricted` into this same host.
      this._clearWrapperModal();
      // The external ("share") branch opens the secure-share dock as a real
      // WINDOW (media_form → Wm.launch), not into the wrapper-modal, so
      // clearing that host does not touch it. Same sub-step, same abandonment,
      // same orphan.
      this._closeSecureShare();
      return;
    }
    // The workspace window, and anything still uploading into it. Both are the
    // flow's doing — the user did not open them, "Open workspace" did.
    if (baseStep(this._step) === "step2") {
      this.closeUploadProgress();
      this._closeWorkspace();
    }
  }

  /** Close the secure-share dock the Step 1 create step may have launched.
   *  Driven through the window's own close service, like _closeWorkspace, so it
   *  unregisters from the pool instead of just leaving the DOM. During the
   *  walkthrough the flow owns the screen, so any such window is the one that
   *  step just opened. */
  _closeSecureShare() {
    if (typeof Wm === "undefined" || typeof Wm.getItemsByKind !== "function") {
      return;
    }
    const wins = Wm.getItemsByKind("window_secure_share") || [];
    for (const w of wins) {
      if (!w || w.isDestroyed?.() || typeof w.onUiEvent !== "function") continue;
      w.onUiEvent({}, { service: _e.close });
    }
  }

  /**
   * Reopen the workspace Step 1 created, so the upload lands there.
   *
   * loadWorkspace is the same entry point the sidebar rows use; it resolves the
   * root and mounts the workspace pane.
   *
   * @returns {Boolean} false when there is nothing to open — the card stays put
   *   rather than starting a walkthrough with no workspace to walk.
   */
  _openWorkspace() {
    if (!this._workspace) return false;
    if (typeof Wm === "undefined" || typeof Wm.loadWorkspace !== "function") {
      return false;
    }
    Wm.loadWorkspace({ ...this._workspace });
    return true;
  }

  // ───────── event routing ─────────

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd?.mget?.(_a.service);
    switch (service) {
      case "activate-continue":
        // Step 1's primary action: start the walkthrough that spotlights the
        // real desk chrome (New → Workspace item → the form) and lets the user
        // create the workspace themselves. onWorkspaceCreated ends it.
        if (isGuiding(this._step)) return;
        this._goto("step1_guide");
        this._startCreateGuide();
        return;

      case "activate-open-workspace":
        // Step 2's primary action. The walkthrough starts either way: the
        // window may already be open (the user pressed Back out of the
        // walkthrough and came forward again), and loadWorkspace declining is
        // not a reason to withhold the guide from a workspace that is on
        // screen. The open timer catches the case where nothing mounts.
        if (!this._openWorkspace()) return;
        this._goto("step2_guide");
        this._startUploadGuide();
        this._armOpenTimer();
        return;

      case "activate-guide-next":
        // Step 2's read-only beats carry a Next, having no real action to
        // observe: "folder" (this is your workspace) walks on to "+ New", and
        // "files" (here is what you uploaded) ends the walkthrough.
        if (this._uploadGuide) this._uploadGuide.onNext();
        return;

      case "activate-back": {
        // Inside a walkthrough, Back steps back one sub-step where it can. Only
        // when there is nothing earlier does it tear the walkthrough down and
        // return to the card it started from.
        if (this._step === "step1_guide") {
          if (this._createGuide?.back()) return;
          this._stopCreateGuide();
          return this._goto("step1");
        }
        if (this._step === "step2_guide") {
          // One beat has a step-back of its own: a failed upload rewinds to the
          // "+ New" pill so the user can try again (see guide-upload's back()).
          // Everywhere else Back leaves the walkthrough for the card, workspace
          // still open — which is why the card's own controls do not include a
          // Back of their own.
          if (this._uploadGuide?.back()) return;
          this._stopUploadGuide();
          this._clearOpenTimer();
          return this._goto("step2");
        }
        return;
      }

      case "activate-vignette-click":
        // Inert when a modal is already up. EVERY other state raises the same
        // guard, the one in our own root — the walkthroughs, whose
        // __guide-scrim fires this, and the card steps alike. It is
        // position:fixed and the root lifts above the desk, so its dim covers
        // the sidebar and the topbar as well as the work area.
        if (this._modalOpen || this._dropGuardOpen) return;
        this._openDropGuard();
        return;

      case "activate-drop-stay":
        // The guard lives in our own root, so closing it just hands the user
        // back what was underneath: the card, or the walkthrough mid-step with
        // whatever they had typed in the create form. Nothing was torn down, so
        // there is nothing to restore.
        this._closeDropGuard();
        return;

      case "activate-drop-leave":
        // No status to report and nothing to wait for, so unlike reward-flow's
        // equivalent this leaves immediately.
        return this._finish();

      case "activate-finish":
        // The closing modal's only button.
        return this._finish();

      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }
}

__activate_workspace.initClass();
module.exports = __activate_workspace;
