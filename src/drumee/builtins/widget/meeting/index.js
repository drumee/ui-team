require("./skin");
const { startP2PCall } = require("libs/p2p-call");

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

  // Folder members who aren't drumates yet carry their id as entity_id/uid/id;
  // startP2PCall handles that fallback and the one-call-at-a-time guard.
  _startCall(callee) {
    startP2PCall(callee, { video: 1 });
  }
}

module.exports = __widget_meeting;
