

/**
 * 
 * 
 */
class settings_filename extends LetcBox {

  /**
   * @param {*} opt
   */
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
    this.model.set({
      hub_id: Visitor.id,
      flow: "g"
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
    const service = args.service || cmd.service || cmd.mget(_a.service) || cmd.mget(_a.name);

    switch (service) {
      // case _e.close:
      // case "close-popup":
      //   return this.goodbye();


      // default:
      //   return super.onUiEvent(cmd, args);
    }
  }


}


module.exports = settings_filename
