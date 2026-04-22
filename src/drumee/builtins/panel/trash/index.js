
const mfsInteract = require('../../window/utils');
require('./skin');
class __panel_trash extends mfsInteract {

  initialize(opt = {}) {
    opt.dataset = { ...opt.dataset, anim: "out" }
    super.initialize(opt);
    this.declareHandlers();
    this.isTrash = 1;
    this.getCurrentApi = this.getCurrentApi.bind(this);
    let data = {
      hub_id: Visitor.id,
      privilege: _K.privilege.owner,
      filename: LOCALE.TRASH,
    }
    this.mset(data);
    window.Trash = this
  }
  /**
   *
   * @param {*} child
   * @param {*} pn
   * @param {*} section
   * @returns
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.list:
        child.once(_e.eod, async () => {
          this.ensurePart('items-count').then((p) => {
            p.set({ content: LOCALE.X_ITEMS_FOUND.format(child.collection.length) })
            this.el.dataset.anim = "in";
          })
        })
        break;
    }
  }

  /**
   * ss
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  /**
   * 
   * @returns 
   */
  getCurrentApi() {
    return {
      service: SERVICE.media.show_bin,
      page: 1,
      hub_id: Visitor.id,
    };
  }

  _restoreFile(media) {
    if (!media) return;
    return this.postService({
      service: SERVICE.media.restore_into,
      hub_id: Visitor.id,
      recipient_id: Visitor.id,
      pid: Visitor.get(_a.home_id),
      list: [{
        nid: media.mget(_a.nid),
        pid: Visitor.get(_a.home_id),
        hub_id: media.mget(_a.hub_id),
        recipient_id: Visitor.id,
      }],
    }).then(() => {
      media.suppress();
      Wm.reloadAll();
    });
  }

  deleteFilePermanently(media) {
    if (!media) return;
    return this.postService({
      service: SERVICE.media.purge,
      list: [{ nid: media.mget(_a.nid), hub_id: media.mget(_a.hub_id) }],
      hub_id: Visitor.id,
    }).then(() => {
      media.suppress();
    });
  }

  _emptyBin() {
    return Wm.confirm({
      title: LOCALE.TRASH,
      message: LOCALE.Q_DELETE_ALL_FILES,
      confirm: LOCALE.DELETE || 'Delete',
      confirm_type: 'primary',
      cancel: LOCALE.CANCEL || 'Cancel',
      cancel_type: 'secondary',
      mode: 'hbf'
    }).then(() => {
      return this.postService({
        service: SERVICE.media.empty_bin,
        hub_id: Visitor.id,
      }).then((data) => {
        this.feed(require('./skeleton')(this));
        RADIO_MEDIA.trigger(_a.free, data);
      });
    }).catch(() => {});
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case 'empty-bin':
        return this._emptyBin();
      case 'delete-permanently':
        return this.deleteFilePermanently(args.media || cmd);
      case 'restore-to-desk':
        return this._restoreFile(args.media || cmd);
      case 'refresh':
        this.feed(require('./skeleton')(this));
        return;
      case 'view-history':
        // TODO: open trash history view
        return;
      default:
        if (super.onUiEvent) return super.onUiEvent(cmd, args);
    }
  }
}

module.exports = __panel_trash;
