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
        this._status = trigger.mget(_a.type) || trigger.mget(_a.name) || this._status;
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
    const area = status === "share" ? _a.share : _a.private;

    this._pending = 1;
    this.postService(SERVICE.desk.create_hub, {
      area,
      filename,
      hub_id: Visitor.id,
      pid: target ? target.getCurrentNid() : Visitor.id,
    })
      .then(() => {
        RADIO_BROADCAST.trigger("workspace:refresh");
        this.goodbye();
      })
      .catch((e) => {
        this._pending = 0;
        this.warn("Failed to create hub", e);
        if (this.onServerError) this.onServerError(e);
      });
  }
}

module.exports = __form_folder;
