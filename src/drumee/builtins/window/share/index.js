const mfsInteract  = require('window/interact');
const DIMMED_CLASS = "maiden-share"; 
class __window_share extends mfsInteract {
  constructor(...args) {
    super(...args);
    this._registerClasses = this._registerClasses.bind(this);
    this.getNotification = this.getNotification.bind(this);
    this.onDestroy = this.onDestroy.bind(this);
    this.onChildBubble = this.onChildBubble.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._openInbound = this._openInbound.bind(this);
    this.reload = this.reload.bind(this);
    this._openOutbound = this._openOutbound.bind(this);
    this._highlightSelection = this._highlightSelection.bind(this);
    this.updateSelection = this.updateSelection.bind(this);
    this._toggleOutbound = this._toggleOutbound.bind(this);
    this._prepareShare = this._prepareShare.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
  }

  static initClass() {
    this.prototype.isShare  = 1; 
    this.prototype.figName  = "window_share";
  }
 
  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    require('./skin');
    super.initialize();
    this._registerClasses();
    window.Sm = this; //
    this._shared = this.mget("shared");
    Wm.unselect(0);

    if (this.mget('switched')) {
      const s = this.mget(_a.styleOpt);
      this.style.set({
        top    : s.top  || 0,
        left   : s.left || 25,
        margin : 0,
        width  : s.width, //. @size.width
        height : s.height
      });
      this.size.width  = this.style.get(_a.width);
      this.size.height = this.style.get(_a.height);
    } else { 
      this.style.set({
        top    : 0,
        left   : 25,
        margin : 0,
        width  : this.size.width,
        height : this.size.height
      });
    }


    this.model.set(Wm.sharebox);
    this.model.set({
      filetype : _a.hub,
      area     : _a.restricted
    });

    if (this.mget('way') === _a.inbound) {
      this.isInbound = 1;
      this.mset({ 
        nid : this.mget(_a.inbound)});
      this._way = _a.inbound;
    } else {
      this.isInbound = 0;
      this.mset({ 
        nid : this.mget(_a.outbound)});
      this._way = _a.outbound;
    }
      // @_currentPid = @mget(_a.parentId)

    // if @mget(_a.nodeId) is @mget(_a.inbound)
    //   @_way = _a.inbound
    // else 
    //   @_way = _a.outbound

    this.switcher = this.mget(_a.state);
    //@debug "aaa 942 63 in=#{}", @, @_way, @mget(_a.nodeId)

    // Desk.notifier.on _e.update, ()=>
    //   @_updateNotification()
    this.declareHandlers(); //s()# {part:@, ui:@}, {fork:yes, recycle:yes}
    this.bindEvent(this.fig.name);
    return this.getNotification();
  }

// =========================================================
// 
// =========================================================
  _registerClasses() {
    Kind.ensure('invitation_contact', require('invitation/contact'));
    Kind.ensure('invitation_message', require('invitation/message'));
    Kind.ensure('invitation_permission', require('invitation/permission'));
    return Kind.ensure('invitation', require('invitation'));
  }

// ===========================================================
//
// ===========================================================
  getNotification(data) {
    return this.fetchService({
      service     : SERVICE.sharebox.notification_count,
      hub_id : Visitor.id
    });
  }

// ===========================================================
//
// ===========================================================
  onDestroy(data) {
    return Wm.clearClipboard();
  }
    //#@unbindEvent @fig.name

// ===========================================================
//
// ===========================================================
  onChildBubble(o) {
    super.onChildBubble(o);
    this.debug("aaaa XXXXXXXX496 392", o, lastClick, this);
    if ((typeof lastClick !== 'undefined' && lastClick !== null ? lastClick.shiftKey : undefined) && this.el.contains(lastClick.target)) {
      if (this._inbound != null) {
        return this._inbound.shareIn();
      }
    }
  }

