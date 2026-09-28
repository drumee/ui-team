require('./skin');
const { dayKey, trashedAt } = require('./group');

class __trash_item extends LetcBox {


  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
    // Record this row's day; the panel decides which row heads each day
    // (./group markDayGroups) and is asked to look again now that this row
    // is on screen.
    this.el.dataset.day = dayKey(trashedAt(this.model));
    const parent = this.mget('logicalParent');
    if (parent && typeof parent.regroupSoon === 'function') parent.regroupSoon();
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
