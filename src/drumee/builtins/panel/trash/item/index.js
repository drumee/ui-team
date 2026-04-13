require('./skin');

class __trash_item extends LetcBox {


  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
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
