
const { toggleState } = require("core/utils")
class behavior_toggle extends Marionette.Behavior {

  /**
   * 
   */
  onBeforeRender() {

    this.view.model.atLeast({
      state: 0
    });
    const state = this.view.model.get(_a.state);
    this.view.model.set(_a.state, toggleState(state));
    return this.view.isToggle = 1;
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    if (this.view.model.get(_a.state) != null) {
      return this.el.setAttribute(_a.data.state, this.view.model.get(_a.state));
    }
  }

  /**
   * 
   * @param {*} source 
   * @param {*} e 
   * @returns 
   */
  onAlsoClick(source, e) {
    if (e === this.lastEvent) {
      return;
    }
    const prev = parseInt(this.view.model.get(_a.state));
    const cur = 1 ^ prev;
    this.view.model.set({
      state: cur
    });
    this.lastEvent = e;
    this.el.setAttribute(_a.data.state, this.view.model.get(_a.state));
    if (_.isFunction(this.view.mould)) {
      return this.view.mould();
    }
  }
}


module.exports = behavior_toggle;
