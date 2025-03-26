class __bhv_auto_close extends Marionette.Behavior {

  constructor(...args) {
    super(...args);
    this.onBeforeRender = this.onBeforeRender.bind(this);
    this.onBeforeDestroy = this.onBeforeDestroy.bind(this);
    this._onClick = this._onClick.bind(this);
  }

  onBeforeRender() {
    return RADIO_BROADCAST.on(_e.click, this._onClick);
  }

// ===========================================================
//
// ===========================================================
  onBeforeDestroy() {
    return RADIO_BROADCAST.off(_e.click, this._onClick); 
  }


// ===========================================================
// 
// ===========================================================
  _onClick(e) {
    //@debug "aaaaaaaaaavv 30", @view
    if (this.view.contains(e)) { 
      return;
    }
    return this.view.softDestroy();
  }
}

    
module.exports = __bhv_auto_close;
