class ___media_device extends LetcBox {

// ===========================================================
//
// ===========================================================
  constructor(...args) {
    super(...args);
    this.setState = this.setState.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
  }

  initialize(opt) {
    if (opt == null) { opt = {}; }
    require('./skin');
    let state = toggleState(/default/i.test(this.mget('deviceId')));
    const label = this.mget(_a.label);
    const l = label.replace(/^.+ \- /, '').replace(/\([0-9a-f]+\:[0-9a-f]+\)/i, '').trim();
    const tracks = this.mget('tracks');
    if (tracks) {
      tracks.forEach(c=> {
        if (c.label === label) {
          return state = 1;
        }
      });
    }
    this.mset({
      flow  : _a.x, 
      state,
      label : label || "system",
      name  : l || "system"
    });
    
    super.initialize(opt);
    this.declareHandlers();
    return this.debug("JJJJ DEVICES  3@debug ", this);
  }
    //@bindEvent "conference"

// ===========================================================
// 
// ===========================================================
  setState(state){
    super.setState(state);
    if ((this.__checkbox == null)) {
      return;
    }
    return this.__checkbox.setState(state);
  }

// ===========================================================
// 
// ===========================================================
  onPartReady(child, pn){
    return this.debug("EEEEEEEEEEE", child, pn);
  }
// ===========================================================
// 
// ===========================================================
  onDomRefresh(){
    return this.feed(require('./skeleton')(this));
  }
}



module.exports = ___media_device;
