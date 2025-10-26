class __share_outbound extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDestroy = this.onDestroy.bind(this);
    this.referenceMedia = this.referenceMedia.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.reload = this.reload.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this._dragStop = this._dragStop.bind(this);
    this.getApi = this.getApi.bind(this);
    this._selectedFiles = this._selectedFiles.bind(this);
    this._sendInvitation = this._sendInvitation.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.onServerComplain = this.onServerComplain.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
  }

  static initClass() {
    this.prototype.figName ="share_outbound";
    this.prototype.behaviorSet =
      {bhv_socket   : 1};
  }

// ===========================================================
// onDomRefresh
//
// ===========================================================
  initialize(opt) {
    require('./skin');
    super.initialize();
    window.Out = this; //
    this._recipients = {};
    //Wm.on _e.unselect, @reset
    this.model.set({
      permission : this.mget(_a.default_privilege) || _K.permission.download,
      authority  : _K.privilege.owner
    });
    this.media = this.mget(_a.media);
    return this.declareHandlers();
  }
      
// ===========================================================
// 
// ===========================================================
  onDestroy() { 
    try { 
      return this.mget(_a.trigger).el.dataset.sharing = _a.off;
    } catch (error) {}
  }

// ===========================================================
// 
// ===========================================================
  referenceMedia() { 
    if (_.isArray(this.media)) {
      return this.media[0];
    }
    return this.media;
  }

// ===========================================================
//
// ===========================================================
  onDomRefresh() { 
    return this.reload();
  }


// ===========================================================
//
// ===========================================================
  reload() { 
    this.feed(require('./skeleton/main')(this));
    try { 
      return this.media.once(_e.unselect, ()=> {
        if (pointerDragged) {
          return;
        }
        return this.goodbye();
      });
    } catch (error) {}
  }

// ===========================================================
// onPartReady
// ===========================================================
  onPartReady(child, pn, section) {
    // @debug "aaaaaaa 78", pn
    switch (pn) {
      case "container-main":
        this.mainContainer = child;
        return this.$el.draggable( "option", "cancel", ".invitation" );

      case "wrapper-link":
        return this.linkWrapper = child;

      case "ref-invitation":
        return this.invitation = child;
    }
  }
          
      // when "container-tab"
      //   @mainContainer = child
 
// ===========================================================
// 
// ===========================================================
  _dragStop() {
    return this.$el.css({ 
      height : _a.auto}); 
  }


// ===========================================================
// 
//
// @param [Object] data
//
// ===========================================================
  getApi(single) {
    if (single == null) { single = 0; }
    if ((this.media == null) || _.isArray(this.media)) {
      // if not single
      return null; 
    }
    const m = this.media;
    const a = { 
      service : SERVICE.sharebox.get_outbound_node_attr,
      nid     : m.mget(_a.nodeId),
      hub_id  : m.mget(_a.hub_id)
    };
    return a; 
  }

// ===========================================================
// 
//
// @param [Object] data
//
// ===========================================================
  _selectedFiles() {
    let files = this.mget(_a.media) || [];
    const list  = [];
    if (!_.isArray(files)) {
      files = [files];
    }
    for (var m of Array.from(files)) {
      list.push({ 
        hub_id : this.mget(_a.hub_id),
        nid    : m.mget(_a.nid)
      });
    }
    return list; 
  }

// ===========================================================
// _sendInvitation
//
// ===========================================================
  _sendInvitation(cmd) {
    const args = cmd.getData();
    args.service = SERVICE.sharebox.assign_permission;
    args.hub_id  = this.mget(_a.hub_id);
    args.nid     = args.nid || this._selectedFiles();
    this.debug("GGGGGGGGG", args, cmd.getData(), cmd);
    if (_.isEmpty(args.email)) {
      Butler.say(LOCALE.PLZ_SELECT_CONTACT);
      return; 
    }
    return this.postService(args);
  }


// ===========================================================
// onUiEvent
//
// @return [Object] 
//contacts-found
// ===========================================================
  onUiEvent(cmd) {
    const service = cmd.service || cmd.mget(_a.service) || cmd.mget(_a.name);
    this.debug(`AAAAAA 166 rvice=${service}`, this, cmd, cmd.mget(_a.state), cmd);
    switch (service) {
      case _e.close: 
        this.goodbye();
        //  null, null, ()=>
        //   @trigger _e.destroy
        try { 
          return this.mget(_a.source).el.dataset.sharing=_a.off;
        } catch (error) {}

      case "setup-share": case _e.restart:
        if (this.findPart("ref-invitation").recipientsRoll.isEmpty()) {
          this._relaod = 1;
        } else { 
          this._relaod = 0;
        }
        return this.fetchService(this.getApi());

      case "public-link-created":
        this._relaod = 0;
        this.fetchService(this.getApi());
        return this.findPart("ref-button-link").el.dataset.link=1;

      case "public-link-removed": 
        this.findPart("ref-button-link").el.dataset.link=0;
        if (this.findPart("ref-invitation").recipientsRoll.isEmpty()) {
          return this._relaod = 1;
        } else { 
          this._relaod = 0;
          return this.fetchService(this.getApi());
        }

      case _e.share:
        return this._sendInvitation(cmd);

      // when "new-invitation"
      //   @findPart("container-header").feed require('./skeleton/header')(@, 'double')

      case "setup-public-link":
        if ((this._public_link != null) && !this._public_link.isDestroyed()) {
          this._public_link.suppress();
          return;
        }
        return Kind.waitFor('public_link').then(()=> {
          this.linkWrapper.feed({ 
            kind    : 'public_link',
            signal  : _e.ui.event,
            nid     : this._selectedFiles(),
            hub_id  : this.mget(_a.hub_id),
            source  : cmd,
            uiHandler : this,
            styleOpt : {
              'min-height' : this.$el.height() - 40
            }
          });
          return this._public_link = this.linkWrapper.children.last();
        });
    }
  }

// ===========================================================
//
// ===========================================================
  onServerComplain(xhr, socket) {
    const socketError = socket.get(_a.error);
    const svc = socket.get(_a.service);
    const message = socket.get(_a.message) || socket.get(_a.error);
    this.warn("QQQQQQ", message);
    return Butler.say(message);
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
    let msg;
    this.debug("AAAAAAAAAAAAAA 731", method, data, socket);
    switch (method) {
      
      case SERVICE.sharebox.assign_permission:
        var source = this.mget(_a.media);
        if (_.isArray(source)) {
          for (var s of Array.from(source)) { 
            s.el.dataset.sharing = _a.off;
          }
        } else if (source != null) {
          source.el.dataset.sharing = _a.off;
        }
        if (_.isEmpty(this.mget(_a.sharees))) {
          msg = LOCALE.MSG_SHARE_ACK;
        } else { 
          msg = LOCALE.ACK_SHARE_NEW_CONTACTS;
        }
         
        this.feed(require('libs/preset/ack')(this, msg, {height : this.$el.height()}));
        var timeout = (1000*Visitor.parseModuleArgs().timeout) || 2000;
        var f = ()=> {
          return this.goodbye();
        };
        return _.delay(f, timeout);

      case SERVICE.sharebox.get_outbound_node_attr:
        this.mset(_a.sharees, data);
        if (this._relaod) {
          return this.reload();
        }
        break;
    }
  }
}
__share_outbound.initClass();

module.exports = __share_outbound;
