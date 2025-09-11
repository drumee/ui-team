const { filesize, dataTransfer } = require("core/utils")
const { makeHeaders } = require("core/socket/utils")
const PROPERTIES = [
  _a.area,
  _a.actual_home_id,
  _a.ctime,
  _a.ext,
  _a.filename,
  _a.filepath,
  _a.filetype,
  _a.filesize,
  _a.geometry,
  _a.home_id,
  _a.hub_id,
  _a.isalink,
  _a.isalink,
  _a.md5Hash,
  _a.metadata,
  _a.mtime,
  _a.nid,
  _a.origin,
  _a.ownpath,
  _a.pid,
  _a.privilege,
  _a.status,
]

/**
 *
 */
function svcUrl(o) {
  let { svc, keysel } = bootstrap();
  if (!_.isObject(o)) {
    return o;
  }
  let s = `${svc}media.zip?keysel=${keysel}&`;
  for (let k in o) {
    const v = o[k];
    s = `${s}&${k}=${v}`;
  }
  return s;
}


const OPEN_NODE = "open-node";
const pseudo_media = require("media/pseudo");
const DATEFORMAT = "DD MMM YY HH:MM:ss";

class __core_mfs extends LetcBox {

  constructor(...args) {
    super(...args);
  }

  /**
   *
   */
  unselect() {
    // Abstract -- do not remove
  }

  /**
   *
   * @param {*} permission
   */
  isGranted(permission) {
    return this.mget(_a.privilege) & permission;
  }

  /**
   * 
   */
  initData() {
    const ctime = this.mget(_a.createTime) || 0;
    const m = Dayjs.unix(ctime); //Dayjs()(ctime, "X");
    this.model.set(_a.age, m.fromNow());
    this.model.set(_a.date, m.format(DATEFORMAT));
    this.model.set(_a.size, filesize(this.mget(_a.filesize)));
    this.model.atLeast({
      date: Dayjs.unix(Dayjs().unix()),
    });
    if (this.mget(_a.file)) {
      return this.mset({
        filename: this.mget(_a.name),
      });
    }
    this.isMfs = 1;
    if ([_a.hub, _a.folder].includes(this.mget(_a.filetype))) {
      this.mset({ filesize: 0 });
    } else {
      this.mset({ filesize: parseInt(this.mget(_a.filesize)) });
    }
    this.metadata();
  }

  /**
   * @param {*} response
   */
  onUploadEnd(response, restartEvent) {
    const { error_code, error, data } = response;
    switch (error_code) {
      case 400:
        if (/.+exceeded$/.test(error)) {
          Butler.upgrade().then(() => {
            this.goodbye();
          })
          return;
        }
        break;
      case 402:
        Butler.upgrade().then(() => {
          this.goodbye();
        })
        return;
      case 200:
        break;
      default:
        if (error) {
          Butler.say(error);
          this.suppress();
          return;
        }
    }
    data.format = this.mget(_a.format) || _a.card;
    const handler = this.mget(_a.uiHandler) || this.getLogicalParent() || Wm;
    if (this.mget(_a.file) != null || this.isReplacing) {
      // set by behavior
      data.kind = this._getKind();
      data.signal = _e.ui.event;
      data.service = OPEN_NODE;
      data.uiHandler = handler;
      data.isAttachment = this.isAttachment();
      data.recipient_id = Visitor.dmzRecipientToken;
      this.model.clear();
      this.model.set(data);
      this.initData();
      this.initURL();
      if (this.isAttachment()) {
        this.trigger(_e.restart);
        this.onDomRefresh();
        this.status = null;
      } else {
        this.restart(restartEvent);
      }
      this.enablePreview();
    } else {
      this.initData();
      this.initURL();
      this.restart(restartEvent);
      this.enablePreview();
    }

    const f = () => {
      return this.logicalParent.unselect(2);
    };
    _.delay(f, 1000);
  }

  /**
   *
   * @param {*} items
   * @param {*} p
   * @param {*} token
   * @returns
   */
  _sendTo(target, items, p, token) {
    let f, pm;
    const a = [];
    for (f of Array.from(items.files)) {
      pm = new pseudo_media({ phase: _a.upload });
      pm.mset(_a.file, f);
      if (token) {
        pm.mset(_a.token, token);
      }
      a.push(pm);
    }
    for (f of Array.from(items.folders)) {
      pm = new pseudo_media();
      pm.mset(_a.folder, f);
      if (token) {
        pm.mset(_a.token, token);
      }
      a.push(pm);
    }

    if (!_.isEmpty(a)) {
      return target.insertMedia(a, p);
    }
  }

