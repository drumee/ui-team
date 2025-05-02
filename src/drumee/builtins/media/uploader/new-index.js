/*
 * decaffeinate suggestions:
 * DS002: Fix invalid constructor
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/media/uploader/uplaoder
//   TYPE : Queue manager
// ==================================================================== *

const __uploader      = require('socket/uploader');
const __spinner       = '-\|/';

//########################################

class __media_uploader extends LetcBox {
  constructor(...args) {
    this.onUploadProgress = this.onUploadProgress.bind(this);
    this.onUploadStart = this.onUploadStart.bind(this);
    this.onUploadError = this.onUploadError.bind(this);
    this.onUploadEnd = this.onUploadEnd.bind(this);
    this._send = this._send.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    super(...args);
  }

  static initClass() {
    this.prototype.figName  = "media_uploader";
  }

// ===========================================================
//
// ===========================================================
  initialize(opt) {
    if (opt == null) { opt = {}; }
    super.initialize();
    this.model.atLeast({
      percent : 0});
    this.declareHandlers();
    this._ready = 0;
    this._countdown = _.after(5, ()=> {
      return this._ready = 1;
    });
      //@_start()
      
    this.__i = 0;
    return this.setupFifo();
  }
    
// ===========================================================
//
// ===========================================================
  _count(debug) {
    this.__i++;
    //@debug "vvvaaa from#{debug}", @__i, @_fifo
    if (this.__i > 5) {
      return;
    }
    return this._countdown();
  }

// ===========================================================
//
// ===========================================================
  setupFifo() {
    //@debug "vvvaaa 43"
    this._queue = [];
    this._started = 0;
    this._sending = 0;
    this._sent    = 0;
    this._total   = 0;
    this._partial = 0;
    this._token   = this.mget(_a.token);
    this._fifo    = new Backbone.Collection();
    //@debug "ZZZZZZZZZ @_token", @_token
    return this._fifo.on(_e.add, item=> {
      //@debug "vvvaaa 55", item
      this._queue.push(item);
      if (!this._started) {
        this._count(58);
        return this._started = 1;
      }
    });
  }

// ===========================================================
//
// ===========================================================
  onUploadProgress(e, socket) {
    if (!e.lengthComputable) {
      if ((this._index == null)) {
        this._index = 0;
      }
      this._index = this._index % 4;

      if (this._percent != null) {
        this._percent.set({
        content : __spinner[this._index]});
      }
      this._index++;
      return; 
    }
    //@debug "QQZ T=#{@_total}, SENT=#{@_sent}, l=#{e.loaded}", 
    const rate = (this._sent + e.loaded) / this._total;
    const val = parseInt(100 * rate);

    if (this.mget(_a.mode) === _a.row) {
      if (this.$progress != null) {
        this.$progress.css({
        width : val + "%"});
      }
    } else { 
      if (this.$progress != null) {
        this.$progress.css({
        strokeDashoffset : Utils.arcLength(val)});
      }
    }

    return (this._percent != null ? this._percent.set({
      content : val + "%"}) : undefined);
  }

// ===========================================================
//
// ===========================================================
  onUploadStart(e, socket) {}
    //@debug "QQZ vvvaaaa AEA  91 onUploadStart", socket.get(_a.filesize)
// ===========================================================
//
// ===========================================================
  onUploadError(e, socket) {
    this.debug("Git Error but seem OK", e, socket.get(_a.filesize));
    return this.goodbye();
  }

// ===========================================================
//
// ===========================================================
  onUploadEnd(e, socket) {
    //@debug "QQZ vvvaaaa AEA  98 onUploadEnd", @_partial, @_sent
    this._sent = socket.get(_a.filesize) + this._sent;
    // @_partial = 0

    if (this._canceled) { 
      this.trigger(_e.cancel);
      return; 
    }
    this.trigger(_e.uploaded);
    return this._start();
  }

// ===========================================================
//
// ===========================================================
  updateSize() {
    //@debug "qqvvvaaaa UUSIZE 118 (add)", @_total
    return (this._filesize != null ? this._filesize.set({ 
      content : Utils.humanFileSize(this._total)}) : undefined);
  }

// ===========================================================
//
// ===========================================================
  add(item) {
    const enqueue = i=> {
      const {
        file
      } = i;
      // if file?
      if (file.isFile) {
        file.file(f=> {
          //@debug "qqvvvaaaa SIZE 118 (add)", f, @_total, f.size
          this._total = this._total + f.size;
          this._remain = this._total;
          return this.updateSize();
        });
      } else { 
        //@debug "qqvvvaaaa LLLL 118 (add)", @_total
        if (file.size != null) {
          this._total = this._total + file.size;
          this._remain = this._total;
          this.updateSize();
        }
      }
      return this._fifo.add(i); 
    };

    if (_.isArray(item)) {
      return Array.from(item).map((e) =>
        enqueue(e));
    } else { 
      return enqueue(item);
    }
  }

// ===========================================================
//
// ===========================================================
  _send(file, item) {
    this._sending++;
    const dest    = item.get(_a.destination) || this.mget(_a.destination);
    const opt = {
      file,
      filename : file.name,
      filesize : file.size,
      mimetype : file.type,
      filetype : _e.upload,
      service  : _SVC.media.upload,
      nid      : dest.nid,
      hub_id   : dest.hub_id,
      token    : this._token,
      notify   : item.get(_a.notify)
    };
    // if item.get(_a.token)
    //   opt.token = item.get(_a.token)
    this.debug("FFFFFFFFFF 322 147", opt, dest);

    const path = item.get(_a.path);
    if (_.isArray(path) && path.length) { 
      opt.path = path;
    }
    if (item.get(_a.replace)) {
      opt.replace = dest.nid;
    }
    const socket = new __uploader(opt);
    this._filename.set({content: file.name});
    socket.addListener(this);
    if (item.get(_a.listener)) {
      socket.addListener(item.get(_a.listener));
    }
    //@debug "vvvaaaa 329 104 SENDING FILE...", opt, path #item, socket
    socket.send(_K.url.service);
    return this._socket = socket;
  }
    //@_start()

      
// ===========================================================
//
// ===========================================================
  _start() {
    const l = _.last(this._queue);
    if (l != null) {
      l.set({
        notify : 1});
    }
    const item = this._queue.shift();
    //@debug "vvvaaa 104 307 Upload FILE...", l#@_started, @_sent, @_fifo.length, item
    if ((item == null)) {
      if (this._sent > 0) {
        //@trigger _a.end 
        const f=()=> {
          this.status = _a.end;
          return this.softDestroy();
        };
        _.delay(f, 500);
      }
      return; 
    }

    const file = item.get(_a.file);

    if (file.isFile) {
      return file.file(f=> {
        return this._send(f, item);
      });
    } else { 
      return this._send(file, item);
    }
  }
    // @_upload(item)

// ===========================================================
// 
// ===========================================================
  onPartReady(child, pn, section) {
    //@debug "vvvaaa pn=#{pn} 187", child.getHandlers(_a.part), child.cid, child
    switch (pn) {
      case "ref-percent": 
        this._percent= child;
        break;

      case "ref-filesize":
        this._filesize= child;
        break;

      case "ref-chart":
        this._chart= child;
        Utils.waitForEl(child.el, ()=> {
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

    return this._count(210);
  }

// ===========================================================
// 
// ===========================================================
  onDomRefresh() {
    //@debug "216 vvvaa pn=ref-files", @isDestroyed(), @cid, @_started, @
    if (this._ready) {
      return;
    }
    if (this.mget(_a.mode) === _a.row) {
      return this.feed(require('./skeleton/row')(this));
    } else { 
      return this.feed(require('./skeleton/grid')(this));
    }
  }


// ===========================================================
// 
// ===========================================================
  onUiEvent(cmd) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    const status = cmd.get(_a.status);
    this.debug(`FFFFFFFFF svc=${service}`, status, mouseDragged);
    if (mouseDragged) {
      return;
    }

    switch (service) {
      case _e.cancel:
        this._canceled = true; 
        this._socket.abort();
        this.status = _e.cancel;
        this.softDestroy();
        return this.trigger(_e.cancel);
    }
  }
}
__media_uploader.initClass();

module.exports = __media_uploader;    
