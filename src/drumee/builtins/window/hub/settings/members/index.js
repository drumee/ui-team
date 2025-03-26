class __hub_members extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onPartReady = this.onPartReady.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._display = this._display.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
  }

  static initClass() {
    this.prototype.figName  = "hub_members";
    this.prototype.behaviorSet = {
      bhv_radio    : 1,
      bhv_socket   : 1
    };
  }

// ===========================================================
//
// ===========================================================
  initialize(opt) {
    super.initialize();
    this.model.set({ 
      flow : _a.y});
    this._minHeight = 88;
    this._maxHeight = 287;

    this._itemsOpt = 
      {kind : 'invitation_contact'};    
    if (this.model.get(_a.itemsOpt)) {
      return _.merge(this._itemsOpt, this.model.get(_a.itemsOpt));
    }
  }

// ===========================================================
// onPartReady
// ===========================================================
  onPartReady(child, pn, section) {
    switch (pn) {
      case "admin-label":
        return this._commands = child;
    }
  }


// ===========================================================
//
// ===========================================================
  onDomRefresh() { 
    this.feed(require('./skeleton/main')(this));
    this._list = this.children.last();
    return this.fetchService({
      service : SERVICE.hub.get_contributors,
      hub_id  : this.model.get(_a.hub_id)
    });
  }
      
// ===========================================================
// _start 
// ===========================================================
  _start(data) { 
    let k, v;
    this._members = {};
    const usersNum = data.length;
    let listHeight = (usersNum * 32) + this._minHeight; 
    if (listHeight > this._maxHeight) {
      listHeight = this._maxHeight;
    }
    this._list.setSize(null, listHeight - 32);
    this.$el.height(listHeight);
    for (k in _K.permission) {
      v = _K.permission[k];
      switch (k) {
        case _a.admin: case _a.owner: 
          this._members[k] = _.filter(data, e => e.privilege & _K.permission[k]);
          var d = this._members.member;
          this.getPart(`ref-${k}`).el.setAttribute(_a.state, _a.open);
          break;
        default: 
          this._members.member = _.filter(data, function(e){
            const r = !(e.privilege & _K.permission.admin);
            return r;
          });
          d = this._members.member;
          this.getPart("ref-member").el.setAttribute(_a.state, _a.open);
      }
    }

    return (() => {
      const result = [];
      for (k in this._members) {

        v = this._members[k];
        result.push((() => {
          const result1 = [];
          for (var item of Array.from(v)) { 
            _.extend(item, this._itemsOpt);
            result1.push(this.getPart(`wrapper-${k}`).append(item));
          }
          return result1;
        })());
      }
      return result;
    })();
  }
        
// ===========================================================
// _display 
// ===========================================================
  _display(data) {    
    return this.debug('_display_display_display', data);
  }




// ===========================================================
// onUiEvent
//
// @return [Object] 
//contacts-found
// ===========================================================
  onUiEvent(cmd) {
    const service = cmd.service || cmd.model.get(_a.service);
    this.debug(`AAAAAA FFF 96service=${service}`, cmd.model.get(_a.state), cmd);
    switch (service) {
      case _e.close:
        return this.softDestroy();
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
    this.debug("AAAA:111", method, data, socket);
    switch (method) {      
      case SERVICE.hub.get_contributors:
        return this._start(data);
    }
  }
}
__hub_members.initClass();

module.exports = __hub_members;
