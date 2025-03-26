class __notifier_network extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onDestroy = this.onDestroy.bind(this);
    this.warning = this.warning.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
  }

  static initClass() {
    this.prototype.fig =1;
  }

// ===========================================================
// 
//
// ===========================================================
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    return this.declareHandlers();
  }

// ===========================================================
//
// ===========================================================
  onDomRefresh() {
    this.el.hide();
    this._linkUp =e=> {
      return this.warning();
    };
    RADIO_NETWORK.on(_e.online, this._linkUp); 
      
    this._linkDown =e=> {
      return this.warning(_e.offline);
    };
    RADIO_NETWORK.on(_e.offline, this._linkDown); 

    this._linkChange =e=> {
      if (!window.Connection) {
        return;
      }
      if (window.Connection.rtt > 200) {
        return this.warning(_e.change);
      } else { 
        return this.warning();
      }
    };
    return RADIO_NETWORK.on(_e.change, this._linkChange);
  }

// ===========================================================
//
// ===========================================================
  onDestroy() {
    RADIO_NETWORK.off(_e.change, this._linkChange);
    RADIO_NETWORK.off(_e.offline, this._linkDown); 
    return RADIO_NETWORK.off(_e.online, this._linkUp); 
  }

// ===========================================================
//
// ===========================================================
  warning(state) {
    this.state = 1;
    switch (state) { 
      case _e.offline:
        this.el.show();
        this.feed(require('./skeleton/down')(this));
        break;
      case _e.change:
        this.el.show();
        this.feed(require('./skeleton/unstable')(this));
        break;
      default: 
        this.state = 0;
        this.clear();
        this.el.hide();
    }
    this.service = "network-event";
    return this.triggerHandlers();
  }

// ===========================================================
//
// ===========================================================
  onUiEvent(cmd) {
    this.el.hide();
    return this.clear();
  }
}
__notifier_network.initClass();

module.exports = __notifier_network;
