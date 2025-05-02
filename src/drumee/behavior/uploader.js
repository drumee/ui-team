const _defaultClass = 'uploader';
const __uploader = require('socket/uploader');

class __bhv_uploader extends Marionette.Behavior {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onTransfert = this.onTransfert.bind(this);
    this._flagOn = this._flagOn.bind(this);
    this._flagOff = this._flagOff.bind(this);
    this._checkProfile = this._checkProfile.bind(this);
    this._checkHostLogo = this._checkHostLogo.bind(this);
    this._checkUserProfile = this._checkUserProfile.bind(this);
    this._checkFile = this._checkFile.bind(this);
    this._getAccess = this._getAccess.bind(this);
    this._send_file = this._send_file.bind(this);
    this._upload = this._upload.bind(this);
    this.onAbort = this.onAbort.bind(this);
  }

  static initClass() {
  
    this.prototype.events = {
      dragover  : '_over',
      drop      : '_drop',
      dragleave : '_leave'
    };
  }


// ===========================================================
//
// ===========================================================
  onDomRefresh(){
    return this.$el.addClass(_defaultClass);
  }


// ===========================================================
//
// ===========================================================
  onTransfert(files, nid){
    if (Visitor.get(_a.ident) === _K.ident.nobody) {
      Butler.login();
      return;
    }
    this.debug(`onTssransfert QQ nid=${Env.get(_a.currentPid)}`, files, nid, this.view);
    if ((nid == null)) {
      nid = this.view.model.get(_a.parentId) || Env.get(_a.currentPid) || -1;
    }
    return this._upload(files, nid);
  }


// ===========================================================
//
// ===========================================================
  _flagOn() {
    this.el.dataset.selected = _a.on;
    return this.el.dataset.over     = _a.over;
  }

// ===========================================================
//
// ===========================================================
  _flagOff() {
    this.el.dataset.selected = _a.off;
    return this.el.dataset.over     = _a.off;
  }


// ===========================================================
//
// ===========================================================
  _over(e){
    //e.stopPropagation()
    e.preventDefault();
    this._flagOn();
    //@debug "DRAGG OVER MEDIA_over ", e, @view
    //e.dataTransfer.items.push @view
    return false;  // Should be *no*.... ???
  }

// ===========================================================
//
// ===========================================================
  _drop(e, ui){
    e.stopPropagation();
    e.preventDefault();
    if ((e.originalEvent == null)) {
      return;
    }
    const dataXfr = e.originalEvent.dataTransfer;
    if ((dataXfr != null) && dataXfr.files && (parseInt(Host.get(_a.privilege)&_K.privilege.delete) === 0)) {
      //@debug "_drop NOT ALLOWED "
      Butler.say(LOCALE.RESERVED_ACTION);
      //Butler.say LOCALE.RESERVED_ACTION
      return;
    }
    if (this.view.keepMouseEvt) {
      this._mouseEvt = e;
    }
    //@_mouseEvt = e
    this.debug(`${this.constructor.name} nUploaded d11111 222 _drop `, e, this.view, this.options, ui,
    this._flagOff());
    try {
      if (Helper.selected() || Helper.moved()) {
        return; // The dragging helper is not a file, but a Drumee Helper
      }
    } catch (error) {}
    if ((dataXfr == null) || (dataXfr.files.length === 0)) {
      //this.warn "No dataTransfer", @, e
      if (_.isFunction(this.view.dropFallback)) {
        this.view.dropFallback(e);
      }
      return false;
    }
    dataXfr.effectAllowed = "all";
    dataXfr.dropEffect = "copy";
    this.debug(`${this.constructor.name} _drop `, e, this.view, this.options, dataXfr);
    if (dataXfr.files != null) {
      let pid = -1;
      if (_.isFunction(this.view.getCurrentNid)) {
        pid = this.view.getCurrentNid();
      }
      this._upload(dataXfr.files, pid, e);
    }
    this._leave(e);
    return false;
  }
