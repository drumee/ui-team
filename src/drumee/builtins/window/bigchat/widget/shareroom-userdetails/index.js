class ___widget_shareroomUserdetails extends LetcBox {

  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.getAllShareRoomMembers = this.getAllShareRoomMembers.bind(this);
  }

  initialize(opt) {
    if (opt == null) { opt = {}; }
    require('./skin');
    super.initialize();
    return this.declareHandlers();
  }

// ===========================================================
// 
// ===========================================================
  onPartReady(child, pn, section) {
    switch (pn) {
      case _a.none:
        return this.debug("Created by kind builder");
      default:
        return this.debug("Created by kind builder");
    }
  }

// ===========================================================
// 
// ===========================================================
  onDomRefresh(){
    return this.feed(require('./skeleton')(this));
  }

// ===========================================================
// 
// ===========================================================
  onUiEvent(cmd) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    const status = cmd.get(_a.status);
    this.debug(`SERVICE=${service}`);

    switch (service) {
      case _a.none:
        return this.debug("Created by kind builder");
      default:
        return this.debug("Created by kind builder");
    }
  }

// ===========================================================
// 
// ===========================================================
  getAllShareRoomMembers() {
    const api = {
      service : SERVICE.hub.get_members_by_type,
      type    : _a.all,
      hub_id  : this.mget(_a.hub_id)
    };
    
    return api;
  }
}


module.exports = ___widget_shareroomUserdetails;
