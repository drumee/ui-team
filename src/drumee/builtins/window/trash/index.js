require('./skin');

class __window_trash extends LetcBox {

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    this.isTrash = 1;
    this.getCurrentApi = this.getCurrentApi.bind(this);
    this.mset({
      hub_id: Visitor.id,
      privilege: _K.privilege.owner,
      filename: LOCALE.TRASH,
    });
  }

  onPartReady(child, pn) {
    switch (pn) {
      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }

  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

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
    return this.confirm(LOCALE.Q_DELETE_ALL_FILES).then(() => {
      return this.postService({
        service: SERVICE.media.empty_bin,
        hub_id: Visitor.id,
      }).then((data) => {
        this.feed(require('./skeleton')(this));
        RADIO_MEDIA.trigger(_a.free, data);
      });
    });
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
      default:
        if (super.onUiEvent) return super.onUiEvent(cmd, args);
    }
  }
}

module.exports = __window_trash;
