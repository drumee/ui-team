const { filesize, arcLength } = require("core/utils")

const __spinner = '-\|/';
const { uploadFile } = require("core/socket/upload")

class __media_uploader extends LetcBox {
  constructor(...args) {
    super(...args);
    this._run = this._run.bind(this);
    this.uploadFile = uploadFile.bind(this);
  }


  /** 
   * 
  */
  initialize(opt = {}) {
    super.initialize(opt);
    this.model.atLeast({
      percent: 0
    });
    this.declareHandlers();
    this._queue = []; /** Items being sent to server */
    this._buffer = []; /** Temporary queue of items to avoid too large _queue */
    this._started = 0;
    this._bytesSent = 0;
    this._bytesToBeSent = 0;
    this._token = this.mget(_a.token);
    this.spoolTimer = setInterval(this.spool.bind(this), 200);
    this._failed = []; /** Store failed upload to retry at the end */
    this._skipped = []; /** Store failed upload after several retry */
    this._retried = {}; /** Store retry counter */
    this.xhr = [];
    this._bytesPending = 0;
    this._filesSent = 0;
    this._pendingCount = 0;
  }

  /**
   * 
   */
  onDestroy() {
    clearInterval(this.spoolTimer);
  }

  /**
   * 
   */
  _onCompletion() {
    clearInterval(this.spoolTimer);
    this.status = _a.end;
    this.trigger(_e.eod);
    this.softDestroy();
  }

  /**
   * 
   */
  purgeCompletedTask() {
    let i = 0;
    for (let xhr of this.xhr) {
      if (xhr.status === 200) {
        let { data } = JSON.parse(xhr.responseText);
        if (data && data.nid) {
          this.xhr.splice(i, 1)
        }
      }
    }
  }


  /**
   * 
   */
  spool() {
    /** Check if we are done */
    if (this._buffer.length == 0 && this._queue.length == 0) {
      /** Ensure there are no failed to retry */
      if (this._failed.length == 0) {
        this.purgeCompletedTask();
        if (this.xhr.length > 0) return;
        setTimeout(this._onCompletion.bind(this), 500);
        return
      }
      if (this._failed.length) {
        let failed = this._failed.shift();
        if (failed) {
          this._queue.push(failed);
        }
      }
    }
    /** Still files in buffer */
    if (this._buffer.length) {
      let item = this._buffer.shift();
      if (item) {
        this._queue.push(item);
      }
    }
    this._run();
  }

  /** 
   * 
  */
  onUploadProgress(e) {
    if (!e.lengthComputable) {
      if ((this._index == null)) {
        this._index = 0;
      }
      this._index = this._index % 4;

      if (this._percent != null) {
        this._percent.set({
          content: __spinner[this._index]
        });
      }
      this._index++;
      return;
    }
    const rate = (e.loaded + this._bytesSent) / this._bytesToBeSent;
    const val = parseInt(100 * rate);

    if (this.mget(_a.mode) === _a.row) {
      if (this.$progress != null) {
        this.$progress.css({
          width: val + "%"
        });
      }
    } else {
      if (this.$progress != null) {
        this.$progress.css({
          strokeDashoffset: arcLength(val)
        });
      }
    }

    if (this._percent) {
      this._percent.set({
        content: val + "%"
      })
    }
  }

  /** 
  * 
 */
  onLoad(e) {
    this.ensurePart("ref-filename").then((p) => {
      if (this.pendingItem) {
        let { file } = this.pendingItem;
        p.set({ content: file.name });
      }
    })
  }

  /** 
   * 
  */
  onUploadResponse(data) {
    RADIO_MEDIA.trigger(_e.uploaded, data)
    if (this.mget("isFolder") || this.mget("uploadingInplace")) {
      return
    }
    this.trigger("upload:response", data);
  }

  /**
   * 
   * @param {*} e 
   */
  onTimeout(e) {
    this.warn("GOT TIMEOUT", e);
  }

  /** 
   * 
  */
  onUploadError(item) {
    let { file } = item;
    this._pendingCount--;
    this._bytesPending = this._bytesPending - file.size;
    if (item && item.file) {
      let retry = this._retried[item.ownpath] || 0;
      this.warn("Upload failed", item.ownpath, retry);
      if (retry > 5) {
        if (!this._skipped.includes(item.ownpath)) {
          this._skipped.push(item.ownpath)
        }
        return;
      }
      /** Deduplicate */
      this._retried[item.ownpath] = retry + 1;
      if (this._failed.includes(item.ownpath)) return;
      item.replace = 1;
      this._failed.push(item);
    }
  }

  /**
   * 
   */
  getFailed() {
    return this._skipped;
  }

  /** 
   * 
  */
  onUploadEnd(e) {
    if (e.lengthComputable) {
      this._bytesSent = e.total + this._bytesSent;
    }
    //this.xhr.shift();
    this._filesSent++;
    this._pendingCount--;
    if (this._canceled) {
      clearInterval(this.spoolTimer);
      this.trigger(_e.cancel);
    }
  }

