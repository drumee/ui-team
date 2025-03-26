class __support_feedback extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDestroy = this.onDestroy.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._addLocaleRow = this._addLocaleRow.bind(this);
    this._updateLocaleRow = this._updateLocaleRow.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this._acknowledge = this._acknowledge.bind(this);
    this._refreshRow = this._refreshRow.bind(this);
    this._removeRow = this._removeRow.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
  }

  static initClass() {
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.className  = "feedback-ui";
  }

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    super.initialize(opt);
    this._contextmenu = true;
    return this._origin = {};
  }

// ===========================================================
// onDestroy
//
// ===========================================================
  onDestroy(){}
    //Type.setMapName(_a.reader)

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    this.declareHandlers(); //s {part:@, ui:@}, {fork:yes, recycle:yes}
    return this.feed(require('./skeleton/main')(this));
  }

// ===========================================================
// onPartReady
//
// @param [Object] child
// @param [Object] pn
// @param [Object] section
//
// ===========================================================
  // onPartReady: (child, pn, section) =>
  //   _dbg ">> BO W2233 CHILD READY WIDGET", pn, child, @
  //   switch pn
  //     when _a.menu
  //       @_menu = child
  //     when "admin-menu"
  //       @_content = child
  //     when "admin-header"
  //       @_header = child
  //     when "watermark"
  //       @fetchService({service:SERVICE.admin.show_watermark})


// ===========================================================
// _addLocaleRow
//
// @param [Object] view
//
// ===========================================================
  _addLocaleRow(cmd) {
    const data = cmd._buildData() || {};
    data.key_code = data.key_code.toUpperCase();
    data.service = SERVICE.yp.add_locale;
    return this.postService(data);
  }

// ===========================================================
// _updateLocaleRow
//
// @param [Object] view
//
// ===========================================================
  _updateLocaleRow(cmd) {
    this.debug("ZZZZZZZZZZ 81", cmd);
    const data = cmd.getData() || {};
    data.key_code = data.key_code.toUpperCase();
    data.service = SERVICE.yp.update_locale;
    return this.postService(data);
  }

// ===========================================================
// onUiEvent
//
// @param [Object] cmd
//
// ===========================================================
  onUiEvent(cmd){
    let service = cmd.model.get(_a.service);
    if (cmd.status === _e.submit) {
      service = cmd.model.get(_a.service) || cmd.status;
    } else if (cmd.source != null) {
      service = cmd.source.model.get(_a.service);
    } else {
      service = cmd.model.get(_a.service);
    }

    this.debug(`onUiEvent service=${service}`, cmd, cmd.get(_a.status));
    switch (service) {
      case "update-locale-row":
        if (cmd.status === _e.submit) { 
          return this._updateLocaleRow(cmd);
        }
        break;

      case "add-locale-row":
        if (cmd.status === _e.submit) { 
          return this._addLocaleRow(cmd);
        }
        break;

      case "lookup-key":
        return this.fetchService({
          service : SERVICE.yp.get_locale,
          name    : cmd.source.model.get(_a.value)
        });
          
      case "show-more":
        var list = this.getPart(_a.list);
        return list.fetch();

      case "show-all":
        list = this.getPart(_a.list);
        return list.tick(1000);


      case _e.close: case "close-popup":
        return this.getPart('popup').clear();
    }
  }


// ===========================================================
// _acknowledge
//
// @param [Object] cmd
//
// @return [Object] 
//
// ===========================================================
  _acknowledge(data) {
    this.getPart("popup").feed(SKL_Note(null, "Success"));
    const f = ()=> {
      return this.getPart('popup').clear();
    };
    return _.delay(f, Visitor.timeout());
  }

// ===========================================================
// _refreshRow
//
// @param [Object] cmd
//
// @return [Object] 
//
// ===========================================================
  _refreshRow(data) {
    this._acknowledge();
    const list = this.getPart(_a.list);
    return list.children.each(function(c){
      if (c.children.first().model.get(_a.value) === data.key_code) {
        return c.children.each(function(k){
          const name = k.model.get(_a.name);
          if (_.isFunction(k.reload)) {
            k.model.set({ 
              content : data[name],
              value : data[name]});
            return k.reload();
          }
        });
      }
    });
  }

// ===========================================================
// _removeRow
//
// @param [Object] cmd
//
// @return [Object] 
//
// ===========================================================
  _removeRow(data) {
    this._acknowledge();
    const list = this.getPart(_a.list);
    return list.children.each(function(c){
      if (c.children.first().model.get(_a.value) === data.key_code) {
        return list.collection.remove(c.model);
      }
    });
  }

// ===========================================================
// _prependRow
//
// @param [Object] cmd
//
// @return [Object] 
//
// ===========================================================
  // _prependRow:(data) =>
  //   @_acknowledge()
  //   list = @getPart(_a.list)
  //   list.prepend require('./skeleton/row-view')(@, data)

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
      case SERVICE.yp.update_locale:
        return this._refreshRow(data);

      case SERVICE.yp.add_locale:
        return this._prependRow(data);

      case SERVICE.yp.build_lexicon:
        return Butler.say(`Lexicon has been built<br> \
Clean cache and reload`
        );

      case SERVICE.yp.delete_locale:
        return this._removeRow(data);

      default:
        return this.warn(WARNING.method.unprocessed.format(method), data);
    }
  }
}
__support_feedback.initClass();

module.exports = __support_feedback;
