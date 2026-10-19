/**
 * "Unsaved changes" dialog, opened by settings_main.confirmLeave() when the
 * user navigates away with edits in the General Profile fields. Mounted into
 * settings_main's __overlay slot, which provides the backdrop.
 *
 * Three answers, each triggered as a service on the host (settings_main):
 *   leave-confirm-save     "Save changes"
 *   leave-confirm-discard  "Discard"
 *   leave-confirm-stay     the X, Escape, or a click on the backdrop
 *
 * Not Wm.confirm: its X, Escape and Cancel button all answer the same
 * "cancel", so closing the dialog would have meant "discard my edits".
 */
class settings_leave_confirm extends LetcBox {
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
    this._busy = false;
    this._onKey = (e) => {
      if (e.key === "Escape" && !this._busy) this._answer("leave-confirm-stay");
    };
    document.addEventListener("keyup", this._onKey);
  }

  onDomRefresh() {
    this.feed(require("./skeleton").default(this));
  }

  onBeforeDestroy() {
    document.removeEventListener("keyup", this._onKey);
    if (super.onBeforeDestroy) super.onBeforeDestroy();
  }

  /** Host flips this while a save is in flight: buttons lock, label changes. */
  setBusy(on) {
    this._busy = !!on;
    this.feed(require("./skeleton").default(this));
  }

  _answer(service) {
    this.triggerHandlers({ service });
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || (cmd && cmd.mget && cmd.mget(_a.service));
    if (this._busy) return;
    switch (service) {
      case "leave-confirm-save":
      case "leave-confirm-discard":
      case "leave-confirm-stay":
        return this._answer(service);
      default:
        return;
    }
  }
}

module.exports = settings_leave_confirm;
