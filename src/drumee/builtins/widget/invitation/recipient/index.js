// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/invitation/recipient/skeleton/recipient
// ==================================================================== *
const __recipient = require('../core');
class __invitation_recipient extends __recipient {

  static initClass() {
    this.prototype.fig  = 1;
  }

    
  /**
   * 
   * @returns 
   */
  initialize() {
    require('./skin');
    super.initialize();
    const m = this.model;
    if(m.get(_a.entity)){
      m.set(_a.id, _a.entity);
    }
    this.url      = Visitor.avatar(m);
    this.name     = m.get(_a.surname);
    const firstname = m.get(_a.firstname) || '';
    const lastname  = m.get(_a.lastname)  || '';
    this.id    = m.get(_a.entity) || m.get(_a.id);
    this.email = m.get(_a.email);
    this.phone = m.get(_a.mobile);
    
    if (_.isEmpty(this.name)) {
      this.name = `${firstname} ${lastname}`;    
    }

    this.name = this.name.trim();

    if (_.isEmpty(this.name)) {
      this.name = this.email;
    }

    if ((this.mget(_a.origin) == _a.share) && (this.mget(_a.status) == _a.memory)) {
      this.name = this.email;
    }

    if (this.email === "*") {
      this.name = LOCALE.OPEN_LINK;
      this.tooltips = this.name;
    } else { 
      this.tooltips = this.email || this.name;
    }

    const r = this.mget(_a.root);
    if (r != null) {
      let needle;
      if ((needle = this.mget(_a.email), Array.from(r.recipientsRoll.collection.map(_a.email)).includes(needle))) {
        this.excluded = 1;
        return this.mset({
          preselect : 1});
      }
    }
    if(!this.mget(_a.hub_id)){
      let m = this.get(_a.media);
      if(m) this.mset(_a.hub_id, m.mget(_a.hub_id));
    }
  }

  /**
   * 
   */
  onDomRefresh() {
    this.declareHandlers(); //s { part: @ }
    if (this.mget(_a.preselect)) {
      this.setState(1);
    }
    this.feed(require("./skeleton")(this));
  }

  /**
   * 
   * @returns 
   */
  getSiblings() {
    const sel = [];
    this.parent.children.each(c=> {
      if (c.mget(_a.state)) {
        return sel.push(c);
      }
    }); 
    return sel; 
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  _tick(cmd) {
    const s = this.mget(_a.state) ^ 1;
    this.setState(s);
    this.service = _e.select;

    if (lastClick.shiftKey) { 
      const l = [];
      if (this._lastIndex != null) { 
        let c;
        if (cmd.getIndex() > this._lastIndex) {
          for (c of Array.from(cmd.parent.children.toArray())) {
            if (cmd.getIndex() >= c.getIndex()) {
              l.push(c); 
            }
          }
        } else if (cmd.getIndex() < this._lastIndex) {
          for (c of Array.from(cmd.parent.children.toArray())) {
            if (cmd.getIndex() <= c.getIndex()) {
              l.push(c); 
            }
          }
        }
      }
      this._lastIndex = cmd.getIndex();
    }
    return this.triggerHandlers({service:_e.select});
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd) {
    const service = cmd.service || cmd.mget(_a.service);
    this.debug(`bbaaaa 105 96service=${service}`, cmd, this);
    switch (service) {
      case _e.remove:
        return this.softDestroy();

      case _e.select: 
        return this._tick(cmd);

      case "add-item":
        if (_.isEmpty(this.getSiblings())) {
          //this.service = service;
          this.triggerHandlers({service});
        } else { 
          this._tick();
        }
        break;

      case "revoke":
        this.removeOrrevoke(cmd);
        return this.triggerHandlers({service});
    }
  }
}
__invitation_recipient.initClass();


module.exports = __invitation_recipient;