class __form_folder extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._status = "team";
  }

  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.get(_a.service);
    switch (service) {
      case _e.close: {
        // Still clear() and not goodbye(): goodbye removes silently, leaving
        // the wrapper's data-state stuck and breaking subsequent open clicks.
        // clear() resets the collection so the wrapper can re-render.
        //
        // What changed is only WHEN. Clearing synchronously destroyed the
        // element on the spot, so the exit animation never got a frame. The
        // element is marked instead, and the same clear() runs once the
        // animation has had its 160ms.
        if (this._closing) return;
        this._closing = 1;
        const done = () => {
          if (this.parent && _.isFunction(this.parent.clear)) {
            return this.parent.clear();
          }
          return this.goodbye();
        };
        if (!this.el || !this.el.dataset) return done();
        this.el.dataset.closing = "1";
        // Matches form-folder-out in the skin. A timer rather than
        // animationend: reduced-motion disables the animation entirely, and
        // that event would then never fire — leaving the dialog open forever.
        setTimeout(done, 160);
        return;
      }

      case "select-status":
        // The skeleton stores the status name in `dataset.type` (DOM)
        // and `formItem` (model). It is NOT a top-level model field.
        this._status =
          (trigger.el && trigger.el.dataset && trigger.el.dataset.type)
          || trigger.mget(_a.formItem)
          || this._status;
        return;

      case "create-folder":
        return this._submit();

      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }

  /**
   * Render the quota-exceeded block into the form's own slot.
   *
   * Inline rather than the shared modal: the user is part-way through a form
   * they typed a name into, and throwing a modal over it would take the form
   * away to explain why the form refused. The block sits under the field and
   * the form stays exactly as they left it.
   *
   * The widget works out its own copy and whether the upgrade button belongs
   * there; this only says which limit was hit.
   */
  _showQuotaBlock() {
    if (!this.ensurePart) return;
    this.ensurePart("quota-slot").then((p) => {
      if (!p) return;
      p.feed({ kind: "quota_exceeded", limit: "workspace", inline: 1 });
    });
  }

  // Inline "required" message shown directly under the name input
  // (.form-folder__input-error) instead of a modal alert. Pass a falsy msg to
  // clear it; falls back to Wm.alert if the part isn't mounted.
  _setNameError(msg) {
    const err = this.getPart && this.getPart("name-error");
    if (!err || !err.el) {
      if (msg) Wm.alert(msg);
      return;
    }
    if (msg) {
      if (_.isFunction(err.set)) err.set({ content: msg });
      else err.el.textContent = msg;
      err.el.dataset.state = 1;
    } else {
      err.el.dataset.state = 0;
    }
  }

  /**
   * Mark the submit as waiting on the network.
   *
   * The attribute goes straight onto the node — NOT through a re-render. The
   * name lives in an Entry, and rebuilding the skeleton destroys it and takes
   * the user's typed name with it, so a failed create would hand back an empty
   * form and ask them to type the name again. Same reason the tour's own create
   * screen stamps its button in place (desk/tutorial/workspace _create).
   *
   * `_pending` is also the re-entrancy guard in _submit: create is the one
   * control here that waits on the network, so it is the one that can be
   * pressed twice.
   */
  _setPending(on) {
    this._pending = on ? 1 : 0;
    const btn = this.getPart && this.getPart("submit");
    if (btn && btn.el) btn.el.dataset.pending = on ? 1 : 0;
  }

  _submit() {
    if (this._pending) return;
    const data = this.getData(_a.formItem) || {};
    const filename = (data.filename || "").trim();
    this._setNameError(null);
    if (!filename) {
      this._setNameError(LOCALE.REQUIRE_THIS_FIELD || "Please enter a name");
      return;
    }

    const status = this._status || "team";
    this._setPending(1);

    // The create, the analytics row and the workspace:refresh broadcast all
    // live in libs/create-workspace — the tutorial's own create screen needs
    // every one of them, and three types' worth of service branching is not
    // something to keep two copies of. What stays here is this form's: the
    // inline error, the quota block, and which panel opens afterwards.
    return require("libs/create-workspace")
      .createWorkspace(this, status, filename, { target: Wm.getActiveWindow(1) })
      .then((res) => {
        if (!res.ok) {
          this._setPending(0);
          // The personal path reports its own failures through Wm before
          // resolving, so there is nothing left to say.
          if (res.handled) return;
          if (res.quota) {
            this._setNameError(null);
            return this._showQuotaBlock();
          }
          if (res.message) return this._setNameError(res.message);
          if (res.error && this.onServerError) return this.onServerError(res.error);
          return;
        }

        const closeForm = () => {
          if (this.parent && _.isFunction(this.parent.clear)) {
            return this.parent.clear();
          }
          return this.goodbye();
        };

        // Personal is a folder, not a hub: it has no membership panel to open,
        // so creating one finishes here.
        if (res.personal) {
          this._setPending(0);
          return;
        }

        /**
         * WHICH SURFACE OPENS AFTER THE WORKSPACE EXISTS, and who gets to decide.
         *
         * By default the type decides, and both hub types end on the SAME
         * follow-up panel — "Who has access" (permission_restricted) — so
         * creating a shared workspace looks like creating a restricted one.
         * That panel is workspace-MEMBERSHIP, driven purely by hub_id with no
         * area branch of its own, so it serves a share hub exactly as it serves
         * a private one.
         *
         * Share creation used to open the share-LINK surface instead — the
         * secure-share v2 "Manage access" dock. Link minting stays where it
         * belongs: the in-workspace share icon, which is privilege-gated.
         *
         * A caller may override it, and exactly one does today — the
         * activate-workspace onboarding flow, which needs an external workspace
         * to end on the members panel so its invite step has a surface to run
         * on. The override is threaded desk -> wm -> here rather than decided
         * here, because "is an onboarding walkthrough running" is not something
         * this form can or should know.
         */
        const post = this.mget("post_override") || "permission_restricted";
        const hub = res.hub;
        if (!post || !hub) return closeForm();

        // permission_* dialogs call media.mget(...); wrap the plain server
        // response in a Backbone.View to satisfy that interface.
        const mediaShim = new Backbone.View({ model: new Backbone.Model(hub) });

        const parent = this.parent;
        if (!parent || !_.isFunction(parent.feed)) return closeForm();

        parent.feed({
          kind: post,
          hub_id: res.workspace.hub_id,
          media: mediaShim,
          source: this,
          persistence: _a.once,
        });
      });
  }
}

module.exports = __form_folder;