// ========================
//
// ========================

// ===========================================================
// _checkProfile
//
// @param [Object] files
//
// ===========================================================
  _leave(e){
    e.stopPropagation();
    e.preventDefault();
    //RADIO_BROADCAST.trigger _e.contextmenu
    return this._flagOff();
  }
// ========================
//
// ========================

// ===========================================================
// _checkHostLogo
//
// @param [Object] files
//
// @return [Object] 
//
// ===========================================================
  _checkProfile(files) {
    if (files.length > 1) {
      Butler.say(((1).printf(LOCALE.FILES_NUM_LIMIT)));
    }
      //Butler.say (1.printf(LOCALE.FILES_NUM_LIMIT))
    if (!files[0].name.match(/\.(jpeg|jpg|png|gif|cr2)$/i)) {
      _dbg("_checkUserProfile BAD", files);
      return Butler.say(LOCALE.ONLY_ACCEPT + " .jpeg .jpg .png .gif");
    }
  }
      //Butler.say LOCALE.ONLY_ACCEPT + " .jpeg .jpg .png .gif .cr2"
// ========================
//
// ========================

// ===========================================================
// _checkHostLogo
//
// @param [Object] files
//
// @return [Object] 
//
// ===========================================================
  _checkHostLogo(files) {
    this._checkProfile(files);
    const oid = this.view.get(_a.hub_id) || Host.get(_a.id);
    if ((oid === Host.get(_a.id)) && (Host.get(_a.privilege)&_K.privilege.admin)) {
      return {area:Host.get(_a.area), oid};
    } else {
      if (Visitor.get(_a.remit)>2) { // Super admin
        return {area:this.view.get(_a.area), oid};
      }
    }
    return Butler.say(LOCALE.RESERVED_ACTION);
  }


// ===========================================================
// _checkUserProfile
//
// @return [Object] 
//
// ===========================================================
  _checkUserProfile(files) {
    let area;
    this._checkProfile(files);
    if (Host.get(_a.area) === "personal") {
      area = _a.public;
    } else {
      area = Host.get(_a.area);
    }
    if (this.view.model.get(_a.id) === Visitor.get(_a.id)) {
      return {area, oid:Visitor.get(_a.id)};
    } else if (Visitor.get(_a.remit)>2) {
      return {area, oid:this.view.get(_a.id)};
    } else {
      return Butler.say(LOCALE.RESERVED_ACTION);
    }
  }

// ===========================================================
// _getAccess
//
// @param [Object] files
// @param [Object] nid
//
// @return [Object] 
//
// ===========================================================
  _checkFile() {
    if (!Host.get(_a.privilege)&_K.privilege.delete) {
      Butler.say(LOCALE.RESERVED_ACTION);
    }
    const oid  = this.view.get(_a.hubId) || Host.get(_a.id);
    if (oid === Host.get(_a.id)) {
      return {area:Host.get(_a.area), oid};
    } else {
      if (Visitor.get(_a.remit)>2) { // Super admin
        return {area:this.view.get(_a.area), oid};
      }
    }
    return Butler.say(LOCALE.RESERVED_ACTION);
  }

// ===========================================================
// _getAccess
//
// @param [Object] file
// @param [Object] nid
// @param [Object] access
// @param [Object] replace=no
//
// ===========================================================
  _getAccess(files, nid) {
    switch (nid) {
      case -3:
        return this._checkHostLogo(files);
      case -2:
        return this._checkUserProfile(files);
      case -1:
        return this._checkFile();
      default:
        return this._checkFile();
    }
  }