  /**
   *
   * @param {*} target
   * @param {*} e
   * @param {*} p
   * @param {*} token
   * @returns
   */
  sendTo(target, e, p, token) {
    const r = dataTransfer(e);
    this._sendTo(target, r, p, token);
  }

  /**
   * 
   * @returns 
   */
  download_tree() {
    let nid;
    if (this.mget(_a.filetype) === _a.hub) {
      nid = this.mget(_a.actual_home_id);
    } else {
      nid = this.mget(_a.nid);
    }
    if (!wsRouter.check_sanity()) {
      Butler.say(LOCALE.ERROR_NETWORK);
      return;
    }
    this.postService({
      service: SERVICE.media.download,
      nid,
      hub_id: this.mget(_a.hub_id),
      // token     : this.mget(_a.token),
      socket_id: Visitor.get(_a.socket_id),
    });
    this._waitingForZip = this.mget(_a.nid);
  }

  /**
   * 
   * @param {*} o 
   * @returns 
   */
  download_zip(o) {
    let type = this.mget(_a.filetype);
    let filename =
      this.mget(_a.filename) ||
      o.zipname ||
      Dayjs().format("[drumee]-YYYY-MM-DD");
    let hub_id = this.mget(_a.hub_id);
    let nid = this.mget(_a.nid);

    switch (type) {
      case null:
      case undefined:
        if (!Visitor.inDmz) {
          nid = Visitor.get(_a.home_id);
          hub_id = Visitor.get(_a.id);
        }
        break;
      case _a.hub:
        nid = this.mget(_a.actual_home_id);
        hub_id = this.mget(_a.hub_id);
        break;
      default:
        hub_id = this.mget(_a.hub_id);
        nid = this.mget(_a.nid);
    }
    let url = svcUrl({
      hub_id,
      nid,
      id: o.zipid,
      name: o.zipname,
      backup: o.backup,
    });
    filename = `${filename}.zip`;
    return this.fetchFile({
      url,
      progress: o.progress || this._progress,
      download: filename,
    });
  }

