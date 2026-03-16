

/**
 * @class settings_folder
 * @extends __window_interact
 */
class settings_folder extends LetcBox {

  /**
   * @param {*} opt
   */
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
    this.model.set({
      hub_id: Visitor.id,
      role: _a.search,
    });
  }

  /**
   * 
   */
  getViewMode() {
    return _a.grid;
  }
  /**
   *
   */
  onDomRefresh() {
    this.feed(require("./skeleton").default(this));

  }

  /**
   * @param {*} child
   * @param {*} pn
   */
  onPartReady(child, pn) {
    switch (pn) {
    }
  }

  /**
   * @param {*} cmd
   * @param {*} args
   */
  onUiEvent(cmd, args = {}) {
    const service =
      args.service || cmd.service || cmd.mget(_a.service) || cmd.mget(_a.name);

    switch (service) {
      case _e.close:
      case "close-popup":
        this.goodbye();
        // ensure dialog wrapper (if any) is closed
        if (this.source && this.source.dialogWrapper && typeof this.source.dialogWrapper.clear === "function") {
          this.source.dialogWrapper.clear();
        }
        return;

      case "edit-type":
        
      return;

      case _a.members:
        this.feed({ kind: "settings_members_list", })
        return this.goodbye();
      // default:
      //   return super.onUiEvent(cmd, args);
    }
  }


}


module.exports = settings_folder;
