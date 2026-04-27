require("./skin/member");

class __widget_meeting_member extends LetcBox {
  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
  }

  onDomRefresh() {
    this.feed(require("./skeleton/member")(this));
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    this.triggerHandlers({ ...args, service });
  }
}

module.exports = __widget_meeting_member;
