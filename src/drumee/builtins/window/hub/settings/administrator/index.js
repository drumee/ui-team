require('./skin');
const __core = require('../core');
class __hub_administrator extends __core {
  constructor(...args) {
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.reload = this.reload.bind(this);
    this.adminRoll = this.adminRoll.bind(this);
    this._edit = this._edit.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
    super(...args);
  }

  static initClass() {
    this.prototype.figName  = "hub_administrator";
  }

// ===========================================================
//
// ===========================================================
  initialize(opt) {
    super.initialize();
    this.hub  = this.mget(_a.hub);
    this.model.set({ 
      label   : LOCALE.ADMINISTRATOR,
      content : "???"
    });
    this.members = [];
    this.media   = this.mget(_a.media);
    this._isEditing = 0;
    return this._addPending = 0;
  }
// ===========================================================
// onDomRefresh
//
// @param [Object] e
//
// ===========================================================
  onDomRefresh() { 

    return this.fetchService({
      service : SERVICE.hub.get_members_by_type,
      hub_id  : this.hub.hub_id,
      type    : _a.admin
    }); 
  }

// ===========================================================
//
// ===========================================================
  reload() { 
    return this.feed(require("./skeleton/main")(this));
  }

// ===========================================================
//
// ===========================================================
  adminRoll() {
    const a = [];
    let i = 0;
    let more = 0;
    const me = null; 
    for (var m of Array.from(this.members)) {
      if (m.privilege & _K.permission.owner) {  
        i = Skeletons.Note({
          className : `${this.fig.field}__member-name`,
          content   : `${m.firstname} ${m.lastname}`
        });
        a.push(i);
      } else if (m.privilege & _K.permission.admin) {
        more++;
      }
    }
    if (more) { 
      a.push(Skeletons.Note({
        className : `${this.fig.field}__member-name ${this.fig.name} several`,
        content   : `, +${more}`
      })
      );    
    }
    return a; 
  }


// ===========================================================
// 
//
// ===========================================================
  _edit(cmd) {
    this.debug("QQQQQQQ", this, cmd);
    const w = this.dialogWrapper;
    if (!w.isEmpty()) {
      w.clear();
      this.el.dataset.edit = 0;
      this.triggerHandlers({service:"edit-admin", state:0});
      return;
    }

    this.triggerHandlers({service:"edit-admin", state:1});

    this.el.dataset.edit = 1;
    const ui= this.getHandlers(_a.ui)[0];
    if (ui != null) {
      const h = (ui.$el.offset().top + ui.$el.height()) - this.$el.offset().top;
    }
    w.feed({
      kind      : 'invitation',
      sharees   : this.members,
      mode      : _a.admin,
      authority : this.mget(_a.authority),
      topLabel     : LOCALE.ADMINISTRATOR,
      bottomLabel  : LOCALE.ADD_ADMIN,
      persistence : _a.once, 
      uiHandler : [this],
      service   : "new-invitation",
      //service   : "invite"
      closeButton : true
    });
      // styleOpt  : 
      //   height  : h 
    const c = w.children.last();
    return c.once(_e.destroy, ()=> {
      return this.triggerHandlers({service:"edit-owner", state:0});
    });
  }
// ===========================================================
//
// ===========================================================
  onUiEvent(cmd) {
    const service = cmd.service || cmd.mget(_a.service);
    this.debug(`AAAAAA FFF 96service=${service} edit=${this._isEditing}`,cmd.mget(_a.state), this, cmd);
    switch (service) {
      case _e.edit:
        this.mode = _a.admin;
        this._edit(cmd);
        break;

      case _e.share:
        var data = cmd.getData();
        data.service   = SERVICE.hub.add_contributors;
        data.hub_id    = this.hub.hub_id;
        data.privilege = _K.privilege.admin;
        data.type      = _a.admin; 
        this.postService(data); 
        break;

      case "new-invitation": //"invite"
        this.mode = 'direct';
        this._addPending = 1;
        cmd.once(_e.destroy, ()=> {
          this.debug("AAAAAA FFF DESTROYED");
          return this.dialogWrapper.clear();
        });
        break;
    }
        //@dialogWrapper.clear()

    return super.onUiEvent(cmd);
  }
    

// ===========================================================
//
// ===========================================================
  __dispatchRest(method, data, socket) {
    //@debug "aaaaaaaaaaaaa 183", method, data
    switch (method) {      
      case SERVICE.hub.add_contributors: case SERVICE.hub.get_members_by_type:
        this.members = data; 
        this.reload();
        return this._addPending = 0;
    }
  }
}
__hub_administrator.initClass();

module.exports = __hub_administrator;
