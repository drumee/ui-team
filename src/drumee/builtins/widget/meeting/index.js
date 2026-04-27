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
      case "call-member": {
        const existing = Wm.getItemByKind("window_connect") || Wm.getItemByKind("window_meeting");
        if (existing) {
          Wm.alert(LOCALE.ALREADY_ANOTHER_CALL);
          break;
        }
        const callee = cmd.getAttr();
        const name = callee.fullname || `${callee.firstname || ""} ${callee.lastname || ""}`.trim();
        Wm.launch({
          kind: "window_connect",
          hub_id: this.mget(_a.hub_id),
          nid: this.mget(_a.nid),
          filename: name,
          display: name,
          callee,
        }, { explicit: 1, singleton: 1 });
        break;
      }

      case "start-meeting":
        this.triggerHandlers({ service: "start-meeting" });
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
