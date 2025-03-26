const __core = require('../../core');
class __hub_name extends __core {
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
    this.prototype.figName  = "hub_name";
  }
  
// ===========================================================
//
// ===========================================================
  initialize(opt) {
    super.initialize();
    this.hub  = this.mget(_a.hub);
    this.model.set({ 
      label   : LOCALE.ROOM_NAME,
      content : this.hub.media.mget(_a.filename)
    });
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
    this.debug("aaaa 58", this, a); 
    if (this.contains(a)) {
      return;
    }
    if (this._isEditing) {
      this.reload();
    }
    return true;      
  }
    
// ===========================================================
// 
//
// ===========================================================
  _edit(cmd) {
    this._isEditing = 1;
    const wf = this.getPart("wrapper-field");
    wf.feed(Skeletons.Entry({
      className   : `${this.fig.family}__input--name input--name`,
      value       : this.mget(_a.content),
      active      : 1,
      preselect   : 1,
      interactive : 0,
      uiHandler       : this
    })
    );
    this._input = wf.children.first();
    this.getPart("wrapper-cmd").feed(Skeletons.Note({
      content   : 'Ok',
      className : `${this.fig.family}__button--ok button--ok`,
      uiHandler     : this,
      service   : _e.commit
    })
    );
    return this.el.dataset.edit = 1; 
  }

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
        return this.hub.mget(_a.source).update_name(_a.hubName,  data.name);
    }
  }
}
__hub_name.initClass();  // window 
    //     source = @model.get(_a.media)
        // if _.isArray source
        //   for s in source 
        //     s.el.dataset.sharing = _a.off
        // else if source?
        //   source.el.dataset.sharing = _a.off
        // @softDestroy()

module.exports = __hub_name;
