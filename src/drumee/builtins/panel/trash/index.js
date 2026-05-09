
const mfsInteract = require('../../window/utils');
const { filesize } = require('@drumee/ui-essentials');
require('./skin');
class __panel_trash extends mfsInteract {

  initialize(opt = {}) {
    opt.dataset = { ...opt.dataset, anim: "out" };
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

  _refreshStorageUsed() {
    return this.fetchService({
      service: SERVICE.desk.disk_usage,
      hub_id: Visitor.id,
      category: '*',
      list: 1,
    }, { async: 1 }).then((data) => {
      if (!data) return;
      const { quota, usage } = data;
      if (quota) Visitor.set({ quota });
      if (usage) Visitor.set({ disk_usage: usage });
      const used = Visitor.diskUsed() || 0;
      this.ensurePart('storage-info').then((p) => {
        p.set({ content: LOCALE.STORAGE_USED.format(filesize(used)) });
      });
    }).catch(() => { });
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
          const count = child.collection
            ? child.collection.filter(m => m.get(_a.kind) !== 'placeholder' && m.get(_a.nid)).length
            : 0;
          this.el.dataset.empty = count ? 0 : 1;
          this.ensurePart('items-count').then((p) => {
            p.set({ content: LOCALE.X_ITEMS_FOUND.format(count) });
          });
          this._refreshStorageUsed();
        });
        break;
      case 'storage-info':
        this._refreshStorageUsed();
        break;
    }
  }

  onDomRefresh() {
    this.feed(require('./skeleton')(this));
    // rAF so the "out" → "in" flip lands in a separate frame and the
    // CSS transform transition actually engages.
    requestAnimationFrame(() => {
      if (this.el) this.el.dataset.anim = "in";
    });
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

  _updateItemsCount() {
    return this.ensurePart(_a.list).then((listPart) => {
      const count = listPart.collection
        ? listPart.collection.filter(m => m.get(_a.kind) !== 'placeholder' && m.get(_a.nid)).length
        : 0;
      this.el.dataset.empty = count ? 0 : 1;
      return this.ensurePart('items-count').then((p) => {
        p.set({ content: LOCALE.X_ITEMS_FOUND.format(count) });
      });
    }).catch(() => {});
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
      this._updateItemsCount();
      this._refreshStorageUsed();
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
      this._updateItemsCount();
      this._refreshStorageUsed();
    });
  }

  _emptyBin() {
    return Wm.confirm({
      title: LOCALE.TRASH,
      message: LOCALE.Q_DELETE_ALL_FILES,
      confirm: LOCALE.DELETE || 'Delete',
      confirm_type: 'danger trash-delete',
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
