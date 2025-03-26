class __account_country extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDestroy = this.onDestroy.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.reload = this.reload.bind(this);
    this._onDocumentClick = this._onDocumentClick.bind(this);
    this._edit = this._edit.bind(this);
    this._commit = this._commit.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
  }

  static initClass() {
    this.prototype.figName  = "account_country";
  }

// ===========================================================
//
// ===========================================================
  initialize(opt) {
    super.initialize();
    return RADIO_BROADCAST.on(_e.click, this._onDocumentClick);
  }

// ===========================================================
//
// @param [Object] e
//
// ===========================================================
  onDestroy() { 
    return RADIO_BROADCAST.off(_e.click, this._onDocumentClick);
  }

// ===========================================================
// onDomRefresh
//
// @param [Object] e
//
// ===========================================================
  onDomRefresh() { 
    this.declareHandlers(); //s {part:@, ui:@}, {fork:yes, recycle:yes}
    return this.reload();
  }

// ===========================================================
//
// @param [Object] e
//
// ===========================================================
  reload() { 
    return this.feed(Skeletons.Note({
      className : `${this.fig.family}__main`,
      content : this.mget('name_en')
    })
    );
  }
    
// ===========================================================
//
// @param [Object] e
//
// ===========================================================
  _onDocumentClick(a) { 
    return this.debug("aaaa 58", this, a); 
  }
    
// ===========================================================
// 
//
// ===========================================================
  _edit(cmd) {}

// ===========================================================
// 
//
// ===========================================================
  _commit(cmd) {
    this.el.dataset.edit = 0;
    if ((this._input == null)) { 
      return; 
    }

    const data = this._input.getData();
    if (_.isEmpty(data.value)) { 
      this._input.showError(LOCALE.REQUIRE_THIS_FIELD);
      return;  
    }

    if (data.value === this.mget(_a.content)) {
      this.reload();
      return;
    }

    return this.postService({
      service : SERVICE.hub.update_name,
      hub_id  : this.hub.media.mget(_a.hub_id),
      name    : data.value
    });
  }

// ===========================================================
// onUiEvent
//
// @return [Object] 
//contacts-found
// ===========================================================
  onUiEvent(cmd) {
    const service = cmd.status || cmd.service || cmd.model.get(_a.service);
    this.debug(`AAAAAA FFF 96service=${service}`, cmd.model.get(_a.state), this, cmd);
    switch (service) {
      case _e.edit:
        this._edit(cmd);
        break;

      case _e.cancel:
        this.reload();
        break;
        
      case _e.commit: case _e.Enter:
        this._commit(cmd);
        break;
    }
    return super.onUiEvent();
  }
      
// ===========================================================
// __dispatchRest
//
// @param [Object] method
// @param [Object] data
// @param [Object] socket
//
// @return [Object] 
//
// ===========================================================
  __dispatchRest(method, data, socket) {
    this.debug("AAAAAAAAAAAAAA 731", method, data, socket, this);
    switch (method) {      
      case SERVICE.hub.update_name:
        this.mset(_a.content, data.name);
        this.onDomRefresh();
        return this.hub.mget(_a.source).update_name(_a.hubName, data.name);
    }
  }
}
__account_country.initClass();  // window 
    //     source = @model.get(_a.media)
        // if _.isArray source
        //   for s in source 
        //     s.el.dataset.sharing = _a.off
        // else if source?
        //   source.el.dataset.sharing = _a.off
        // @softDestroy()

module.exports = __account_country;
