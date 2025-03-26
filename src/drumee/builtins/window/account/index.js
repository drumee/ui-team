
const __intercat_singleton = require('window/interact/singleton'); //require('./interact')


class __window_account extends __intercat_singleton {


// ===========================================================
// initialize
// ===========================================================

  initialize(opt) {
    super.initialize(opt);
    require('./skin');
    this.items = ["profile", "data", "security", "preferences"];
    this._uid = this.model.get(_a.uid) || Visitor.get(_a.id);
    RADIO_BROADCAST.on(_e.responsive, this.responsive);
    this._count = _.after(2, this.route); 
    this.contextmenuSkeleton = 'a';
  }

  /**
   * 
   * @returns 
   */
  currentTab() {
    const opt = Visitor.parseModule();
    const tab = opt[2] || this.items[0];
    return tab;
  }

  /**
   * 
   * @returns 
   */
  onDestroy(){
    return RADIO_BROADCAST.off(_e.responsive, this.responsive);
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    this.declareHandlers(); 
    this.feed(require('./skeleton')(this));
    return this._count();
  }


  /**
   * 
   * @param {*} t 
   * @returns 
   */
  route(t) {
    let kind;
    t = t || this.mget(_a.start) || Visitor.parseModule()[2] || this.items[0];
    if (this._lasttab && t === this._lasttab) {
      return;
    }
    this._lasttab = t; 
    if(!Kind.get(`account_${t}`)) {
      kind = 'account_profile';
    } else { 
      kind = `account_${t}`;
    }
    this.container.feed({ 
      kind,
      trigger : this.mget(_a.trigger),
      logicalParent : this
    });
    this.findPart("navbar").children.each(c=> {
      if (c.mget(_a.service) === t) { 
        c.setState(1);
      } else { 
        c.setState(0);
      }
    });
    this.raise();
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @param {*} section 
   * @returns 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.modal:
        return this.modal = child;

      case _a.container:
        this.container = child;
        this._count();
        return this.setupInteract();
    }
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args) {
    const service = args.service || cmd.get(_a.service);
    switch (service) {
      case "close-account":
        return this.softDestroy();
      case "close-dialog":
        return this.closeDialog();
      case "profile": 
      case "data": 
      case "security": 
      case "privacy": 
      case "preferences": 
      case "subscription":
      case "apps":
        return this.route(service);
      default: 
        return super.onUiEvent(cmd, args);
    }
  }
}

module.exports = __window_account;
