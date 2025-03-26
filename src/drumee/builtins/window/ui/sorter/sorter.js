class __desk_ui_sorter extends LetcBox {

  static initClass() {
    this.prototype.className  = "desk-ui-sort";
    this.prototype.acceptMedia    = 1;
  }


// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    return super.initialize();
  }

// ===========================================================
// onDomRefresh
//
// @return [Object]
//
// ===========================================================
  onDomRefresh() {
    return this.feed(require("./skeleton/main")(this));
  }

// ===========================================================
// onUiEvent
//
// @param [Object] cmd
//
// @return [Object]
//
// ===========================================================
  onUiEvent(cmd) {
    const service = cmd.model.get(_a.service);
    this.debug("AAAAAAAAAAAAA 47", cmd, this);
    switch (service) {
      case _e.sort:
        var list = this.model.get('client').serializeContent();
        var name = cmd.model.get(_a.name);
        var order = cmd.model.get(_a.state) ? 'asc' : 'desc';
        var sorted = _.sortBy(list, name, [order]);
        return this.debug("AAAAAAAAAAAAA 47SORT", name, order, cmd.model.get(_a.state), list, sorted);
    }
  }
}
__desk_ui_sorter.initClass();
        //@model.get('client').collection.set sorted
module.exports = __desk_ui_sorter;

// -------------------------- END OF MODULE -----------------------
