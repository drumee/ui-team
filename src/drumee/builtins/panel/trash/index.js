
const mfsInteract = require('../../window/utils');
const { filesize } = require('@drumee/ui-essentials');
require('./skin');
const { trackDeskCanvas } = require('libs/desk-canvas');
const { armItemsReady, markItemsReady } = require("libs/items-ready");
const WS_EVENT = "ws:event";
class __panel_trash extends mfsInteract {

  initialize(opt = {}) {
    opt.dataset = { ...opt.dataset, anim: "out" };
    super.initialize(opt);
    armItemsReady(this);
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
    // list reload per burst is enough. 600ms (was 400) coalesces echoes that
    // trickle ~half a second apart as the server processes each file, so a
    // multi-file delete triggers a single reload instead of one per echo.
    this._wsRefresh = _.debounce(this._wsRefresh.bind(this), 600);
    // nid -> time of restores this panel issued itself. The server broadcasts
    // media.restore / media.restore_into back to the actor's own socket too,
    // and that echo used to restart() the whole list right after the row had
    // already been removed locally: every row blanked, the bin refetched, the
    // scroll snapped back to the top — the "jerk" on each restore.
    this._localRestores = new Map();
    // Restores in flight, so a double click cannot send the same nid twice
    // (the second call finds the trash row gone and reads as parent_missing).
    this._restoring = new Set();

  }

  /**
   * 
   * @param {*} e 
   */
  _onOutsideClick(e, source) {
    // The Empty Trash prompt owns the interaction while it is up, so nothing
    // counts as an outside click until it closes.
    //
    // Without this, pressing Delete closed the whole panel: the prompt is fed
    // into Wm.__wrapperModal, which is NOT inside this panel's element, so the
    // contains() test below reads a click on its own dialog as a click outside
    // and slides the panel away. The overlay this replaced was fed into the
    // panel's own `overlay` part — inside this.el — which is why the behaviour
    // only appeared once the prompt moved to the shared wrapper.
    //
    // Guarding on the flag rather than on the source's service also covers the
    // backdrop and anything else reachable while the prompt is open. Both close
    // paths clear it (_closePurgeConfirm), so it cannot strand the panel in a
    // state where outside clicks stop working.
    if (this._purgeConfirmOpen) return;
    // Same for the "restore somewhere else?" prompt: it is a Wm.confirm, also
    // outside this.el, and answering it used to slide the panel away mid-restore.
    if (this._restoreConfirmOpen) return;

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
    if (this._untrackCanvas) this._untrackCanvas();
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
    const { options, data } = args || {};
    const service = options && options.service;
    switch (service) {
      case SERVICE.media.restore:     // restored from another window/session
      case SERVICE.media.restore_into:
        // Our own restore coming back: the row is already gone, nothing to reload.
        if (this._isLocalRestore(data)) break;
        this._wsRefresh();
        break;
      case "media.remove":            // node moved to trash (server echo of media.trash)
      case SERVICE.media.trash:       // local Wm echoes use the request name
      case "media.purge":             // purged / bin emptied elsewhere
        this._wsRefresh();
        break;
    }
  }

  /**
   * Remember a nid this panel is restoring, so its WS echo can be told apart
   * from a restore made elsewhere. Kept for a while rather than dropped on the
   * first echo: the echo can land before OR after the HTTP answer, and a
   * restore_into sends one per restored node.
   */
  _markLocalRestore(nid) {
    if (!nid) return;
    const now = Date.now();
    for (const [k, t] of this._localRestores) {
      if (now - t > 15000) this._localRestores.delete(k);
    }
    this._localRestores.set(`${nid}`, now);
  }

  _isLocalRestore(data) {
    const nid = data && (data.nid || data.id);
    if (!nid) return false;
    const t = this._localRestores.get(`${nid}`);
    return !!t && Date.now() - t <= 15000;
  }

