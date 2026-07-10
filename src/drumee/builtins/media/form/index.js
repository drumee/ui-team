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

    const FLOW = {
      team: { area: "private", post: "permission_restricted" },
      share: { area: "share", post: "permission_shared" },
    };
    const { area, post } = FLOW[status] || FLOW.team;

    this._pending = 1;
    this.postService(SERVICE.desk.create_hub, {
      area,
      filename,
      hub_id: Visitor.id,
      pid: target ? target.getCurrentNid() : Visitor.id,
    })
      .then((res) => {
        RADIO_BROADCAST.trigger("workspace:refresh");
        const hub = _.isArray(res) ? res[0] : res;
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

        // Share workspace: open the SAME "Manage access" panel used INSIDE the
        // workspace (window_secure_share, secure-share v2) instead of the legacy
        // external-room panel (permission_shared) — the new panel gives editable
        // per-link permissions + logged-in-recipient recognition, which the old
        // one could not. Mirrors folder/index.js openManageAccess(): share the
        // workspace ROOT node = actual_home_id (a hub's real node id; nid is the
        // hub/0) with a "Manage access" title. There is no host workspace window
        // here (the create form lives on the desk), so launch the standalone
        // right-dock panel — it self-positions via _applyRightDock, matching the
        // right-side dock the old panel showed. The team/private branch below is
        // unchanged (permission_restricted is workspace-membership, not sharing).
        if (post === "permission_shared") {
          const shareNid = hub.actual_home_id || hub.home_id;
          Wm.launch(
            {
              kind         : "window_secure_share",
              wm_unique_id : `window_secure_share-${shareNid}`,
              nid          : shareNid,
              hub_id       : hub.hub_id || hub.id,
              home_id      : hub.actual_home_id,
              filetype     : _a.folder,
              area         : hub.area || _a.share,
              filename     : hub.filename,
              name         : hub.filename,
              privilege    : ~~hub.privilege,
              manage_access: 1,
              useKeyEvent  : 1,
              radio        : _a.on,
              state        : _a.on,
              media        : mediaShim,
              trigger      : mediaShim,
              source       : this,
              uiHandler    : [Wm],
            },
            { explicit: 1, singleton: 1 },
          );
          return closeForm();
        }

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
