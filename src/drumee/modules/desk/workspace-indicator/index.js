/* ==================================================================== *
 * desk_workspace-indicator
 * Shows the currently active workspace name with a color dot indicator.
 * Listens to Organization changes and re-renders on update.
 * ==================================================================== */

class __desk_workspace_indicator extends LetcBox {

  /**
   *
   */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._onOrgChange = this._onOrgChange.bind(this);
    Organization.on(_e.change, this._onOrgChange);
  }

  /**
   *
   */
  onDestroy() {
    Organization.off(_e.change, this._onOrgChange);
  }

  /**
   *
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  /**
   * Re-render when organization data changes
   */
  _onOrgChange() {
    this.feed(require('./skeleton')(this));
  }
}

module.exports = __desk_workspace_indicator;
