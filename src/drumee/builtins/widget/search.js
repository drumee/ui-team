class __builtin_search extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onFound = this.onFound.bind(this);
    this.onItemUpdate = this.onItemUpdate.bind(this);
  }

  static initClass() {
  //   templateName: _T.wrapper.raw
  //   className : "#{_a.box} select-search"
  // 
  // 
  // 
  // 
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.className  = `${_a.box} select-search`;
  }
// ==================================================
//
// ==================================================

// ===========================================================
// onFound
//
// @param [Object] data
//
// @return [Object] 
//
// ===========================================================
  onFound(data) {
    const cmArgs = __guard__(this.model.get(_a.list), x => x.cmArgs);
    if (cmArgs != null) {
      //_dbg ">>>Q > onFound QQQQQ",  cmArgs
      data = _.map(data, s=> {
        _.extend(s, cmArgs);
        return s;
      });
    }
    _dbg(">>>Q > onFound",  cmArgs, this.model.attributes, data, this);
    if (this._list != null) {
      if ((this.scrollRegion.currentView == null)) {
        this.scrollRegion.show(this._list);
      }
      if (_.isArray(data)) {
        return this._list.collection.set(data);
      }
    }
  }
// ==================================================
//
// ==================================================

// ===========================================================
// onItemUpdate
//
// @param [Object] model
//
// ===========================================================
  onItemUpdate(model) {
    _dbg(">>>Q >>_DEPRECATED ????", model, this.scrollRegion);
    if (model.get(_a.value).length) {
      this.ui.results.attr(_a.data.hide, _a.no);
      //@fireEvent _e.widget.callback, model
      return _dbg(">>>Q >rise>");
    } else {
      return this.ui.results.attr(_a.data.hide, _a.yes);
    }
  }
}
__builtin_search.initClass();
module.exports = __builtin_search;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
