class __addressbook_widget_contact_formItems extends LetcBox {

// ===========================================================
//
// ===========================================================
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onChildBubble = this.onChildBubble.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.getStatus = this.getStatus.bind(this);
  }

  initialize(opt) {
    if (opt == null) { opt = {}; }
    require('./skin');
    super.initialize();
    //@debug "initialize",  @
    return this.declareHandlers();
  }

// ===========================================================
// 
// ===========================================================
  onPartReady(child, pn, section) {
    switch (pn) {
      case _a.none:
        return this.debug("Created by kind builder");
      default:
        return this.debug("Created by kind builder");
    }
  }

// ===========================================================
// 
// ===========================================================
  onDomRefresh(){
    return this.feed(require('./skeleton')(this));
  }

// ===========================================================
// 
// ===========================================================
  onChildBubble(c){}
    // Do not remove : prevent multiple events from children
// ===========================================================
// 
// ===========================================================
  onUiEvent(cmd) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    this.debug(`onUiEvent Service = ${service}`, cmd, this);

    switch (service) {
      case 'trigger-tag-select':
        this.source = cmd;
        this.service = service;
        return this.triggerHandlers();
          
      default:
        this.status = _a.idle;
        return this.debug("Created by kind builder 58");
    }
  }

// ===========================================================
//
// ===========================================================
  // __dispatchPush: (service, data)->
  //   switch service
  //     when SERVICE.no_service
  //       @debug "Created by kind builder"

// ===========================================================
//
// ===========================================================
  getStatus() {    
    const TagId = this.mget("tag_id");
    if (this.mget(_a.uiHandler).tagsSelected.find(row => row.tag_id ===  TagId)) {
      return 1;
    }
    return 0;
  }
}


module.exports = __addressbook_widget_contact_formItems;
