/* ==================================================================== *
 * desk_breadcrumb — Desk-level breadcrumb widget
 * Listens to RADIO_BROADCAST "desk:breadcrumb" emitted by window/core.js
 * whenever the active window navigates, and renders the path.
 * ==================================================================== */

class __desk_breadcrumb extends LetcBox {

  /**
   *
   */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._sourceWindow = null;
    this._onBreadcrumb = this._onBreadcrumb.bind(this);
    RADIO_BROADCAST.on("desk:breadcrumb", this._onBreadcrumb);
  }

  /**
   *
   */
  onDestroy() {
    RADIO_BROADCAST.off("desk:breadcrumb", this._onBreadcrumb);
  }

  /**
   * Called whenever an active window updates its navigation path.
   * @param {Array}  data   - Array of path items (same format as buildBreadcrumbs)
   * @param {Object} source - The window widget that triggered the broadcast
   */
  _onBreadcrumb(data = [], source) {
    this._sourceWindow = source;
    this.feed(require('./skeleton')(this, data));
  }
}

module.exports = __desk_breadcrumb;
