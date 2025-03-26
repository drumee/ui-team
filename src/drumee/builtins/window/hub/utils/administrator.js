class __hub_administrator extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDestroy = this.onDestroy.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.getListHeight = this.getListHeight.bind(this);
    this._selectedFiles = this._selectedFiles.bind(this);
    this._setupShare = this._setupShare.bind(this);
    this._sendInvitation = this._sendInvitation.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
  }

  static initClass() {
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.className  = _default_class;
  
  // ===========================================================
  //
  // @param [Object] opt
  //
  // ===========================================================
    this.prototype.behaviorSet =
      {socket   : 1};
  }

// ===========================================================
// onDomRefresh
//
// ===========================================================
  initialize(opt) {
    super.initialize();
    this._recipients = {};
    Wm.on(_e.unselect, this.reset);
    return this.preset = new Backbone.Model({
      permission : _K.permission.view});
  }


// ===========================================================
// 
//
// @param [Object] e
//
// ===========================================================
  onDestroy() { 
    return Sm.unselect();
  }

// ===========================================================
// onDomRefresh
//
// @param [Object] e
//
// ===========================================================
  onDomRefresh() { 
    this.declareHandlers(); //s {part:@, ui:@}, {fork:yes, recycle:yes}
    this.$el.draggable({
      cancel      : _a.input,
      appendTo    : _a.body,
      containment : Desk.$el,
      cursor      : _a.move
    });
    this.$el.css({
      height   : _a.auto,
      position : _a.absolute
    });
    return this.feed(require('./skeleton/main')(this));
  }

// ===========================================================
// onPartReady
// ===========================================================
  onPartReady(child, pn, section) {
    return this.declareHandlers(); //s {part:@, ui:@}, {fork:yes, recycle:yes}
  }
    // switch pn
    //   when 'body-wrapper'
    //     @_bodyPanel = child 
    //     if @model.get('start_with') is 'setup'
    //       @_setupShare()
    //       return
    //     #child.feed require('./skeleton/update-share')(@)

// ===========================================================
// 
//
// @param [Object] data
//
// ===========================================================
  getListHeight() {
    const recipients = this.model.get('node_attr') || [];
    let height  = 34 * (recipients.length+1);
    height  = Math.min(180, height);
    return height;
  }


// ===========================================================
// 
//
// @param [Object] data
//
// ===========================================================
  _selectedFiles() {
    let files = this.model.get(_a.media) || [];
    const list  = [];
    if (!_.isArray(files)) {
      files = [files];
    }
    for (var m of Array.from(files)) {
      list.push({ 
        hub_id : this.model.get(_a.hub_id),
        nid    : m.model.get(_a.nid)
      });
    }
    return list; 
  }

// ===========================================================
// 
//
// ===========================================================
  _setupShare() {
    return this._bodyPanel.feed({ 
      kind    : 'invitation',
      signal  : _e.ui.event,
      handler : {
        uiHandler : this
      }
    });
  }

// ===========================================================
// _sendInvitation
//
// @param [Object] method
// @param [Object] data
//
// ===========================================================
  _sendInvitation(cmd) {
    const args = cmd.getData();
    args.service = SERVICE.sharebox.assign_permission;
    args.hub_id  = this.model.get(_a.hub_id);
    args.nid     = args.nid || this._selectedFiles();
    return this.postService(args);
  }

// ===========================================================
// onUiEvent
//
// @return [Object] 
//contacts-found
// ===========================================================
  onUiEvent(cmd) {
    const service = cmd.service || cmd.model.get(_a.service) || cmd.model.get(_a.name);
    switch (service) {
      case _e.close: 
        this.softDestroy();
        try { 
          return this.model.get(_a.source).el.dataset.sharing=_a.off;
        } catch (error) {}

      case _e.access: case "setup-share": case "close-public-link":
        return this._setupShare();

      case _e.share:
        return this._sendInvitation(cmd);


      case "setup-public-link":
        return Kind.waitFor('public_link').then(()=> {
          return this._bodyPanel.feed({ 
            kind    : 'public_link',
            signal  : _e.ui.event,
            nid     : this._selectedFiles(),
            hub_id  : this.model.get(_a.hub_id),
            source  : cmd,
            handler : {
              uiHandler : this
            }
          });
        });
    }
  }


// ===========================================================
// __dispatchRest
//
// @param [Object] method
// @param [Object] data
// @param [Object] socket
//
// @return [Object] 
//
// ===========================================================
  __dispatchRest(method, data, socket) {
    this.debug("AAAAAAAAAAAAAA 731", method, data, socket);
    switch (method) {
      
      case SERVICE.sharebox.assign_permission:
        var source = this.model.get(_a.media);
        if (_.isArray(source)) {
          for (var s of Array.from(source)) { 
            s.el.dataset.sharing = _a.off;
          }
        } else if (source != null) {
          source.el.dataset.sharing = _a.off;
        }
        return this.softDestroy();
    }
  }
}
__hub_administrator.initClass();


module.exports = __hub_administrator;
