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
        return this._startCall(cmd.getAttr());

      case "start-meeting":
        this.triggerHandlers({ service: "start-meeting" });
        break;

      case "cancel":
      case _e.close:
        // Bubble up so a parent window (folder) can switch its tab back to
        // Files. The team window currently relies on the removeChild event
        // it receives when this widget goodbye's, so the bubble is additive
        // and harmless there.
        this.triggerHandlers({ service: "close-call-panel" });
        this.goodbye();
        break;

      default:
        super.onUiEvent(cmd, args);
    }
  }

  // hub_id/nid are the caller's identity (Visitor), not the folder — a 1:1
  // ring originates from the caller's personal home, not the shared folder.
  // guest_id (used by conference.invite) reads callee.drumate_id, so fall
  // back to entity_id/uid/id for folder members who aren't drumates yet.
  _startCall(callee) {
    if (!callee) return;

    const guest_id = callee.drumate_id || callee.entity_id || callee.uid || callee.id;
    if (!guest_id) return;

    const existing = Wm.getItemByKind("window_connect") || Wm.getItemByKind("window_meeting");
    if (existing) {
      Wm.alert(LOCALE.ALREADY_ANOTHER_CALL);
      return;
    }

    const name = callee.fullname
      || callee.display
      || `${callee.firstname || ""} ${callee.lastname || ""}`.trim();

    Wm.launch({
      kind: "window_connect",
      hub_id: Visitor.id,
      nid: Visitor.get(_a.home_id) || Visitor.get(_a.nid),
      filename: name,
      display: name,
      callee: { ...callee, drumate_id: guest_id },
      video: 1,
      audio: 1,
    }, { explicit: 1, singleton: 1 });
  }
}

module.exports = __widget_meeting;
