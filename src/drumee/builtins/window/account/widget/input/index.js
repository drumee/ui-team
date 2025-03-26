class __account_entry extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onPartReady = this.onPartReady.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.reload = this.reload.bind(this);
    this.message = this.message.bind(this);
    this.getValue = this.getValue.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
  }

  static initClass() {
    this.prototype.figName  = "account_field";
  
  // ===========================================================
  //
  // ===========================================================
    this.prototype.behaviorSet = {
      bhv_radio    : 1,
      bhv_socket   : 1
    };
  }

// ===========================================================
//
// ===========================================================
  initialize(opt) {
    super.initialize();
    return this.mset({ 
      flow : _a.x}); 
  }

// ===========================================================
// onPartReady
// ===========================================================
  onPartReady(child, pn, section) {
    this.declareHandlers();
    switch (pn) {
      case 'wrapper-dialog':
        return this.dialogWrapper = child;

      case 'ref-message':
        child.el.hide();
        return this._message = child;
    }
  }

// ===========================================================
// onDomRefresh
// ===========================================================
  onDomRefresh() { 
    this.declareHandlers(); 
    return this.reload();
  }

// ===========================================================
//
// ===========================================================
  reload() { 
    return this.feed(require("./skeleton")(this));
  }

// ===========================================================
//
// ===========================================================
  message(txt) { 
    if (!txt) { 
      this._message.el.hide();
      return;
    }
    if (txt === _a.template) {
      txt = require("./template/tick")(this);
      this._message.el.dataset.status = "ack";
    }
    this._message.el.show();
    return this._message.set({
      content : txt
    });
  }

// ===========================================================
//
// ===========================================================
  getValue() { 
    return this._value; 
  }

// ===========================================================
// onUiEvent
// ===========================================================
  onUiEvent(cmd, args) {
    if (args == null) { args = {}; }
    const service = args.service || cmd.mget(_a.service);
    this.debug(`onUiEvent service = ${service}`, args, cmd, this);

    switch (service) {
      case _e.edit:
        var profileForm = require('./skeleton/entries/name')(this);
        if (this.mget(_a.name) === _a.address) {
          profileForm = require('./skeleton/entries/address')(this);
        }
        
        return this.__wrapperRow.feed(profileForm);
      
      case _e.submit:
        return this.triggerHandlers({service, source: this, cmd});
      
      case _e.update:
        if (cmd.status === _e.Enter) {
          this.service = _e.commit;
          this.source  = cmd;
          return this.triggerHandlers(cmd);
        }
        break;

      case _e.unlock:
        return this.findPart('wrapper-dialog').feed(require('./skeleton/unlock')(this));

      case _e.close:
        if (!this.dialogWrapper.isEmpty()) {
          return this.dialogWrapper.children.last().softDestroy();
        }
        break;
      default: 
        return this.triggerHandlers(cmd);
    }
  }
        
// ===========================================================
//
// ===========================================================
  __dispatchRest(method, data, socket) {
    if (method === this.mget(_a.check)) {
      if (!_.isEmpty(data)) { 
        const name = this.mget(_a.name);
        this.debug("daa", this.mget(_a.value), data[name], this, socket);
        this._value = null;
        if (this.mget(_a.value) === data[name]) {
          return; 
        }
        this.message((data[name].printf(LOCALE.NAME_ALREADY_EXISTES)));
        return this.error = 1; 
      } else {
        this.error = 0;
        return this.message();
      }
    }
  }
}
__account_entry.initClass();


module.exports = __account_entry;
