

const mfsInteract = require('../interact');
class __window_info extends mfsInteract {

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    require('./skin');
    super.initialize();
    this.model.atLeast({
      message: "No message",
      area: _a.personal
    });

    this.mset({
      hub_id: Visitor.id,
      privilege: _K.privilege.owner
    });
    if (this.mget(_a.version)) {
      this.model.set({
        body: require("./skeleton/revision")(this)
      });
    }
  }

  /**
   * 
   */
  onDomRefresh() {
    this.feed(require("./skeleton")(this));
    this.raise()
  }
}

module.exports = __window_info;