  _wsRefresh() {
    if (!this.el || this.isDestroyed()) return;
    // Parked by the desk (keep-alive slot, see desk _isKeepAliveSlot) or
    // slid out by an outside click: don't pay for mfs_show_bin — a heavy SP
    // that walks every hub the user can write to — on each burst of echoes
    // for a list nobody is looking at. Note it; onPanelShown reloads once.
    // Read off data-anim rather than an onPanelHidden flag because the
    // outside-click path hides the panel without calling that hook.
    if (this.el.dataset.anim !== "in") {
      this._staleWhileParked = true;
      return;
    }
    // Don't reload the list under the user mid-decision on Empty Trash. This
    // used to look for children in the `overlay` part, which was where the
    // panel-scoped confirm lived; that prompt is now the global confirm dialog
    // (see _emptyBin), so the flag it sets is what reports the same state.
    // Replayed once the prompt closes (cancel path; confirm re-feeds anyway).
    if (this._purgeConfirmOpen) {
      this._pendingWsRefresh = true;
      return;
    }
    this._pendingWsRefresh = false;
    // Reload the LIST in place instead of re-feeding the whole panel. A full
    // feed() tore down + rebuilt the topbar/list/footer scaffold on every WS
    // echo, so deleting several files (each purge/restore echo lands more than
    // one debounce window apart) blinked the entire layout repeatedly — the
    // empty-state placeholder flickered out and back on each rebuild. restart()
    // re-fetches the bin while the panel frame stays put (topbar/footer keep
    // their DOM nodes); refresh the count once the reload settles.
    const list = this.getPart && this.getPart(_a.list);
    if (list && typeof list.restart === 'function') {
      // restart() fires _e.eod SYNCHRONOUSLY first (ui-core "flush old
      // listeners") and only then resets + refetches. A listener bound before
      // it was consumed by that flush and counted the just-reset collection:
      // "0 items", data-empty=1 (status bar + Empty Trash hidden) while the
      // list itself showed the items. Bind after, so it hears the reload's own
      // end of data. The generation drops a listener left by an earlier reload
      // that the next restart's flush would otherwise fire on an empty list.
      const gen = (this._reloadGen = (this._reloadGen || 0) + 1);
      // The count is only known at end of data. A bin larger than one page
      // (pagelength 45) gets no eod until the user scrolls to the end, so the
      // previous number would stand, now wrong. Blank it the way a first
      // mount starts (skeleton/topbar content: '') until eod fills it in.
      this.ensurePart('items-count').then((p) => p.set({ content: '' })).catch(() => { });
      // restart() resets the collection, which drops the scroll to the top.
      // Put it back once the reload lands so the user keeps their place.
      const top = list.__container ? list.__container.scrollTop : 0;
      list.restart();
      list.once(_e.eod, () => {
        if (gen !== this._reloadGen) return;
        this._updateItemsCount();
        if (top && list.__container) list.__container.scrollTop = top;
      });
    } else {
      // List not mounted yet (first render / mid-teardown) — fall back.
      this.feed(require('./skeleton')(this));
    }
  }