  /**
   * 
   * @param {*} blob 
   * @param {*} filename 
   * @returns 
   */
  getBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    if (this._currentBlobURL == url) return;
    this._currentBlobURL = url;
    const a = document.createElement(_K.tag.a);
    a.download = filename || "download";
    a.hidden = "";
    a.setAttribute(_a.id, this._id + "-dl");
    a.setAttribute(_a.href, url);
    a.setAttribute(_a.target, "_blank");
    a.setAttribute("data-service", _e.download);
    a.style.position = _a.absolute;
    a.style.display = _a.none;
    try {
      this.unselect();
    } catch { }
    var clickHandler = () => {
      const f = () => {
        URL.revokeObjectURL(url);
        this._currentBlobURL = null;
        a.removeEventListener(_e.click, clickHandler);
        this.trigger(_e.eod, blob);
        this.triggerMethod(_e.eod, blob);
        a.remove();
      };
      _.delay(f, 300);
    };
    a.addEventListener(_e.click, clickHandler, false);
    a.click();
  }

  /**
   *
   */
  metadata() {
    let md = this.mget(_a.metadata) || {};
    if (_.isString(md)) {
      try {
        md = JSON.parse(md);
      } catch (e) {
        return {};
      }
    }
    let { md5Hash, dataType } = md;
    this.mset({ md5Hash, dataType });
    return md;
  }

  /**
   * 
   */
  copyPropertiesFrom(src) {
    for (let i of PROPERTIES) {
      if (src.mget(i)) {
        this.mset(i, src.mget(i));
      }
    }
  }

  /**
   * 
   * @param {*} url 
   */
  getFromUrl(url) {
    const a = document.createElement(_K.tag.a);
    a.download = "download";
    a.hidden = "";
    a.setAttribute(_a.id, this._id + "-dl");
    a.setAttribute(_a.href, url);
    a.setAttribute(_a.target, "_blank");
    a.setAttribute("data-service", _e.download);
    a.style.position = _a.absolute;
    a.style.display = _a.none;
    try {
      this.unselect();
    } catch { }
    var clickHandler = () => {
      const f = () => {
        a.removeEventListener(_e.click, clickHandler);
      };
      _.delay(f, 300);
    };
    a.addEventListener(_e.click, clickHandler, false);
    a.click();
  }
  /**
   *
   * @returns
   */
  _fetchOptions() {
    this.aborter = new AbortController();
    let headers = makeHeaders({
      'Accept': '*/*',
      'x-param-device': Visitor.device(),
      'x-param-device-id': Visitor.deviceId()
    });
    let init = {
      mode: "cors",
      cache: "default",
      guard: "request",
      method: "GET",
      signal: this.aborter.signal,
      headers
    };
    return init;
  }

  /**
   *
   * @param {*} o.downlod : non null create a blob downloadable through a link
   */
  async fetchFile(o) {
    let options = this._fetchOptions();
    return fetch(o.url, options).then((response) => {
      if (!response.ok) {
        this.warn(`Failed to fetch ${o.url}, code=${response.status}`);
        return { error: response.status };
      }
      let total = Number(response.headers.get("content-length"));
      if (total == null) {
        total = Number(this.mget(_a.filesize)) || 1000;
      }
      let reader = response.body.getReader();
      let loaded = 0;
      let type = response.headers.get("content-type").split(" ")[0];
      let chunks = [];
      let self = this;
      return reader
        .read()
        .then(function read_data(result) {
          if (result.done) {
            reader.releaseLock();
            let blob = new Blob(chunks, { type });
            if (o.progress && _.isFunction(o.progress.mget)) {
              if (o.progress.mget("autoDestroy") == _a.no) return blob;
              o.progress.goodbye();
            }
            return blob;
          }
          // enqueue received data
          let buffer = new ArrayBuffer(result.value.length);
          let chunk = new Uint8Array(buffer);
          chunk.set(result.value, 0);
          chunks.push(chunk);
          loaded += result.value.length;
          if (o.progress && _.isFunction(o.progress.update)) {
            o.progress.update({ loaded, total });
          } else {
            try {
              self.triggerMethod("fetch:progress", { loaded, total }) ||
                self.trigger(_e.progress, { loaded, total });
            } catch (e) { }
          }
          return reader.read().then(read_data);
        })
        .then((blob) => {
          if (o.download) {
            self.getBlob(blob, o.download);
          } else {
            self.trigger(_e.eod, blob);
            self.triggerMethod(_e.eod, blob);
            return blob;
          }
        });
    }).catch((e) => {
      this.warn(`ERR:413 -- Failed to fetch ${o.url}`, e);
    });
  }

  /**
   * 
   */
  download(o) {
    let { url } = this.actualNode(_a.orig);
    let type = this.mget(_a.filetype);
    let filename = this.mget(_a.filename);
    filename = filename.replace(/\<.+\>/, "");
    let pn = `${this._id}-progres`;
    if (!document.getElementById(pn)) {
      let mode = 'grid';
      if (this.getLogicalParent) {
        mode = this.getLogicalParent().getViewMode();
      }
      this.append({
        kind: "progress",
        sys_pn: pn,
        mode,
        filename: filename,
        attributes: {
          id: pn,
        },
      });
      this._progress = this.children.last();
    }
    this.trigger(_e.loaded);
    if ([_a.hub, _a.folder].includes(type)) {
      if (_.isEmpty(o)) {
        this.download_tree();
      }
      // Wait for backend to notify upon zip completion
      return;
    } else {
      const ext = this.mget(_a.extension) || this.mget(_a.ext);
      filename = `${filename}.${ext}`;
    }
    this.waitElement(pn, () => {
      this.fetchFile({
        url,
        progress: this._progress,
        download: filename,
      });
    });
  }

  /**
   *
   * @param {*} o.downlod : non null create a blob downloadable through a link
   */
  abortDownload(o) {
    this.aborter.abort({ aborted: 1 });
  }

  /**
   *
   */
  fullname(o) {
    return `${this.mget(_a.filename)}.${this.mget(_a.ext)}`;
  }

  /**
   * 
   */
  markAsSeen() {
    if (this.isHubOrFolder || Visitor.inDmz) {
      return;
    }
    // this._updateNotification(-1);
    this.postService({
      service: SERVICE.media.mark_as_seen,
      nid: this.mget(_a.nid),
      hub_id: this.mget(_a.hub_id),
      mode: "direct_call",
    });
  }
  /**
   * 
   */
  syncAttributes() {
    this.fetchService({
      service: SERVICE.media.get_node_attr,
      nid: this.mget(_a.nid),
      hub_id: this.mget(_a.hub_id),
    });
  }

  /**
   *
   * @returns
   */
  isRegularFile() {
    if (this.isHubOrFolder || this.mget(_a.isalink)) return false;
    return true;
    // let needle;
    // return (this.mget(_a.filetype)
    //   (needle = this.mget(_a.filetype)),
    //   Array.from(REGULAR_TYPES).includes(needle)
    // );
  }

  /**
   *
   * @returns
   */
  directUrl() {
    if (!this.isRegularFile()) return null;
    return this.actualNode().href;
  }

  /**
   * 
   */
  url(format) {
    let f;
    switch (this.mget(_a.type)) {
      case _a.vector:
        f = _a.orig;
        break;
      default:
        f = _a.vignette;
    }
    f = format || f;
    return super.url(f);
  }

  /**
   * 
   */
  async viewerLink(format, e) {
    const m = this.model;
    if (!format) {
      if (m.get(_a.type) === _a.vector) {
        format = _a.orig;
      } else {
        format = _a.vignette;
      }
    }
    const mData = this.actualNode();

    let data = {
      nid:
        mData.nid ||
        m.get(_a.nid) ||
        m.get(_a.actual_home_id) ||
        m.get(_a.home_id) ||
        "*",
      hub_id: mData.hub_id || m.get(_a.hub_id),
      kind: m.get(_a.kind),
    };

    if (m.get(_a.filetype)) {
      let fType = m.get(_a.filetype);
      if (fType == _a.hub) {
        fType = `${fType}_${m.get(_a.area)}`;
      }
      const opt = require("window/configs/application")(fType, "");
      data.filetype = m.get(_a.filetype);
      data.kind = opt.kind;
    }

    // for share-link with right click on media from desk
    if (m.get(_a.area) == _a.private && m.get(_a.filetype) == _a.hub) {
      data.nid = m.get(_a.actual_home_id);
      if (_.isFunction(this.getCurrentNid)) {
        data.nid = this.getCurrentNid();
      }
    }

    data = new URLSearchParams(data).toString();
    let b = bootstrap();
    this.viewerURL = `${protocol}://${b.main_domain}${b.mfs_base}${_K.module.desk}/wm/open/${data}`;
    let { nid, hub_id } = mData;
    let opt = {
      nid,
      hub_id,
    };
    let r;
    switch (m.get(_a.area)) {
      case _a.share:
      case _a.dmz:
        if (m.get(_a.filetype) == _a.hub) {
          delete opt.nid;
        }
        r = await this.fetchService(SERVICE.hub.get_external_room_attr, opt);
        if (m.get(_a.filetype) == _a.hub) {
          this.viewerURL = r.link;
        } else {
          this.viewerURL = `${r.link}/${nid}/play`;
        }
        break;
      case _a.public:
        if (m.get(_a.filetype) == _a.hub) {
          r = await this.fetchService(SERVICE.room.public_link, opt);
          this.viewerURL = r.link;
        }
    }
    return this.viewerURL;
  }

  /**
   * 
   */
  srcUrl() {
    if (!this.isRegularFile()) return null;
    return `${protocol}://${this.mget(_a.vhost)}${this.mget(_a.ownpath)}`;
  }

  /**
   * 
   */
  pluginUrl() {
    const { endpoint } = bootstrap();
    const path = `${this.getLogicalParent().mget(_a.ownpath)}`;
    return `${protocol}://${this.mget(_a.vhost)}${endpoint}#$/${path}`;
  }

  /**
   * 
   */
  getCurrentNid() {
    switch (this.mget(_a.filetype)) {
      case _a.folder:
        return this.mget(_a.nodeId);
      case _a.hub:
        return 0;
      default:
        return this.mget(_a.parentId);
    }
  }

  /**
   *
   * @returns
   */
  isSymLink() {
    return this.mget(_a.isalink) && this.mget(_a.filetype) != _a.hub;
  }

  /**
   * 
   */
  getHostName() {
    return this.mget(_a.vhost);
  }

  /**
   * 
   */
  getHostId() {
    return this.mget(_a.hub_id);
  }

  // ===========================================================
  // functions to check for media privileges
  // ===========================================================

  /**
   *
   */
  isMediaOwner() {
    return this.mget(_a.privilege) & _K.permission.owner;
  }

  /**
   *
   */
  canOrganize() {
    if (this.mget(_a.isalink) && !this.isHub) return false;
    return this.mget(_a.privilege) & _K.permission.modify;
  }

  /**
   *
   */
  canUpload() {
    if (this.mget(_a.isalink) && !this.isHub) return false;
    return this.mget(_a.privilege) & _K.permission.write;
  }

  /**
   *
   */
  canDownload() {
    return this.mget(_a.privilege) & _K.permission.download;
  }
}

module.exports = __core_mfs;