  /**
   * 
   * @param {*} file 
   */
  updateSize(file) {
    this.ensurePart("ref-filesize").then((p) => {
      this._bytesToBeSent = this._bytesToBeSent + file.size;
      this._remain = this._bytesToBeSent;
      p.set({ content: filesize(this._bytesToBeSent) });
    })
    this.ensurePart("ref-filename").then((p) => {
      p.set({ content: file.name });
    })
  }

  /**
   * 
   * @param {*} size 
   * @returns 
   */
  quotaOk(size) {
    if (!size) return true;
    if (Visitor.diskFree() < size) {
      RADIO_MEDIA.trigger("quota:exceeded", { type: 'disk' });
      this.trigger("quota:exceeded");
      this.goodbye();
      return false;
    }
    Visitor.diskUsed(size);
    return true;
  }

  /** 
   * 
  */
  checkQuota(item) {
    const { file } = item;
    return new Promise((accept, reject) => {
      if (!file) {
        return reject()
      }
      if (file.isFile) {
        file.file(f => {
          if (this.quotaOk(f.size)) {
            this.updateSize(f);
            return accept(f);
          }
          reject(item);
        });
      } else {
        if (file.size != null) {
          if (this.quotaOk(file.size)) {
            this.updateSize(file);
            return accept(file);
          }
          reject(item);
        }
      }
    })
  }

  /** 
   * 
  */
  add(items) {
    const enqueue = (item) => {
      this.checkQuota(item).then((file) => {
        if (!this._started) {
          this._started = 1;
          if (this._queue.length < 5) {
            this._queue.push({ ...item, file });
            return
          }
        }
        this._buffer.push({ ...item, file });
      }).catch((e) => {
        this._pendingCount--;
        this._bytesPending = this._bytesPending - item.file.size;
        this.warn("UPLOAD_ERROR", e);
      })
    };

    if (_.isArray(items)) {
      return Array.from(items).map((item) =>
        enqueue(item));
    } else {
      enqueue(items);
    }
  }

  /** 
   * 
  */
  _send(item) {
    let {
      destination: dest,
      replace,
      position,
      ownpath,
      file
    } = item;
    if (!dest) {
      dest = {
        nid: item.nid,
        hub_id: item.hub_id,
        notify: item.notify || 0,
        single: item.single,
        destpath: item.destpath
      }
    }
    const opt = {
      nid: dest.nid,
      hub_id: dest.hub_id,
      token: this._token,
      notify: dest.notify || 0,
      single: dest.single,
      position,
      replace
    };
    if (ownpath) {
      opt.ownpath = ownpath;
      const { destpath } = dest;
      if (destpath) {
        let re = new RegExp('^' + destpath);
        if (re.test(ownpath)) {
          opt.ownpath = ownpath;
        } else {
          opt.ownpath = destpath + ownpath;
        }
      }
      opt.ownpath = opt.ownpath.replace(/\/{2,}/, '/');
    }
    opt.echoId = this.mget("echoId");
    this._bytesPending = this._bytesPending + file.size;
    let xhr;
    try {
      xhr = this.uploadFile(file, opt);
      xhr.file = file;
      this.xhr.push(xhr)
      this._pendingCount++;
    } catch (e) {
      this._bytesPending = this._bytesPending - file.size;
      this._pendingCount--;
      this.warn("_send[331]: failed to upoad", e)
    }
  }

  /**
   * 
   */
  isCanceled() {
    return this._canceled;
  }

  /** 
   * 
  */
  _run() {
    if (this._canceled) {
      clearInterval(this.spoolTimer);
      return;
    }
    const item = this._queue.shift();
    if ((item == null)) {
      return;
    }
    this._send(item);
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
      case "ref-percent":
        this._percent = child;
        break;

      case "ref-filesize":
        this._filesize = child;
        break;

      case "ref-chart":
        this._chart = child;
        this.waitElement(child.el, () => {
          if (this.mget(_a.mode) === _a.row) {
            child.$el.append(require('./template/row')(this));
          } else {
            child.$el.append(require('./template/grid')(this));
          }
          return this.$progress = $(`#${this._id}-fg`);
        });
        break;

      case "ref-filename":
        this._filename = child;
        break;

      default:
        return;
    }
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    if (this.mget(_a.mode) === _a.row) {
      return this.feed(require('./skeleton/row')(this));
    } else {
      return this.feed(require('./skeleton/grid')(this));
    }
  }


  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    if (mouseDragged) {
      return;
    }

    switch (service) {
      case _e.cancel:
        this._canceled = true;
        this.status = _e.cancel;
        this.trigger(_e.cancel);
        for (let xhr of this.xhr) {
          xhr.abort();
        }
        if (this.xhr.length) {
          const f = () => {
            this.status = _a.end;
            this.trigger(_e.eod);
            this.softDestroy();
          };
          setTimeout(f, 500)
        }
    }
  }
}

module.exports = __media_uploader;    
