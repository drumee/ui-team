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
      case _e.close:
        // Clear the parent wrapper synchronously instead of goodbye().
        // goodbye() removes silently, leaving the wrapper's data-state
        // stuck and breaking subsequent open clicks. clear() resets the
        // collection cleanly so the wrapper can re-render next time.
        if (this.parent && _.isFunction(this.parent.clear)) {
          return this.parent.clear();
        }
        return this.goodbye();

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
   * Report a workspace this form just created. See libs/track-workspace —
   * the sharebox and team windows create hubs the same board counts, so the
   * reporting lives in one place rather than three.
   *
   * @param {String} type "team" | "share" | "personal"
   * @param {Object} opt  { wid, area, filename }
   * @returns {Promise<Object|null>} the service's answer, or null
   */
  _trackWorkspace(type, opt = {}) {
    return require("libs/track-workspace").trackWorkspace(this, type, opt);
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

    const target = Wm.getActiveWindow(1);
    const status = this._status || "team";

    // Personal workspace is NOT a hub: it is the legacy private folder at
    // the home root, only presented as a workspace type. Reuse the window
    // manager's create-folder flow (media.make_dir + home-grid append +
    // error alerts) instead of desk.create_hub, which would add membership
    // and sidebar semantics this type must not have.
    if (status === "personal") {
      this._pending = 1;
      const req = Wm.createFolderFromDialog({ getValue: () => filename });
      return Promise.resolve(req)
        .then((created) => {
          // createFolderFromDialog resolves to the folder on success and
          // undefined on the handled-failure paths (invalid name / server
          // error). Only broadcast on real success, else the reward-flow Step 1
          // guide would advance though nothing was created.
          if (!created || created.error) return;
          // Counted by the analytics Referral users table. This is the type
          // that made the tracking service necessary: a personal workspace is
          // a home-root folder, so it is absent from yp.hub and no amount of
          // server-side counting can find it.
          // `type` is a literal, not _a.personal: the ACL declares it required
          // and enum-checked, so resolving it through the attribute lexicon
          // would turn a missing key into a silently dropped row. `area` keeps
          // _a.personal to match the broadcast payload right below.
          this._trackWorkspace("personal", {
            wid: created.nid || created.id,
            area: _a.personal,
            filename,
          });
          // Personal is a folder, not a hub, so it takes the create-folder path
          // above and never fires the workspace:refresh that team/share do.
          // Fire it (flagged personal) so listeners — e.g. the reward-flow
          // Step 1 guide — can react; this type has no follow-up permission
          // panel, so the flag tells them to finish rather than wait for one.
          // The descriptor lets listeners REOPEN this workspace later (the
          // reward flow's Step 3 does). A personal workspace is a home-root
          // folder, not a hub, so it takes the same shape the sidebar builds
          // for a folder row: the user's own hub_id plus the folder's own nid.
          // Passing a hub home_id here would reopen Home instead.
          RADIO_BROADCAST.trigger("workspace:refresh", {
            personal: 1,
            workspace: {
              hub_id: Visitor.id,
              nid: created.nid || created.id,
              area: _a.personal,
              filename,
            },
          });
        })
        .finally(() => {
          this._pending = 0;
        });
    }

    // Both hub types end on the SAME follow-up panel — "Who has access"
    // (permission_restricted), so creating a shared workspace looks like
    // creating a restricted one. That panel is workspace-MEMBERSHIP, driven
    // purely by hub_id with no area branch of its own, so it serves a share hub
    // exactly as it serves a private one.
    //
    // Share creation used to open the share-LINK surface instead — the
    // secure-share v2 "Manage access" dock, and the legacy permission_shared
    // external-room panel before that. Link minting stays where it belongs: the
    // in-workspace share icon (folder openManageAccess), which is
    // privilege-gated. Creation does not open it any more.
    const FLOW = {
      team: { area: "private", post: "permission_restricted" },
      share: { area: "share", post: "permission_restricted" },
    };
    const { area, post: defaultPost } = FLOW[status] || FLOW.team;

    /**
     * WHICH SURFACE OPENS AFTER THE WORKSPACE EXISTS, and who gets to decide.
     *
     * By default the type decides, per FLOW above: a team workspace opens the
     * members panel in this same wrapper-modal, a share workspace closes the
     * form and launches the secure-share dock as a window.
     *
     * A caller may override it, and exactly one does today — the
     * activate-workspace onboarding flow, which needs an external workspace to
     * end on the members panel so its invite step has a surface to run on (the
     * dock offers link management, not membership). The override is threaded
     * desk -> wm -> here rather than decided here, because "is an onboarding
     * walkthrough running" is not something this form can or should know.
     *
     * Scoped deliberately. Changing FLOW.share itself would take the
     * secure-share dock off EVERY workspace creation in the app — topbar,
     * sidebar, workspace-list, context menu and reward-flow alike — at the one
     * moment link management matters most for an external workspace. With no
     * override the behaviour below is byte-identical to what it always was.
     */
    const post = this.mget("post_override") || defaultPost;

    this._pending = 1;
    this.postService(SERVICE.desk.create_hub, {
      area,
      filename,
      hub_id: Visitor.id,
      pid: target ? target.getCurrentNid() : Visitor.id,
    })
      .then((res) => {
        const hub = _.isArray(res) ? res[0] : res;
        // desk.create_hub can resolve with an in-band error payload instead
        // of rejecting; surface it inline and keep the form open for retry.
        if (hub && (hub.error || hub.error_code)) {
          this._pending = 0;
          // LEGACY PATH. There is no workspace-count limit: the server's
          // check_quota preproc was removed on 2026-08-08 because it read the
          // plan's per-area capability flags ($.private_hub etc.) as counts
          // and refused a second workspace to everyone, paying customers
          // included. An updated endpoint never sends this any more.
          //
          // Kept while endpoints roll out at their own pace: an old service
          // still answers QUOTA_EXCEEDED with a `reason` naming the area
          // (_private_hub_limit_reached / _share_hub_limit_reached), which has
          // no translation in any locale file, so without this branch the code
          // itself would land in the name field. Remove once no deployment
          // runs the old service.
          if (hub.error === "QUOTA_EXCEEDED" || /_hub_limit_reached$/.test(hub.reason || "")) {
            this._setNameError(null);
            this._showQuotaBlock();
            return;
          }
          this._setNameError(LOCALE[hub.error] || hub.reason || hub.error);
          return;
        }
        // Counted by the analytics Referral users table. `wid` is the hub id,
        // not actual_home_id: the backfill that seeds this table from yp.hub
        // keys on hub id, and the two must agree or a backfilled workspace
        // would be counted twice.
        this._trackWorkspace(status, {
          wid: hub.hub_id || hub.id,
          area: hub.area || area,
          filename,
        });
        // See the personal branch above — same descriptor, hub shape. nid is
        // the workspace ROOT node (actual_home_id); a hub's own `nid` is the
        // hub/0 placeholder and would not open the workspace.
        RADIO_BROADCAST.trigger("workspace:refresh", {
          workspace: {
            hub_id: hub.hub_id || hub.id,
            nid: hub.actual_home_id || hub.home_id,
            area: hub.area || area,
            filename,
          },
        });
        const closeForm = () => {
          if (this.parent && _.isFunction(this.parent.clear)) {
            return this.parent.clear();
          }
          return this.goodbye();
        };
        if (!post || !hub) return closeForm();

        // permission_* dialogs call media.mget(...); wrap the plain
        // server response in a Backbone.View to satisfy that interface.
        const mediaShim = new Backbone.View({
          model: new Backbone.Model(hub),
        });

        const parent = this.parent;
        if (!parent || !_.isFunction(parent.feed)) return closeForm();

        parent.feed({
          kind: post,
          hub_id: hub.hub_id || hub.id,
          media: mediaShim,
          source: this,
          persistence: _a.once,
        });
      })
      .catch((e) => {
        this._pending = 0;
        this.warn("Failed to create hub", e);
        if (this.onServerError) this.onServerError(e);
      });
  }
}

module.exports = __form_folder;
