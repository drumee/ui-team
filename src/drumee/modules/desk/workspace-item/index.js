/* ==================================================================== *
 * desk_workspace-item
 * A single workspace (hub) row in the sidebar workspace list.
 * Model data: hub_id, home_id, filename, area
 * Triggers "nav-workspace" on click, delegated up to desk_workspace-list.
 * ==================================================================== */

require('./skin');

class __workspace_item extends LetcBox {

  /**
   *
   */
  initialize(opt = {}) {
    super.initialize(opt);
    this.mset({ flow: _a.x })
    this.declareHandlers();
  }

  /**
   *
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  /**
   *
   * @param {View} trigger
   * @param {Object} args
   */
  onUiEvent(trigger, args = {}) {
    this.triggerHandlers()
  }
}

module.exports = __workspace_item;
