class __form_folder extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._status = "personal";
  }

  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.get(_a.service);
    switch (service) {
      case _e.close:
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

  _submit() {
    if (this._pending) return;
    const data = this.getData(_a.formItem) || {};
    const filename = (data.filename || "").trim();
    if (!filename) {
      Wm.alert(LOCALE.REQUIRE_THIS_FIELD || "Please enter a name");
      return;
    }

    const target = Wm.getActiveWindow(1);
    const status = this._status || "personal";

    // Backend accepts area ∈ {private, public, share}. Both Private and
    // Restricted Share map to "private"; Restricted Share follows up
    // with the existing permission_restricted dialog so the user can
    // invite members. Link Shared maps to "share" and chains the
    // permission_shared dialog.
    const FLOW = {
      personal: { area: _a.private, post: null },
      team: { area: _a.private, post: "permission_restricted" },
      share: { area: _a.share, post: "permission_shared" },
    };
    const { area, post } = FLOW[status] || FLOW.personal;

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
        if (!post || !hub) return this.goodbye();

        const parent = this.parent;
        if (!parent || !_.isFunction(parent.feed)) return this.goodbye();

        // permission_* dialogs call media.mget(...); wrap the plain
        // server response in a Backbone.View to satisfy that interface.
        const mediaShim = new Backbone.View({
          model: new Backbone.Model(hub),
        });

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
