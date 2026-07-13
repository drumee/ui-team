
const mfsInteract = require('../../window/utils');
const { filesize } = require('@drumee/ui-essentials');
require('./skin');
const WS_EVENT = "ws:event";
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
    window.Trash = this;
    this._refreshStorageUsed = _.debounce(this._refreshStorageUsed.bind(this), 3000, { leading: true, trailing: false });
    this._onOutsideClick = this._onOutsideClick.bind(this);
    // Trash/restore/purge echoes can arrive in bursts (multi-select) — one
    // list reload per burst is enough.
    this._wsRefresh = _.debounce(this._wsRefresh.bind(this), 400);

  }

  /**
   * 
   * @param {*} e 
   */
  _onOutsideClick(e, source) {
    // Clicks coming from a sidebar toggle button are owned by
    // Desk.togglePanel — bail so we don't race it (flip anim to "out"
    // here and have togglePanel read it as closed and reopen).
    const svc = source && source.mget && source.mget(_a.service);
    if (typeof svc === "string" && svc.startsWith("toggle-")) return;
    if (this.el.dataset.anim === "in" && !this.el.contains(e.target)) {
      this.el.dataset.anim = "out";
    }
  }

  /**
   *
   */
  onDestroy() {
    RADIO_CLICK.off(_e.click, this._onOutsideClick);
    Wm.off(WS_EVENT, this.handleWsEvent);
  }

  /**
   * The base class (window/utils) subscribes to Wm's ws:event relay in ITS
   * onDomRefresh, which this panel overrides without calling super (the rest
   * of that hook is window-specific), so the panel never heard websocket
   * traffic — deleting an item with the trash already open left the list
   * stale until a full page reload. Override with bin semantics: the base
   * mapping is for FOLDER views (media.remove → removeContent), which is
   * exactly backwards here — a removed node ENTERS the bin. Reload the list
   * on any event that changes bin content; everything else is ignored on
   * purpose (no super call).
   */
  handleWsEvent(args = {}) {
    const { options } = args || {};
    const service = options && options.service;
    switch (service) {
      case "media.remove":            // node moved to trash (server echo of media.trash)
      case SERVICE.media.trash:       // local Wm echoes use the request name
      case SERVICE.media.restore:     // restored from another window/session
      case SERVICE.media.restore_into:
      case "media.purge":             // purged / bin emptied elsewhere
        this._wsRefresh();
        break;
    }
  }

  _wsRefresh() {
    if (!this.el || this.isDestroyed()) return;
    // Don't clobber the empty-bin confirm overlay mid-decision — feed()
    // replaces the whole subtree, overlay included. Flag it and replay once
    // the overlay closes (cancel handler; confirm re-feeds anyway).
    const overlay = this.getPart && this.getPart('overlay');
    if (overlay && overlay.children && overlay.children.length) {
      this._pendingWsRefresh = true;
      return;
    }
    this._pendingWsRefresh = false;
    this.feed(require('./skeleton')(this));
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
    // off() first so a re-render never stacks duplicate subscriptions.
    RADIO_CLICK.off(_e.click, this._onOutsideClick);
    RADIO_CLICK.on(_e.click, this._onOutsideClick);
    // Listen to the Wm websocket relay (see handleWsEvent).
    Wm.off(WS_EVENT, this.handleWsEvent);
    Wm.on(WS_EVENT, this.handleWsEvent);

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
    }).catch(() => { });
  }

  async _restoreFile(media) {
    if (!media) return;
    const nid = media.mget(_a.nid);
    const hub_id = media.mget(_a.hub_id);

    const data = await this.postService({
      service: SERVICE.media.restore,
      nid,
      hub_id,
    }).catch(() => null);

    if (!data) return;

    if (data.parent_missing) {
      // Original parent folder is gone — ask user before falling back to home
      // No || fallbacks: LOCALE is a createSafeObject — a missing key comes
      // back as the truthy key STRING, so the fallback branch can never run
      // (the dialog used to literally display "Q_RESTORE_TO_HOME" because the
      // key was absent from every locale file).
      const confirmed = await Wm.confirm({
        title: LOCALE.RESTORE,
        message: LOCALE.Q_RESTORE_TO_HOME,
        confirm: LOCALE.RESTORE,
        confirm_type: 'primary',
        cancel: LOCALE.CANCEL,
        cancel_type: 'secondary',
        mode: 'hbf',
      }).then(() => true).catch(() => false);
      if (!confirmed) return;

      await this.postService({
        service: SERVICE.media.restore_into,
        hub_id: Visitor.id,
        recipient_id: Visitor.id,
        pid: Visitor.get(_a.home_id),
        list: [{
          nid,
          pid: Visitor.get(_a.home_id),
          hub_id,
          recipient_id: Visitor.id,
        }],
      });
    }

    media.suppress();
    this._updateItemsCount();
    this._refreshStorageUsed();
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

  async _emptyBin() {
    const overlay = await this.ensurePart('overlay');
    overlay.feed(require('./skeleton/confirm')(this));
  }

  async _confirmEmptyBin() {
    const data = await this.postService({
      service: SERVICE.media.empty_bin,
      hub_id: Visitor.id,
    }).catch(() => null);
    const overlay = await this.ensurePart('overlay');
    overlay.clear();
    if (data) RADIO_MEDIA.trigger(_a.free, data);
    // Full re-feed below IS the freshest state — drop any reload held back
    // while the confirm overlay was open, including a debounce timer still
    // queued (a WS echo landing <400ms ago would otherwise re-feed AGAIN
    // right after this one: duplicate show_bin + visible flicker).
    if (this._wsRefresh.cancel) this._wsRefresh.cancel();
    this._pendingWsRefresh = false;
    this.feed(require('./skeleton')(this));
  }


  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case 'empty-bin':
        return this._emptyBin();
      case 'confirm-empty-bin':
        return this._confirmEmptyBin();
      case 'cancel-empty-bin':
        this.ensurePart('overlay').then(p => {
          p.clear();
          // Replay a websocket reload that was held back while the confirm
          // overlay was open (see _wsRefresh).
          if (this._pendingWsRefresh) this._wsRefresh();
        });
        return;
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
