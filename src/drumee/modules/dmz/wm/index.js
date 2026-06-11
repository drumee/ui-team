const winman = require('window/manager');
const WS_EVENT = "ws:event";

class __dmz_wm extends winman {
  constructor(...args) {
    super(...args);
    this.capture = this.capture.bind(this);
    this._upload = this._upload.bind(this);
    this.reorder = this.reorder.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.getLocalSelection = this.getLocalSelection.bind(this);
    this._getViewerPosition = this._getViewerPosition.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.openContent = this.openContent.bind(this);
    this._getFile = this._getFile.bind(this);
    this.download = this.download.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this._displayContent = this._displayContent.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
  }

  static initClass() {
    this.prototype.fig = 1;
    this.prototype.events = {
      drop: '_upload',
      dragenter: 'fileDragEnter',
      dragover: 'fileDragOver'
    };
  }


  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    super.initialize(opt);
    this.offsetY = 0;
    this.declareHandlers();
    this.isDmz = 1;
    this.offsetHeight = 230;
    this.mset({
      nid: opt.nid,
      home_id: opt.home_id,
      hub_id: opt.hub_id
    });
  }

  /**
   * 
   */
  onDestroy() {
    this.unbindEvent();
  }

  /**
   * 
   * @param {*} m 
   * @returns 
   */
  capture(m) {
    if (!m) return
    if (!m.isPseudo) {
      this.warn("Accept only pseudo media", m);
      return;
    }
    const t = this.selectWindow(m);
    if (!t) {
      return;
    }
    return this._target = t.seek_insertion(m);
  }

  /**
   * 
   * @returns 
   */
  route() {
    const args = Visitor.parseModule();
    if (args[3] !== 'wm') {
      return;
    }
    let opt = Visitor.parseModuleArgs();
    switch (args[4]) {
      case _a.open:
        if (opt.filetype == _a.folder) {
          return;
        }

        const fileTypes = [_a.audio, _a.video, _a.image, _a.video, _a.document];
        if ((opt.kind == _a.media) || fileTypes.includes(opt.filetype)) {
          return this.fetchMediaAttributes(opt);
        }
        var o = null;
        if (opt.Kind) {
          o = { explicit: 1 };
        }
        this.launch(opt, o);
        break;

      case 'mfs':
        this.fetchMediaAttributes(opt);
        break;

    }
  }

  /**
   * Force the share's privilege onto every window opened from the DMZ WM so
   * players never inherit the file's full hub privilege from node_info.
   */
  getWindowPreset(c, opt) {
    const item = super.getWindowPreset(c, opt);
    item.privilege = ~~this.mget(_a.privilege);
    return item;
  }

  /**
  *
  */
  fetchMediaAttributes(opt) {
    return this.fetchService(SERVICE.media.node_info, {
      nid: opt.nid,
      hub_id: opt.hub_id
    }).then((r) => {
      let m = new Backbone.Model(r);
      opt = { ...opt, ...r };
      // node_info returns the file's full hub privilege; override with the
      // share's restricted privilege so players respect the share access level.
      if (this.isDmz) opt.privilege = this.mget(_a.privilege);
      Kind.waitFor(_a.media).then((k) => {
        opt.media = new k({ model: m });
        this.launch(opt, { explicit: 1 });
      })
    }).catch((e) => {
      this.warn("Failed to fetch info", e)
      Butler.say(LOCALE.SOMETHING_WENT_WRONG);
    });
  }

  /**
   * 
   */
  insert() { }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  _upload(e) {
    return this.upload(e, this.mget(_a.token));
  }

  /**
   * 
   * @param {*} m 
   * @returns 
   */
  reorder(m) {

  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @returns 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case "browser-wraper":
        return this._content = child;

      case _a.list:
        this.iconsList = child;
        break;

      case 'windows-layer':
        this.windowsLayer = child;
        child.onAddKid = c => {
          c.once(_e.destroy, () => {
            const last = child.children.last();
            if ((last != null) && _.isFunction(last.raise)) {
              return last.raise();
            }
          })
          child.el.style.width = '';
          return child.el.style.height = '';
        }

        child.collection.on(_e.remove, function () { });
        return child.on(_e.show, () => {
          this.trigger("content:ready", child);
          this.route();
        });

      default:
        super.onPartReady(child, pn);
    }
  }

  /**
   * Abstract
   */
  autoMenu() {
  }

  /**
   * 
   */
  getLocalSelection() {
    const f = [];
    this.iconsList.children.each(function (c) {
      if (c.model.get(_a.state)) {
        return f.push(c);
      }
    });
    if (_.isEmpty(f)) return this.iconsList.children.toArray();
    return f;
  }

  /**
   * 
   * @param {*} c 
   */
  _getViewerPosition(c) {
    const width = this.$el.width();
    const height = this.$el.height();
    const p = c.$el.position();
    p.width = _K.docViewer.width; //_K.browser.width
    p.height = _K.docViewer.height; //_K.browser.height
    p.zIndex = 1000 + this.windowsLayer.collection.length;
    if ((p.left + _K.docViewer.width) > width) {
      p.left = width - _K.docViewer.width - 52;
      if (p.left < 0) {
        p.left = 0;
      }
    }
    if ((p.top + _K.docViewer.height) > height) {
      p.top = height - _K.docViewer.height - 52;
      if (p.top < 0) {
        p.top = 0;
      }
    }
    return p;
  }

  /**
  *
  */
  async onDomRefresh() {
    await Kind.waitFor('window_confirm');
    await Kind.waitFor('media_uploader');
    this.feed(require('./skeleton').default(this));
    let timer = setInterval(() => {
      let event = wsRouter.hasListener(this);
      if (event && event.length) {
        clearInterval(timer);
        return;
      }
      this.bindEvent("live");
    }, 2000)

  }

  /**
   *
   */
  // handleUpload() {
  //   let target = this.getActiveWindow();
  //   return this.__fileselector.open((e) => {
  //     if (target && target !== this) target.raise();
  //     this.upload(e);
  //   });
  // }


  /**
   * 
   * @param {*} url 
   * @param {*} nid 
   * @returns 
   */
  _getFile(url, nid) {
    $(`#${nid}`).remove();
    const link = document.createElement(_K.tag.a);
    link.setAttribute(_a.download, null);
    link.style.display = _a.none;
    document.body.appendChild(link);
    link.setAttribute(_a.href, url);
    link.setAttribute(_a.id, nid);
    const $el = $(`#${nid}`);
    const f = () => {
      return $el[0].click();
    };
    this.waitElement($el[0], f);
    return link;
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args) {
    if (args == null) { args = {}; }
    const service =
      args.service ||
      cmd.service ||
      (cmd.model && cmd.model.get(_a.service));
    switch (service) {
      case _e.download:
        return this.download();

      case _e.upload:
        return this.__fileselector.open(this._upload.bind(this));

      case "open-node":
        return this.openContent(cmd);

      case "filter-by-type":
        this.ensurePart(_a.list).then((l) => {
          l.setApi(this.getCurrentApi(cmd.options.value));
          l.restart();
        });
        return;

      case "add-folder":
        return this.ensurePart("wrapper-modal").then((p) => {
          p.feed(require("builtins/window/folder/skeleton/create-folder-dialog")(this));
          p.el.dataset.mode = "create-folder";
          this.ensurePart("create-folder-name").then(
            (entry) => entry.focus && entry.focus(),
          );
        });

      case "close-folder-dialog":
        return this.ensurePart("wrapper-modal").then((p) => {
          p.el.dataset.mode = "";
          p.clear();
        });

      case "create-folder-submit":
        return this._createFolder(cmd);

      default:
        return this.warn(WARNING.method.unprocessed.format(service));
    }
  }

  /**
   * Create a sub-folder in the shared folder. media.make_dir has the same
   * ACL as media.upload (scope:hub, write) — a write-capable DMZ guest can
   * call it with the share token.
   *
   * @param {*} cmd — the create-folder-submit command (EntryBox or button)
   */
  _createFolder(cmd) {
    if (this._creatingFolder) return;
    this._creatingFolder = 1;
    const entry = this.getPart("create-folder-name");
    const value =
      (cmd.getValue && cmd.getValue()) ||
      (entry && entry.getValue && entry.getValue()) ||
      LOCALE.NEW_FOLDER;
    const filename = String(value).trim() || LOCALE.NEW_FOLDER;
    if (/^(\.+|.+\/.+| +|\-{1,1})$/.test(filename)) {
      this._creatingFolder = 0;
      return Butler.say(LOCALE.INVALID_FILENAME);
    }
    return this.postService(SERVICE.media.make_dir, {
      hub_id: this.mget(_a.hub_id),
      nid: this.mget(_a.nid),
      dirname: filename,
      filename,
      token: this.mget(_a.token),
    })
      .then((data) => {
        if (data && (data.error || data.error_code)) {
          return Butler.say(LOCALE[data.error] || data.reason || data.error);
        }
        this.ensurePart("wrapper-modal").then((p) => {
          p.el.dataset.mode = "";
          p.clear();
        });
        this.ensurePart(_a.list).then((l) => l && l.restart && l.restart());
      })
      .catch((e) => {
        this.warn("DMZ create folder failed", e);
        Butler.say(e.reason || e.error || LOCALE.TRY_AGAIN);
      })
      .finally(() => {
        this._creatingFolder = 0;
      });
  }

  /**
   * Build the list API for a given filter type. Mirrors window/core.js getCurrentApi
   * but reuses the dmz initial api (set by desk-content.js) as the base so nid /
   * hub_id / share_id / recipient_id aren't lost on filter switches.
   *
   * @param {string} type — one of "all" | "docs" | "pdf" | "image" | "other"
   */
  getCurrentApi(type) {
    const original = this.mget(_a.api) || {};
    const base = {
      service: SERVICE.media.show_node_by,
      page: 1,
      order: _K.order.descending,
      hub_id: this.mget(_a.hub_id),
      nid: this.mget(_a.nid),
      share_id: original.share_id,
      recipient_id: original.recipient_id,
      file_nid: original.file_nid,
    };
    switch (type) {
      case "all":
      case "docs":
      case "pdf":
      case "image":
      case "other":
        return { ...base, type };
      default:
        return base;
    }
  }

  /**
   * 
   * @param {*} data 
   * @returns 
   */
  _displayContent(data) {
    return this.feed(require("./skeleton").default(this, data));
  }


  /**
  * 
  */
  selectItems(data, key = _a.nid, value) {
    value = value || data[key];
    return this.getItemsByAttr(key, value).filter((c) => {
      if (!c) return false;
      if (!data.privilege) {
        data.privilege = c.mget(_a.privilege);
      }
      return (c.isMfs || c.isFolder)
      // return c.isMfs
    })
  }


  /**
   * 
   * @param {*} data 
   */
  onNewHub(data) {
    this.warn("This feature is not allowed within as DMZ", data);
  }

  /**
   * 
   * @param {*} service 
   * @param {*} data 
   * @param {*} options 
   * @returns 
   */
  newContent(xhr, options = {}) {
    if ((this.mget(_a.api) || {}).file_nid) return;
    super.newContent(xhr, options);
  }

  onWsMessage(service, data, options = {}) {
    let items = [];
    let sender = options.sender;
    this.verbose("[356]onWsMessage:", options.service, data.socket_id, data, options);
    if (sender && sender.socket_id == Visitor.get(_a.socket_id)) {
      if (!options.loopback) return;
    }
    this.trigger(WS_EVENT, { service, data, options })
  }


  /**
   * 
   * @param {*} method 
   * @param {*} data 
   * @returns 
   */
  __dispatchRest(method, data) {
    switch (method) {
      case SERVICE.media.show_node_by:
        return this._displayContent(data);

      case SERVICE.media.download:
        var {
          id
        } = data;
        var h = data.vhost;
        let { svc, protocol, keysel, main_domain, localhost} = bootstrap();
        let url = `${protocol}://${h}${svc}/media.zip?id=${id}&keysel=${keysel}&zipname=${data.zipname}`;
        if(localhost){
           url = `${protocol}://${main_domain}${svc}/@{h}/media.zip&id=${id}&keysel=${keysel}&zipname=${data.zipname}`;
        }
        return this._getFile(url, id);
    }
  }
}
__dmz_wm.initClass();

module.exports = __dmz_wm;
