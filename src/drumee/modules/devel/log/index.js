class __devel_log extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.bindChildren = this.bindChildren.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this._prependRow = this._prependRow.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
  }

  static initClass() {
    this.prototype.fig =1; 
    this.prototype.behaviorSet =
      {bhv_socket:1};
  }

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    return this.declareHandlers();
  }

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    return this.feed(require('./skeleton/restart')(this));
  }

// ===========================================================
//
// ===========================================================
  bindChildren(child, pn, section) {}


// ===========================================================
// onUiEvent
//
// @param [Object] cmd
//
// ===========================================================
  onUiEvent(cmd){
    const service = cmd.model.get(_a.service);
    this.postService(SERVICE.devel.restart);
    return this.debug(`onUiEvent service=${service}`, this, cmd, cmd.mget(_a.status));
  }
          


// ===========================================================
// _prependRow
//
// @param [Object] cmd
//
// @return [Object] 
//
// ===========================================================
  _prependRow(data) {
    this._acknowledge();
    const list = this.getPart(_a.list);
    return list.prepend(require('./skeleton/row-view')(this, data));
  }


// ===========================================================
// __dispatchRest
//
// @param [Object] method
// @param [Object] data
//
// ===========================================================
  __dispatchRest(method, data) {
    this.debug(">>TTT BACK 0", method, data);
    switch (method) {
      case SERVICE.locale.update:
        return this._refreshRow(data);

      case SERVICE.locale.add:
        return this._prependRow(data);

      case SERVICE.locale.build:
        return Butler.say(`Lexicon has been built<br> \
Clean cache and reload`
        );

      case SERVICE.locale.delete:
        return this._removeRow(data);

      default:
        return this.warn(WARNING.method.unprocessed.format(method), data);
    }
  }
}
__devel_log.initClass();

module.exports = __devel_log;
