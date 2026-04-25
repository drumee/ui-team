require("./skin");

class __widget_meeting extends LetcBox {
  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
  }

  onDomRefresh() {
    this.feed(require("./skeleton")(this));
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    switch (service) {
      case "call-member":
        Wm.openWindow({ kind: "connect", ...cmd.getAttr(), uiHandler: [this] });
        break;

      case "start-meeting":
        Wm.openWindow({
          kind: "window_meeting",
          hub_id: this.mget(_a.hub_id),
          name: this.mget(_a.name) || this.mget(_a.filename),
          audio: 1,
          video: 1,
        });
        this.goodbye();
        break;

      case "cancel":
      case _e.close:
        this.goodbye();
        break;

      default:
        super.onUiEvent(cmd, args);
    }
  }
}

module.exports = __widget_meeting;