  /**
   * Revealed again by the desk (_showPanel, keep-alive re-show). If bin
   * content changed while parked — "delete 30 files, then open the Trash" —
   * reload now rather than after the debounce, so the reopened panel does
   * not sit on the old list for another 600ms. Nothing changed: no request,
   * the reveal stays instant.
   */
  onPanelShown() {
    if (!this._staleWhileParked) return;
    this._staleWhileParked = false;
    this._wsRefresh();
    if (this._wsRefresh.flush) this._wsRefresh.flush();
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
          // Rows or the empty state are on screen. A reload's screen restore
          // waits on this (libs/items-ready).
          markItemsReady(this);
          this.ensurePart('items-count').then((p) => {
            p.set({ content: LOCALE.X_ITEMS_FOUND.format(count) });
          });
          this._refreshStorageUsed();
        });
        // A failed first page fires `error`, never `eod` (ui-core list
        // onServerComplain) — and a failed load is still a finished one.
        child.once(_e.error, () => markItemsReady(this));
        break;
      case 'storage-info':
        this._refreshStorageUsed();
        break;
    }
  }

  onDomRefresh() {
    this.feed(require('./skeleton')(this));
    // Cover the workspace at ≤ 1024px (see libs/desk-canvas).
    if (this._untrackCanvas) this._untrackCanvas();
    this._untrackCanvas = trackDeskCanvas(this.el);
    // rAF so the "out" → "in" flip lands in a separate frame and the
    // CSS transform transition actually engages.
    requestAnimationFrame(() => {
      if (!this.el) return;
      this.el.dataset.anim = "in";
      // An echo that landed before this frame (a background tab holds rAF
      // back) was parked by _wsRefresh, and desk _showPanel will not call
      // onPanelShown for a panel it never saw as "out" — replay it here.
      if (this._staleWhileParked) this.onPanelShown();
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
      // The last row was removed locally (restore / delete). ui-core only
      // shows the empty state from a server answer, so the list sat blank
      // until a reload brought "Nothing in trash" in. Show it now, the same
      // way List.handleResponse does.
      if (!count && listPart.collection && !listPart.collection.length && listPart.phContent) {
        listPart.collection.cleanSet(listPart.phContent);
        listPart.__placeholder = listPart.children.last();
      }
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
    if (!nid || this._restoring.has(nid)) return;
    this._restoring.add(nid);
    this._markLocalRestore(nid);
    try {
      const restored = await this._doRestore(media, nid, hub_id);
      if (restored === null) return; // user cancelled the fallback prompt
      if (!restored) {
        // A failed request resolves undefined (doRequest swallows the throw),
        // and this used to return silently: the row stayed, nothing was said,
        // and Restore looked like it did nothing. A 403 was already explained
        // by onServerComplain (libs/permission-denied); don't bury it.
        if (!require("libs/permission-denied").saidRecently()
          && typeof Butler !== "undefined" && Butler.say) {
          Butler.say(LOCALE.RESTORE_FAILED);
        }
        return;
      }
      media.suppress();
      this._updateItemsCount();
      this._refreshStorageUsed();
      this._revealRestored(restored);
    } finally {
      this._restoring.delete(nid);
    }
  }

  /**
   * Restore one node, to its original place when it still exists, otherwise
   * (after asking) to the top of the workspace it came from.
   * @returns {Object|null|undefined} the restored node; null when the user
   *   declined the fallback; undefined when the server refused.
   */
  async _doRestore(media, nid, hub_id) {
    const data = await this.postService({
      service: SERVICE.media.restore,
      nid,
      hub_id,
    }).catch(() => null);
    if (!data || data.error) return undefined;
    if (!data.parent_missing) {
      return {
        ...data,
        nid: data.nid || data.id || nid,
        hub_id: data.hub_id || hub_id,
        pid: data.pid || data.parent_id || media.mget(_a.pid),
        filetype: data.filetype || media.mget(_a.filetype),
      };
    }

    // The original folder is gone. The fallback used to be the user's personal
    // home even for an item deleted inside a shared workspace, so it left its
    // workspace. Stay in the same workspace (its root) while that workspace is
    // alive; only a node from the personal drive, or from a workspace that no
    // longer exists, goes to home. mfs_show_bin gives home_id for workspace
    // rows only (NULL on the personal drive's own rows).
    const inWorkspace = hub_id && hub_id !== Visitor.id
      && media.mget('home_id') && ~~media.mget('hub_exists') !== 0;
    const dest_hub = inWorkspace ? hub_id : Visitor.id;
    const dest_pid = inWorkspace ? media.mget('home_id') : Visitor.get(_a.home_id);

    // No || fallbacks: LOCALE is a createSafeObject — a missing key comes back
    // as the truthy key STRING, so a fallback branch can never run.
    this._restoreConfirmOpen = true;
    const confirmed = await Wm.confirm({
      title: LOCALE.RESTORE,
      message: inWorkspace ? LOCALE.Q_RESTORE_TO_WORKSPACE : LOCALE.Q_RESTORE_TO_HOME,
      confirm: LOCALE.RESTORE,
      confirm_type: 'primary',
      cancel: LOCALE.CANCEL,
      cancel_type: 'secondary',
      mode: 'hbf',
    }).then(() => true).catch(() => false);
    this._restoreConfirmOpen = false;
    if (!confirmed) return null;

    const res = await this.postService({
      service: SERVICE.media.restore_into,
      hub_id: dest_hub,
      recipient_id: dest_hub,
      pid: dest_pid,
      list: [{
        nid,
        pid: dest_pid,
        hub_id,
        recipient_id: dest_hub,
      }],
    }).catch(() => null);
    // The answer was never looked at: the row was removed even when the server
    // restored nothing (`{denied}`, or an empty list after mfs_restore_into_next
    // rolled back), so the item vanished here and was back on the next open.
    // A single-row list collapses to an object.
    if (!res || res.error || res.denied) return undefined;
    const rows = (Array.isArray(res) ? res : [res]).filter((r) => r && (r.nid || r.id));
    const row = rows.find((r) => `${r.nid || r.id}` === `${nid}`) || rows[0];
    if (!row) return undefined;
    return {
      ...row,
      nid: row.nid || row.id,
      hub_id: row.hub_id || dest_hub,
      pid: row.pid || row.parent_id || dest_pid,
      filetype: row.filetype || media.mget(_a.filetype),
    };
  }

  /**
   * Take the user to where the item landed: close the Trash, then
   *  - a restored workspace → open it (Wm.loadWorkspace, as a search hit does);
   *  - an item of a shared workspace → dock that workspace, open the item's
   *    folder and highlight it (Wm.openNotificationLocation, the notification
   *    reveal);
   *  - an item of the personal drive → the same reveal through
   *    Wm.openFileLocation, which is what a search hit on it uses.
   */
  _revealRestored(node) {
    if (!node || !node.nid || typeof Wm === "undefined") return;
    if (typeof Desk !== "undefined" && Desk && _.isFunction(Desk._closeUtilityPanel)) {
      Desk._closeUtilityPanel("toggle-trash");
    } else if (this.el) {
      this.el.dataset.anim = "out";
    }
    let landing;
    if (node.filetype === _a.hub) {
      // A trashed hub row carries the parent drive as hub_id; its own id is nid.
      if (_.isFunction(Wm.loadWorkspace)) landing = Wm.loadWorkspace({ hub_id: node.nid, nid: 0 });
    } else {
      const target = {
        nid: node.nid,
        hub_id: node.hub_id,
        pid: node.pid,
        filetype: node.filetype,
        highlight: 1,
      };
      if (node.hub_id !== Visitor.id && _.isFunction(Wm.openNotificationLocation)) {
        landing = Wm.openNotificationLocation(target);
      } else if (_.isFunction(Wm.openFileLocation)) {
        landing = Wm.openFileLocation(target);
      }
    }
    Promise.resolve(landing).catch((e) => {
      this.warn("[trash] reveal after restore failed", e);
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

  // Empty Trash confirmation. Renders our own dialog (skeleton/purge-confirm)
  // into Wm.__wrapperModal rather than going through Wm.confirm, so the content
  // cannot be lost on the way to window_confirm's body and no window-manager
  // instance stamps inline offsets on it. The wrapper is already a centring
  // flex container, so the dialog needs no position of its own.
  async _emptyBin() {
    const w = Wm && Wm.__wrapperModal;
    if (!w) return;
    // Held while the user decides, so a websocket echo cannot reload the list
    // mid-decision. Replayed by the cancel path; confirm re-feeds anyway.
    this._purgeConfirmOpen = true;
    w.feed(require("./skeleton/purge-confirm")(this));
    // The host is only SIZED by this attribute (wm/skin: position:absolute,
    // inset:0, 100%x100%), and it is what makes it centre its child. Every
    // other path that feeds this wrapper sets it the same way — wm/index.js
    // openRequestAccessModal, invite-popup in its own onDomRefresh.
    if (w.el) w.el.dataset.state = "open";
  }

  // Shared close for both outcomes. The wrapper's own behavior flips
  // data-state back to closed once it empties, so clear() is all that is needed.
  _closePurgeConfirm() {
    this._purgeConfirmOpen = false;
    const w = Wm && Wm.__wrapperModal;
    if (w && typeof w.clear === "function") w.clear();
  }

  async _confirmEmptyBin() {
    this._closePurgeConfirm();
    const data = await this.postService({
      service: SERVICE.media.empty_bin,
      hub_id: Visitor.id,
    }).catch(() => null);
    // The `overlay` part used to be cleared here, because that is where the
    // panel-scoped purge prompt lived. Nothing feeds it any more (the prompt is
    // Wm.confirm, which closes itself), so the clear was a no-op. The part is
    // still rendered by skeleton/index.js and is now unused — worth removing
    // along with skeleton/confirm.js and the __purge-* styles in a tidy-up.
    if (data) RADIO_MEDIA.trigger(_a.free, data);
    // Full re-feed below IS the freshest state — drop any reload held back
    // while the prompt was open, including a debounce timer still
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
      // Both are raised by skeleton/purge-confirm's buttons. _confirmEmptyBin is
      // the purge itself; the cancel path just closes and replays anything the
      // decision held back.
      case 'confirm-empty-bin':
        return this._confirmEmptyBin();
      case 'cancel-empty-bin':
        this._closePurgeConfirm();
        // Replay a reload that was held back while the prompt was up.
        if (this._pendingWsRefresh) this._wsRefresh();
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
