class __invitation_permission extends LetcBox {

  static initClass() {
    this.prototype.figName = "invitation_permission";
    this.prototype.behaviorSet = {
      bhv_auto_close   : 1,
      bhv_socket       : 1
    };
  }

// ===========================================================
// initialize
// ===========================================================
  initialize() {
    require('./skin');
    super.initialize();
    this.model.atLeast({
      privilege  : _K.privilege.write,
      permission : _K.privilege.write,
      hours      : 0,
      days       : 0,
      limit      : 0,
      modify     : _a.off
    });
    return this.declareHandlers();
  }
    

// ===========================================================
// 
// ===========================================================
  onDomRefresh() {
    this.reload();
    return this.debug("qqqqqqqqqq 88", this);
  }
    
// ===========================================================
// 
// ===========================================================
  reload(state) {
    if (this.mget(_a.skeleton)) {
      return this.feed(this.mget(_a.skeleton)(this));
    } else {
      return this.feed(require("./skeleton/main")(this, state));
    }
  }

// ===========================================================
// 
// ===========================================================
  _commitChanges(cmd) {
    let opt;
    const data = this.getData();
    if ((data == null)) {
      this.softDestroy();
      return; 
    }

    data.hub_id     = this.mget(_a.hub_id);
    data.nid        = this.mget(_a.home_id);

    if (this.mget(_a.share_id)) {
      opt = { 
        service    : SERVICE.sharebox.update_link,
        share_id   : this.mget(_a.share_id)
      };
    } else if (this.mget(_a.api)) {
      opt = this.mget(_a.api);
    } else {
      opt = { 
        service    : SERVICE.sharebox.assign_permission,
        email      : this.mget(_a.email)
      };
    }
    _.merge(data, opt);
    this.debug("ZZZZZZZZZZZZ", data, this.mget(_a.api));
    return this.postService(data);
  }

// ===========================================================
// 
// ===========================================================
  onUiEvent(cmd) {
    let service;
    if (cmd.source) {
      service = cmd.source.mget(_a.name);
    } else {
      service = cmd.mget(_a.service);
    }
    const data = this.getData();
    this.model.set({ 
      days  : data.days,
      hours : data.hours,
      limit : data.limit
    });
    this.debug(`qqqqqqqqqq svc=${service} perm=${data.permission} 107`, data, this, cmd, cmd.source);
    switch (service) {
      case _a.read: case _a.write: case _a.delete:
        var p = _K.privilege[service];
        this.debug("qqqqqqqqqq 86", data.permission, p, this.model.attributes);
        if (data.permission === p) {
          p = _K.privilege[service] >> 1;
          this.debug("qqqqqqqqqq 88");
        }
        this.model.set({ 
          privilege : p,
          permission : p
        });
        return this.reload();

      // when _a.write
      //   if @mget(_a.permission)^_K.privilege[service]
      //     p = _K.privilege[service]
      //   else 
      //     p =  _K.privilege[service] >> 1
      //   @model.set 
      //     permission : p
      //   @reload()

      case _e.close:
        if (this.mget(_a.service) === _a.commit) {
          this._commitChanges(cmd);
        } else { 
          this.triggerHandlers();
        }
        return this.suppress();

      case _e.update:
        var name = cmd.mget(_a.name);
        this.model.set({ 
          permission : _K.privilege[name]});
        this.reload();
        return this.triggerHandlers();

      case _e.commit:
        name = cmd.mget(_a.name);
        this.model.set({ 
          permission : _K.privilege[name]});
        this.reload();
        if (this.mget(_a.api) != null) {
          return this._commitChanges(cmd);
        }
        break;

      case _a.limit:
        //cmd.source.mget(_a.state), cmd.source
        if (cmd.source.mget(_a.state)) { //cmd.mget(_a.state)
          this.findPart("wrapper-expiry").el.show();
          let d = this.model.get(_a.days);
          if (~~d === 0) {
            d = 30;
          }
          this.model.set(_a.days, d); 
          return this.reload(_a.open);
        } else { 
          this.findPart("wrapper-expiry").el.hide();
          this.model.set({ 
            days  : 0,
            hours : 0
          });
          return this.reload();
        }
    }
  }
          // cmd.mset 
          //   days  : 0
          //   hours : 0
        //@remove()

// ===========================================================
// 
// ===========================================================
  getData() {
    const data = this.children.first().getData();
    const a =
      {permission : this.mget(_a.permission)};
    a.days  = data.days;
    a.hours = data.hours;
    a.limit = data.limit;
    if (this.mget('aliases') != null) {
      const object = this.mget('aliases');
      for (var k in object) { 
        var v = object[k];
        a[k] = data[v];
      }
    }

    return a; 
  }

// ===========================================================
// 
// ===========================================================

  onChildBubble(c, o) {
    return this.triggerHandlers();
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
    this.debug("AAAAAAAAAAAAAA 117", method, data, socket);
    switch (method) {
      case SERVICE.sharebox.update_link:
        this.model.set(data);
        this.triggerHandlers();
        return this.softDestroy();
      case SERVICE.sharebox.assign_permission:
        for (var d of Array.from(data)) {
          if (d.email === this.mget(_a.email)) {
            this.debug("AAAAAAAAAAAAAA 124", this.mget(_a.email), d.days);
            this.model.set(d);
            break;
          }
        }
        this.triggerHandlers();
        return this.softDestroy();
      case SERVICE.hub.set_privilege:
        return this.triggerHandlers();
    }
  }
}
__invitation_permission.initClass();

      
module.exports = __invitation_permission;
