require('./skin');
const { dayKey, trashedAt } = require('./group');

class __trash_item extends LetcBox {


  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
    // First row of its day shows the day label (./group). Decided against the
    // row above in the list, so each appended page lines up with the last.
    // The panel re-marks every row when one is removed.
    const c = this.model && this.model.collection;
    // Guarded: Backbone's at(-1) is the LAST row, not "none".
    const i = c ? c.indexOf(this.model) : -1;
    const prev = i > 0 ? c.at(i - 1) : null;
    const key = dayKey(trashedAt(this.model));
    this.el.dataset.group = !prev || dayKey(trashedAt(prev)) !== key ? "start" : "";
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    const parent = this.mget('logicalParent');
    switch (service) {
      case 'restore-to-desk':
        if (parent && parent.onUiEvent) parent.onUiEvent(this, { service, media: this });
        break;
      case 'delete-permanently':
        if (parent && parent.onUiEvent) parent.onUiEvent(this, { service, media: this });
        break;
      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }
}

module.exports = __trash_item;
