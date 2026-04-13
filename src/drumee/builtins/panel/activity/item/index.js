require("./skin");

class __activity_item extends LetcBox {
  /**
   *
   */
  onDomRefresh() {
    this.feed(require("./skeleton")(this));
  }

  /**
   *
   * @param {*} cmd
   * @param {*} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    const parent = this.mget("logicalParent");
    switch (service) {
      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }
}

module.exports = __activity_item;
