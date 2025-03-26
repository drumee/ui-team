class __invitation_contact extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this._showDetails = this._showDetails.bind(this);
    this._removeOrrevoke = this._removeOrrevoke.bind(this);
    this._shrink = this._shrink.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
  }

  static initClass() {
    this.prototype.figName = "invitation_contact";
  }
// ===========================================================
// initialize
// ===========================================================

  initialize() {
    super.initialize();
    const m = this.model;
    this.model.set({ 
      flow : _a.y}); 
    this.url = Visitor.avatar(m);
    this.name  = m.get(_a.fullname);
    this.id    = m.get(_a.id);
    this.email = m.get(_a.email);
    this.phone = m.get(_a.mobile);
    if (_.isEmpty(this.name)) {
      this.name = `${m.get(_a.firstname)} ${m.get(_a.lastname)}`;
    }
    if (_.isEmpty(this.name)) {
      this.name = this.email;
      if (this.name === "*") {
        this.name = LOCALE.OPEN_LINK;
      }
    }
    return this.url = Visitor.avatar(m);
  }
    //this.debug("AAAAAAAAAAAAAAA", this)
// ===========================================================
// onDomRefresh
// ===========================================================
  onDomRefresh() {
    this.declareHandlers(); //s { part: @ }
    const skl = this.mget(_a.skeleton);
    // if skl?
    //   @feed(skl(@))
    // else
    this.feed(require("./skeleton")(this, 'cross'));
    if (this.parent.children.last().cid === this.cid) {
      this._offset = 180;
    } else {
      this._offset = 140;
    }
    return this.dialogWrapper = this.parent.parent.dialogWrapper;
  }
// ===========================================================
// onPartReady
// ===========================================================
  onPartReady(child, pn, section) {
    this.declareHandlers(); //s {part:@, ui:@}, {fork:yes, recycle:yes}
    switch (pn) {
      case "options-content":
        return this._options = child;
    }
  }

// ===========================================================
// _showDetails
// ===========================================================
  _showDetails(cmd) {
    let modify;
    const el_height = 41; //36 height 5 margin
    this.debug("aaa 72", this);
    const offsetTop = this.$el.position().top + el_height;
    if (this.mget(_a.email) === '*') {
      modify = _a.no; 
      var h1     = h1 - 35;
      var h2     = h2 - 35;
    }
    if (cmd.mget(_a.state)) {
      const opt = { 
        kind       : 'invitation_permission',
        source     : cmd,
        signal     : _e.ui.event,
        service    : _a.commit,
        modify,
        button     : _a.yes,
        hub_id     : this.mget(_a.hub_id),
        nid        : this.mget(_a.nodeId),
        share_id   : this.mget(_a.share_id),
        uid        : this.mget(_a.id),
        email      : this.mget(_a.email),
        permission : this.mget(_a.permission),
        days       : this.mget(_a.days),
        hours      : this.mget(_a.hours),
        limit      : this.mget(_a.limit),
        handler : { 
          uiHandler : this
        }
      };
      // @_options.feed opt 
      // permission = @_options.children.first()
      this.dialogWrapper.feed(opt); 
      this.dialogWrapper.$el.css(_a.top, offsetTop).px();
      this.el.setAttribute(_a.data.state, 1);
      const permission = this.dialogWrapper.children.first();
      return permission.once(_e.destroy, ()=> {
        this.model.set({ 
          permission : permission.mget(_a.permission),
          days : permission.mget(_a.days),
          hours : permission.mget(_a.hours)
        });
        return this._shrink(cmd);
      });
      // @parent.setSize(null, @parent.$el.height()+@_offset)
    } else {
      return this._shrink(cmd);
    }
  }

// ===========================================================
// _removeOrrevoke
// ===========================================================
  _removeOrrevoke(cmd) {
    if ((this.mget('is_share') == null)) {
      this.softDestroy();
      return; 
    }
    this.debug("aaa 92", this, cmd); 
    if (this.mget(_a.share_id) != null) {
      return this.postService({
        service     : SERVICE.sharebox.remove_link,
        hub_id      : this.mget(_a.hub_id),
        nid         : this.mget(_a.nodeId),
        share_id    : this.mget(_a.share_id)
      });
    } else { 
      return this.postService({
        service     : SERVICE.sharebox.revoke_permission,
        hub_id      : this.mget(_a.hub_id),
        nid         : [this.mget('resource_id')],
        user_id     : this.mget('recipient_id')
      });
    }
  }

// ===========================================================
// _shrink
// ===========================================================
  _shrink(cmd) {
    // @_options.clear()
    this.dialogWrapper.clear();
    return this.el.setAttribute(_a.data.state, 0);
  }
    // @parent.setSize(null, @parent.$el.height()-@_offset)

// ===========================================================
// onUiEvent
// ===========================================================
  onUiEvent(cmd) {
    const service = cmd.mget(_a.service);
    this.debug(`aaaa 112 svc=${service}`, cmd, this);
    switch (service) {
      case _e.remove:
        return this._removeOrrevoke(cmd);

      case _a.view:
        return this._showDetails(cmd);

      case _e.update:
        // @_options.clear()
        this.dialogWrapper.clear();
        var data = cmd.model.toJSON();
        this.model.set({ 
          permission : data.permission,
          days  : data.days,
          hours : data.hours,
          limit : data.limit
        });
        return this._shrink(cmd);

      case _e.select: 
        var s = this.mget(_a.state) ^ 1;
        this.mset(_a.state, s);
        return this.el.dataset.state = s;

      default: 
        return this.triggerHandlers();
    }
  }

// ===========================================================
//
// @param [Object] method
// @param [Object] data
// @param [Object] socket
//
// @return [Object] 
//
// ===========================================================
  __dispatchRest(method, data, socket) {
    //@debug "AAAAAAAAAAAAAA 731", method, data, socket
    switch (method) {
      
      case SERVICE.sharebox.revoke_permission: case SERVICE.sharebox.remove_link:
        return this.softDestroy();
    }
  }
}
__invitation_contact.initClass();


module.exports = __invitation_contact;
