class __account_searchbox extends LetcBox {
  constructor(...args) {
    this.onPartReady = this.onPartReady.bind(this);
    this.getApi = this.getApi.bind(this);
    this.focus = this.focus.bind(this);
    this.getData = this.getData.bind(this);
    this._addItem = this._addItem.bind(this);
    this.getSelection = this.getSelection.bind(this);
    this._addSelection = this._addSelection.bind(this);
    this._checkSanity = this._checkSanity.bind(this);
    this._showResults = this._showResults.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    super(...args);
  }

  static initClass() {
    this.prototype.figName  = "account_searchbox";
  // ===========================================================
  //
  // ===========================================================
    this.prototype.behaviorSet =
      {bhv_socket   : 1};
  }

// ===========================================================
// initialize
// ===========================================================
  initialize() {
    this.model.set({ 
      flow : _a.y});

    super.initialize();
    this._minHeight = 36;
    this._maxHeight = 300;
    this._item = {
      kind      : "account_country",
      service   : "select-item",
      signal    : _e.ui.event,
      handler   : {
        uiHandler   : this
      }
    };
    if (this.mget(_a.itemsOpt)) {
      return _.merge(this._item, this.mget(_a.item));
    }
  }
      
    // @_item = @mget("resultItem") || @_itemsOpt
    // # @selectionRollItem = @mget("recipientItem") || @_itemsOpt
    
// ===========================================================
// 
// ===========================================================
  onDomRefresh() {
    this.declareHandlers(); //s {part: @, ui: @}, {fork: yes, recycle: yes}
    const f = ()=> {
      return this.feed(require("./skeleton/main")(this));
    };
    return this.waitElement(this.el, f); 
  }

// ===========================================================
// 
// ===========================================================
  onPartReady(child, pn, section) {
    switch (pn) {
      case "roll-results":
        return this.resultsRoll = child;

      case "ref-actions-bar":
        this.actionsBar = child;
        return child.on(_e.show, () => child.el.hide());

      case "roll-selection":
        this.selectionRoll = child;
        var f =()=> {
          //@service = "update-destination"
          return this.triggerHandlers();
        };
        child.collection.on(_e.add, f); 
        return child.collection.on(_e.remove, f); 

      case "wrapper-results":
        this.resultsWrapper = child;
        return child.on(_e.show, () => child.el.hide());

      case "ref-searchbox":
        return this.searchboxRef = child;

      // when "ref-addbutton"
      //   @addbuttonRef = child

      case "tooltips-wrapper":
        return this._tooltips = child;
    }
  }


// ===========================================================
// 
// ===========================================================
  getApi() {
    if (_.isObject(this.mget(_a.api))) {
      return this.mget(_a.api);
    }
    const o = { 
      service : this.mget(_a.api),
      hub_id  : Visitor.id 
    };
    return o;
  }
    
// ===========================================================
// 
// ===========================================================
  focus() {
    try { 
      return this.searchboxRef.findPart('ref-entry').focus();
    } catch (error) {}
  }

// ===========================================================
// 
// ===========================================================
  getData() {
    const email = this.selectionRoll.collection.pluck(_a.email);
    if (_.isEmpty(email)) {
      return null;
    }
    const a = 
      {email};
    return a;
  }


// ===========================================================
// 
//
// ===========================================================
  _addItem(src) {
    this.service = "add-item";
    this.source  = src;
    this.resultsWrapper.el.hide();
    this.searchboxRef.source.setValue('');
    return this.triggerHandlers();
  }

// ===========================================================
// 
//
// ===========================================================
  getSelection() {
    const sel = [];
    this.resultsRoll.children.each(c=> {
      if (c.mget(_a.state)) {
        return sel.push(c);
      }
    }); 
    return sel; 
  }

// ===========================================================
// 
//
// ===========================================================
  _addSelection(cmd) {
    this.selection = this.getSelection();
    if (_.isEmpty(this.selection)) {
      return; 
    }
    this.source    = this;
    this.triggerHandlers();
    return this.resultsWrapper.el.hide();
  }

// ===========================================================
// 
//
// ===========================================================
  _checkSanity(cmd) {
    let found = null; 
    const {
      source
    } = this.searchboxRef;
    if (!source) {
      return null;
    }
    let str = source.get(_a.value) || '';
      if (str.isEmail()) {
      return str;
    }

    if (this.resultsRoll.collection.length === 1) { 
      found = this.resultsRoll.children.first();
      source.set(found.mget(_a.fullname));
      return found; 
    }

    str = str.replace(/ +/g, '');
    const re = new RegExp(`^${str}$`, 'i');
    for (var c of Array.from(this.resultsRoll.children.toArray())) {
      var fn = c.mget(_a.fullname).replace(/ +/g, '');
      //@debug "#{fn} ==== #{str}", re
      if (fn.match(re) || c.mget(_a.email).match(re)) { 
        found = c; 
        break;
      }
    }
    return found; 
  }
      // return yes 

// ===========================================================
// 
// ===========================================================
  _showResults(cmd){
    const data = cmd.results;
    if (_.isEmpty(data)) {
      return this.resultsWrapper.el.hide();
    } else { 
      this.resultsWrapper.el.show();
      for (var r of Array.from(data)) {
        _.merge(r, this._item);
      }        
      return this.resultsRoll.feed(data);
    }
  }
      
    // if @_checkSanity(cmd)
    //   @addbuttonRef.model.set _a.state, 1


// ===========================================================
// onUiEvent
//
// @param [Object] btn
//
// @return [Object] 
//
// ===========================================================
  onUiEvent(cmd) {
    const service = cmd.service || cmd.mget(_a.service);
    this.debug(`AAAAAA FFF 96 menuEvents service 165=${service}`, this, cmd);
    switch (service.toLowerCase()) {
      case "items-found":
        return this._showResults(cmd);

      // when "add-email"
      //   @_addEmail(cmd)

      case _a.enter:  
        var item = this._checkSanity(cmd);
        if (!item) { 
          return; 
        }
        return this._addItem(item);

      // when "plus-item"
      //   @_addItem @_checkSanity(cmd)

      // when "add-item"
      //   @_addItem(cmd)

      // when "add-selection"
      //   @service = service
      //   @_addSelection(cmd)

      case "select-item": 
        this.selection = this.getSelection();
        if (_.isEmpty(this.selection)) {
          return this.actionsBar.el.hide();
        } else { 
          return this.actionsBar.el.show();
        }
    }
  }
}
__account_searchbox.initClass();


module.exports = __account_searchbox;
