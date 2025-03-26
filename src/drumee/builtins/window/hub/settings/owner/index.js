// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/hub/admin/settings/administrator
//   TYPE : SOLID
// ==================================================================== *
require('./skin');
const __core = require('../core');
class __hub_owner extends __core {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.getAvatar = this.getAvatar.bind(this);
    this.reload = this.reload.bind(this);
    this._edit = this._edit.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
  }

// ===========================================================
//
// ===========================================================
  initialize(opt) {
    super.initialize();
    this.hub  = this.mget(_a.hub);
    this.name = this.hub.owner.get(_a.firstname) + ' ' + this.hub.owner.get(_a.lastname);
    this.name = this.name.replace(/undefined|null/g, '');
    this.name = this.name.trim();
    this.model.set({ 
      flow    : _a.x, 
      label   : LOCALE.OWNER,
      content : this.name
    });
    return this.members = [];
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
      type    : _a.owner
    });
  }

// ===========================================================
//
// ===========================================================
  getAvatar(data) {
    const {
      owner
    } = this.hub; 
    return a; 
  }


// ===========================================================
//
// ===========================================================
  reload(data) { 
    if (data != null) {
      this.mset(data[0]);
      this.name = this.mget(_a.firstname) + ' ' + this.mget(_a.lastname);
      this.name = this.name.replace(/undefined|null/g, '');
      this.name = this.name.trim();
    }
    return this.feed(require("./skeleton/main")(this));
  }

// ===========================================================
// 
//
// ===========================================================
  _edit(cmd) {
    if (this.__invitation && !this.__invitation.isDestroyed()) {
      this._isEditing = 0;
      this.el.dataset.edit = 0;
      this.dialogWrapper.clear();
      this.triggerHandlers({service:"edit-owner", state:0});
      return;
    }
    this.el.dataset.edit = 1;
    this.triggerHandlers({service:"edit-owner", state:1});
    this.dialogWrapper.feed(require('./skeleton/members')(this));
    const c = this.dialogWrapper.children.last();
    return c.once(_e.destroy, ()=> {
      return this.triggerHandlers({service:"edit-owner", state:0});
    });
  }
    // @dialogWrapper.once 'remove:child', ()=>
    //   @triggerHandlers({service:"edit-owner", state:0})

// ===========================================================
// onUiEvent
//
// @return [Object] 
//contacts-found
// ===========================================================
  onUiEvent(cmd, args) {
    if (args == null) { args = {}; }
    const service = args.service || cmd.mget(_a.service);
    //@debug "AAAAAA QQFFF 96service=#{service}", cmd.mget(_a.state), @, cmd
    switch (service) {
      case _e.edit:
        this._edit(cmd);
        break;

      // when _e.add
      //   @_add(cmd)

      case _e.commit:
        this.debug(`AAAAAA QQFFF 96service=${service}`, cmd, cmd.mget(_a.fullname));
        var uid = cmd.mget(_a.id);
        if (uid === this.mget(_a.id)) {
          this.dialogWrapper.softClear();
        } else { 
          const name = cmd.mget(_a.surname);
          //@debug "AAAAAA QQFFF 96service222=#{service}", cmd, cmd.mget(_a.fullname)
          this.triggerHandlers({service:"change-owner", name, uid});
        }
        break;
    }

    return super.onUiEvent(cmd);
  }

      
// ===========================================================
//
// ===========================================================
  __dispatchRest(method, data, socket) {
    switch (method) {      
      case SERVICE.hub.get_members_by_type:
        this.members = data; 
        return this.reload(data);
      case SERVICE.hub.change_owner:
        this.hub.goodbye();
        this.hub.mget(_a.source).goodbye();
        return this.mget(_a.media).syncAttributes();
    }
  }
}
module.exports = __hub_owner;
