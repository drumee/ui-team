const DIALOG = 'dialogHandler';
const __recipient = require('../core');
class __invitation_sharee extends __recipient {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this._createPeer = this._createPeer.bind(this);
    this._ackMessage = this._ackMessage.bind(this);
    this._showDetails = this._showDetails.bind(this);
    this._shrink = this._shrink.bind(this);
  }

  static initClass() {
    this.prototype.figName  = "invitation_sharee";
  }

// ===========================================================
// initialize
// ===========================================================

  initialize() {
    require('./skin');
    super.initialize();
    const m = this.model;
    this.model.set({ 
      flow : _a.y}); 
    this.name  = m.get(_a.fullname);
    this.hub   = m.get(_a.hub);
    this.id    = m.get(_a.id);
    this.email = m.get(_a.email);
    this.phone = m.get(_a.mobile);
    this.media = m.get(_a.media);
    this.master = m.get(_a.master);
    if (this.email === "*") {
      this.name = LOCALE.OPEN_LINK;
      this.url = Visitor.avatar(m.id); //Visitor.avatar()
    } else {
      this.name = `${m.get(_a.firstname)} ${m.get(_a.lastname)}`;
      this.name = this.name.replace(/( *null *)|( *undefined *)/, '');
      this.name = this.name.trim();
      if (_.isEmpty(this.name)) {
        this.name = m.get(_a.email);
      }
      this.url = Visitor.avatar(m.id); //Visitor.avatar m
    }
    //@debug "aaaaa 37", @, @name
    let share_id = this.mget(_a.share_id);
    if (this.media) {
      share_id = this.mget(_a.share_id) || this.media.mget(_a.share_id);
      this.mset({
        hub_id     : this.media.mget(_a.hub_id),
        nid        : this.media.mget(_a.nodeId)
      });
      if ((share_id == null)) {
        this.mset(_a.share_id, this.media.mget(_a.share_id));
      }
    }
    if (this.mget(_a.privilege) != null) { 
      this.mset(_a.permission, this.mget(_a.privilege)); 
    }
    return this.mset(_a.signal, _e.ui.event);
  }
      
// ===========================================================
// onDomRefresh
// ===========================================================
  onDomRefresh() {
    this.declareHandlers(); //s { part: @ }
    if (this.mget(_a.id) === Visitor.id) { 
      this.el.dataset.me = 1;
    } else { 
      this.el.dataset.me = 0;
    }

    if (this.mget(_a.authority) & (_K.permission.admin)) {
      if (this.mget(_a.id) === Visitor.id) { 
        this.editable = 0;
      } else if (this.mget(_a.authority) > this.mget(_a.privilege)) {
        this.editable = 1;
      }
    } else { 
      this.editable = 0;
    }

    if (this.mget(_a.email) !== "*") {
      this.feed(require("./skeleton")(this));
    }
      
    const d = this.mget(DIALOG);
    if (d != null) {
      return this.dialogWrapper = d.dialogWrapper;
    }
  }

    //@debug "HHHHGGGG", @, @el, @mget(_a.privilege), @mget(_a.authority), @mget(_a.id), @editable

// ===========================================================
// onPartReady
// ===========================================================
  onPartReady(child, pn, section) {
    switch (pn) {
      case "options-content":
        return this._options = child;
    }
  }


// ===========================================================
  _createPeer(items) {
    const opt = {
      service : SERVICE.media.make_dir_special, 
      type    : 'p2p',
      users   : [this.mget(_a.id)],
      hub_id  : this.mget(_a.hub_id)
    };
    // @debug "postService", opt, @
    return this.postService(opt);
  }
    
// ===========================================================
// 
// ===========================================================
  _ackMessage(cmd) {
    const doff = this.dialogWrapper.$el.offset();
    const ioff = this.$el.offset();
    const y = ((ioff.top - doff.top) + this.$el.innerHeight()) - 10;
    let user_name = this.mget(_a.firstname);
    user_name = user_name.trim();
    let hub_name = LOCALE.ROOM_NAME;
    if (_.isEmpty(user_name)) {
      user_name = this.mget(_a.lastname) || this.mget(_a.email);
    }
    try { 
      hub_name = this.mget(_a.hub).mget(_a.filename);
    } catch (error) {}
    const opt = require('libs/preset/ack')(this, 
      ''.format(LOCALE.ACK_PEER_TO_FOLDER, user_name, hub_name)
    );
    opt.styleOpt =
      {top : y}; 
    this.dialogWrapper.feed(opt);
    const p = this.dialogWrapper.children.first();
    return p.selfDestroy({callback: ()=> {
      this.debug("RESTART", this.mget(_a.hub));
      return this.mget(_a.hub).restart();
    }
    });
  }

// ===========================================================
// _showDetails
// ===========================================================
  _showDetails(cmd) {

    if (!this.dialogWrapper) {
      this.dialogWrapper = this.mget(DIALOG);
    }
    
    const p = this.dialogWrapper.getPart('permission');
    if ((p != null) && !p.isDestroyed()) {
      p.goodbye();
      return;
    }
    this.dialogWrapper.append(require('./skeleton/permission')(this, cmd));
    const c = this.dialogWrapper.children.last();
    return c.once(_e.destroy, ()=> {
      return this.model.set({ 
        permission : c.mget(_a.permission),
        days       : c.mget(_a.days),
        hours      : c.mget(_a.hours)
      });
    });
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
        return this.removeOrrevoke(cmd);

      case _a.view:
        return this._showDetails(cmd);

      case "setup-public-link":
        this.service = service;
        return this.triggerHandlers();

      case "peer-folder":
        return this._createPeer();

      case _e.update:
        // @_options.clear()
        this.dialogWrapper.clear();
        var data = cmd.model.toJSON();
        return this.model.set({ 
          permission : data.permission,
          days  : data.days,
          hours : data.hours,
          limit : data.limit
        });
        // @_shrink cmd

      case _e.select: 
        var s = this.mget(_a.state) ^ 1;
        this.mset(_a.state, s);
        return this.el.dataset.state = s;

      default: 
        return this.triggerHandlers();
    }
  }
}
__invitation_sharee.initClass();
        
module.exports = __invitation_sharee;