// ===========================================================
// _send_file
//
// @param [Object] files
// @param [Object] nid
//
// @return [Object] 
//
// ===========================================================
  _send_file(file, nid, access, replace, e) {
    if (replace == null) { replace = false; }
    const args = {
      area     : access.area,
      nid,
      file,
      filename : file.name,
      filesize : file.size,
      mimetype : file.type,
      filetype : _e.upload,
      skeleton : this.view.get(_a.skeleton),
      service  : SERVICE.media.upload
    };

    const url = `${location.pathname}svc/?`;
    if (replace) {
      args.replace = nid;
    }
    if ([-1, -2, -3].includes(nid)) {// User profile
      args.hub_id = Visitor.get(_a.id);
    } else if (_.isFunction(this.view.getHostId)) {
      args.hub_id = this.view.getHostId();
    }
    const socket = new __uploader(args);
    socket.mouseEvt = this._mouseEvt;
    socket.addListener(this.view);
    this.debug("START DENDING BY", this.view, socket);
    return socket.send(url);
  }
    
// ========================
// _upload
// ========================

// ===========================================================
// #  onUploadStart
//
// @param [Object] model
//
// ===========================================================
  _upload(files, nid, e) {  // opt = push (append) or unshift(prepend)
    let access;
    this.debug("RZEZEZZETTETE  UPLOADING .... onUploaded FTYPE", this, this.view, e);
    try {
      access = this._getAccess(files, nid);
    } catch (error) {
      e = error;
      RADIO_BROADCAST.trigger(_e.error, e.message);
      return;
    }
    if ((nid < -1) && (files.length > 1)) {
      RADIO_BROADCAST.trigger(_e.error, ((1).printf(LOCALE.FILES_NUM_LIMIT)));
      return;
    }
    const filetype = this.view.get(_a.filetype);
    if ((filetype != null) && !([_a.folder, _a.hub].includes(filetype))) {
      if (!confirm("Ecraser le fichier actuel?")) {
        return;
      }
      this.view.isReplacing = 1;
      this._send_file(files[0], this.view.model.get(_a.nodeId), access, 1);
      return;
    }
    
    return (() => {
      const result = [];
      for (var file of Array.from(files)) {
        _dbg(`ZAQAQ Behavior.Uploading nid=${nid} / oid=${access.oid}`, files , this.view);
        result.push(this._send_file(file, nid, access, false, e));
      }
      return result;
    })();
  }

// ===========================================================
// #  onUploadEnd
//
// @param [Object] model
//
//# ===========================================================
// AAAonUploadStart:(uploader) =>
  // @debug ">>onUploadStart d11111 ata.filetype=", uploader
  // if not uploader?
  //   @warn WARNING.element.not_found.format(_a.socket)
  //   return

  // if _.isFunction @view._onUploadStart
  //   @view._onUploadStart(uploader)
  //   return

  // try 
  //   x = uploader.mouseEvt.offsetX
  //   y = uploader.mouseEvt.offsetY 
  // catch e 
  //   x = @$el.width()/2 - 100
  //   y = @$el.height()/2 - 100

  // if _.isFunction @view.append
  //   style =
  //     position : _a.absolute
  //     width    : 200
  //     height   : 200
  //     left     : x 
  //     top      : y 

  //   if _.isFunction @view.getProgressStyle
  //     _.merge style, @view.getProgressStyle()

  //   @view.append SKL_UploadProgress @, uploader, {}, style
  //   uploader.addListener @

// ===========================================================
// #  onUploadProgress
//
// @param [Object] e
// @param [Object] filesize
//
// ===========================================================
//  onUploadEnd:(model) =>
//    if @view.getPart(_a.progress)?
//      @view.getPart(_a.progress).destroyChildren()
//
//#
//#
//# ======================================================
//#
//# ======================================================

// ===========================================================
// onAbort
//
// ===========================================================
//  onUploadProgress: (e, filesize) =>
//     @debug "<<vvMANAGER onUploadProgress", @, filesize
// ========================
// abort
// ========================
// ===========================================================
  onAbort() {
    return this._socket.abort();
  }
}
__bhv_uploader.initClass();
module.exports = __bhv_uploader;