// ===========================================================
// onPartReady
// ===========================================================
  onPartReady(child, pn, section) {
    switch (pn) {
      case _a.list:
        this.buildIconsList(child);
        this.raise();
        var serial = 0;
        Wm.unselect(0);
        child.onAddKid = c=> {
          // Fix #2517
          let needle;
          if ((needle = c.mget(_a.filename), Array.from(this._filenames).includes(needle))) {
            c.mset({serial});
            c.el.hide();
            this.copied.push(c);
            return serial++;
            //@_count()
          } else { 
            return c.model.set({ 
              serial : 10000000});
          }
        };
        if (this._shared != null) {
          // When share by drag and drop, by pass force Wm to bypass unselect check
          window.pointerDragged = false;
          return child.on("end:of:data", ()=> {
            return this._highlightSelection();
          });
        }
        break;

      case "share-info-pin":
        return this.share_info_pin = child;

      // when "notifier"
      //   @notifier = child
      //   @_updateNotification()
      //   # if @isInbound 
      //   #   @notifier.on _e.show, ()=>
      //   #     @notifier.$el.click()

      case 'wrapper-dialog':
        this.dialogWrapper = child;
        // child.$el.css
        //   height   : _a.auto
        //   position : _a.absolute
        //   top      : 100

        child.onAddKid=k=> {
          let c;
          if (!this._outbound || this._outbound.isDestroyed()) {
            c = this.dialogWrapper.children.first();
            c.on(_e.show, ()=> {
              return this.on(_e.unselect, ()=> {
                return this.dialogWrapper.clear();
              });
            });
            c.once(_e.destroy, ()=> {
              this.unselect();
              this.el.dataset.waiting = 0;
              this.isDialoguing = 0;
              return this.$el.removeClass(DIMMED_CLASS);
            });
            this._outbound =  c;
          }
          if (this.isInbound) {
            return this._inbound = c; 
          }
        };

        if (this.isInbound) {
          this._openInbound(this.mget(_a.mode));
          return; 
        }
        // if _.isFunction @_count
        //   @_count()
        if (this._shared != null) {
          this.el.dataset.waiting = 1;              
          return this._openOutbound();
        }
        break;

            // this.waitElement @iconsList, ()=>
            //   @iconsList.prepend Skeletons.Note("", "share-popup__placeholder drumee-spinner")
      case 'wrapper-tooltips':
        return this.tooltipsWrapper = child;

      default: 
        return super.onPartReady(child, pn, section); 
    }
  }

// ===========================================================
// onDomRefresh
// ===========================================================

  onDomRefresh() {
    // @declareHandlers() #s {part:@, ui:@}, {fork:yes, recycle:yes}
    //@targetOnClose = Desk.shareBtn.$el
    this._invitationMode = this.mget(_a.mode) || 'direct';
    if (_.isEmpty(this._shared)) {
      const f =()=> {
        return this.feed(require("./skeleton/main")(this));
      };
      this.waitElement(this.el, f);
    } else {
      this._prepareShare();
    }

    return super.onDomRefresh();
  }

// ===========================================================
// 
// ===========================================================
  _openInbound(s) {
    const opt = {  
      kind : "inbound",
      mode : s
    };
    return this.dialogWrapper.feed(opt);
  }

// ===========================================================
// reload
//
// @return [Object]
//
// ===========================================================
  reload(data, mode) {
    if (this.isInbound) {
      this.warn("Unexpected occurence reload in inbound way");
      return; 
    }
    this._invitationMode = mode || this.mget(_a.mode) || 'maiden';
    //if not @_content?
    Wm.unselect(0);
    this.feed(require("./skeleton/main")(this, data));
    this.initBounds();
    if (_.isEmpty(this._shared)) {
      return this._openOutbound();
    }
  }

// ===========================================================
// Triggered by drag and drop or Desk share button
// ===========================================================
  _openOutbound(sharees) {
    let media;
    this.$el.addClass(DIMMED_CLASS);
    if (this.media) {
      ({
        media
      } = this);
      media.el.dataset.selected = 1;
    } else if (this.copied) { 
      media = this.copied; 
    }
    const opt = { 
      kind       : "outbound",
      mode       : this._invitationMode,
      sharees,
      media,
      className  : "box-shadow-14 u-jc-center",
      permission : _K.permission.owner, 
      default_privilege : this.mget(_a.default_privilege),
      hub_id     : this.mget(_a.hub_id)
    };
    this.dialogWrapper.feed(opt);


    this.isDialoguing = 1;
    const pointerDragged = false; 
    return Wm.unselect(0);
  }


