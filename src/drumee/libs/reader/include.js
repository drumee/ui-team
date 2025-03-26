class __include_reader extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._respawn = this._respawn.bind(this);
  }

  static initClass() {
    this.prototype.emptyView  = WPP.Spinner.Jump;
    this.prototype.behaviorSet =
      {socket     : 1};
  }

// ===========================================================
// onDomRefresh
//
// @return [Object] 
//
// ===========================================================
  onDomRefresh() {
    let hashtag, owner;
    const source = this.get(_a.source);
    this.warn("DEPRECTAED : use container.include", source);
    if (source != null) {
      const a = source.match(/(.+)\#(.+)/);
      owner   = a[1] || this.get(_a.owner);
      hashtag = a[2] || this.get(_a.hashtag);
    } else {
      hashtag =  this.get(_a.hashtag);
      owner   =  this.get(_a.owner);
    }
    const oid     =  this.get(_a.ownerId);
    this.debug(this, owner, hashtag);
    if ((hashtag == null)) {
      _c.error(ERROR.argRequired.format(_a.hashtag));
      return;
    }
    if ((owner == null) && (oid == null)) {
      _c.error(ERROR.argRequired.format(`${_a.owner} or ${_a.ownerId}`));
      return;
    }
    return this.include({hashtag, owner, oid, strip:true});
  }
// ==================================================================== *
//
// ==================================================================== *

// ===========================================================
// _respawn
//
// @param [Object] e
//
// ===========================================================
  _respawn(e) {
    return this.render();
  }
}
__include_reader.initClass();
module.exports = __include_reader;