// ===========================================================
// 
// ===========================================================
  _highlightSelection() {
    let a = this.iconsList.collection.toJSON();
    a = _.sortBy(a, _a.serial);
    this.iconsList.onAddKid = null;
    this.iconsList.feed(a);
    this.el.dataset.waiting = 0;
    this.__spinner.cut();
  }


  updateSelection() {
    return this.debug("updateSelection aaaaaaaa 209", this);
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  _toggleOutbound(cmd) {
    if (this.dialogWrapper.isEmpty()) {
      this._invitationMode = _a.file;
      this.fetchService({
        service : SERVICE.sharebox.get_outbound_node_attr,
        nid     : cmd.mget(_a.nodeId),
        hub_id  : cmd.mget(_a.hub_id)
      });
      this.media = cmd;
      return this.media.setState(1);
    } else { 
      cmd.setState(0);
      cmd.el.dataset.sharing = _a.off;
      this.dialogWrapper.clear();
      return this.media = null; 
    }
  }

  /**
   * 
   * @param {*} data 
   * @returns 
   */
  _updateNotification(data) {
    if ((this._notifier == null)) {
      return; 
    }
    if ((data != null) && data.count) {
      const c = data.count;
      return this._notifier.feed(Skeletons.Note({
        content    : c.toString(),
        active     : 0,
        className  : "notification__count"
      })
      );
    } else {
      return this._notifier.clear();
    }
  }

  /**
   * 
   * @returns 
   */
  _prepareShare() {
    const list = [];
    this._filenames = [];
    this.copied = [];
    this.$el.click(); // Force raise
    for (var s of Array.from(this._shared)) {
      list.push({hub_id:s.mget(_a.hub_id), nid:s.mget(_a.nid)});
      this._filenames.push(s.mget(_a.filename));
    }
    const args = { 
      service      : SERVICE.sharebox.copy_to_sb,
      recipient_id : this.mget(_a.hub_id),
      hub_id       : Visitor.id, 
      nid          : list,
      pid          : this.getCurrentNid()
    };
    this.postService(args);
    return true; 
  }


  /**
   * 
   * @param {*} args 
   * @returns 
   */
  shareSelection(args) {
    if ((args == null)) {
      args = [];
    }
    this._shared = args;
    const list = {};
    
    for (var s of Array.from(this._shared)) {
      list[s.mget(_a.filename)] = { 
        hub_id : s.mget(_a.hub_id),
        nid    : s.mget(_a.nid)
      };
    }
    if (_.isEmpty(list)) {
      return; 
    }

    this.$el.addClass(DIMMED_CLASS);
    let serial = 0;
    this.iconsList.children.each(function(c){
      const filename = c.mget(_a.filename);
      if (list[filename]) {
        serial++;
        c.select({serial});
        return delete list[filename];
      } else { 
        return c.mset({ 
          serial : 10000,
          state  : 0
        });
      }
    });

    if (_.isEmpty(list)) {
      this._openOutbound();
      return;
    }
    this._content = null;
    return this._prepareShare();
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd) {
    const service = cmd.service || cmd.mget(_a.service) || cmd.status;

    switch (service) {
      case _a.outbound:
        return this._toggleOutbound(cmd);

      case "inbound-notification":
        if (this._inbound && !this._inbound.isDestroyed()) {
          this._inbound.showList();
          return; 
        }
        var mode = 'showList';
        if (this.isInbound) {
          this._openInbound(mode);
          return; 
        }
        this.model.set({ 
          way   :  _a.inbound,
          mode
        });
        return Wm.openContent(this);

      case "switch-content":
        if (cmd.mget(_a.state)) {
          this.model.set({ 
            way   : _a.inbound});    
          if ((this._outbound != null) && !this._outbound.isDestroyed()) {
            this._outbound.suppress();
          }
          this.debug("INBOUND");
        } else { 
          this.model.set({ 
            way   : _a.outbound});
          this.model.unset(_a.mode); 
          this.debug("OUTBOUND");
        }
        return Wm.openContent(this);

      case 'switch-box':
        if (cmd.mget(_a.type) === _a.inbound) {
          this.model.set({
            way   : _a.inbound});
          if ((this._outbound != null) && !this._outbound.isDestroyed()) {
            this._outbound.suppress();
          }
        } else {
          this.model.set({ 
            way   : _a.outbound});
          this.model.unset(_a.mode);
        }
        
        return Wm.openContent(this);

      case "accept_notification":
        return this.iconsList.restart();

      case _e.unselect: case "end:of:data":
        return this.dialogWrapper.clear();

      default:
        return super.onUiEvent(cmd);
    }
  }


  /**
   * 
   * @param {*} method 
   * @param {*} data 
   * @param {*} socket 
   * @returns 
   */
  __dispatchRest(method, data, socket) {
    switch (method) {
      case SERVICE.sharebox.accept_notification:
        return this.callNotificationlist();

      case SERVICE.sharebox.refuse_notification:
        return this.callNotificationlist();

      case SERVICE.sharebox.copy_to_sb:
        return this.reload(data, 'direct');
 
      case SERVICE.sharebox.get_outbound_node_attr:
        this.debug("aaaaaaa 282 419", data);
        return this._openOutbound(data);

      case SERVICE.sharebox.notification_count:
        return this._updateNotification(data);

      default:
        return super.__dispatchRest(method, data, socket);
    }
  }
}
__window_share.initClass();


module.exports = __window_share;

// -------------------------- END OF MODULE ----------------------- #
