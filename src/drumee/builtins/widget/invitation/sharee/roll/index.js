require('./skin');
class __invitation_shareeroll extends LetcBox {
  constructor(...args) {
    super(...args);
    this._sync = this._sync.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.label = this.label.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    super.initialize(opt);
    this._minHeight = 88;
    this._maxHeight = 287;
    this.declareHandlers();
    this.shareeItem = { 
      kind       : 'invitation_sharee',  
      authority  : this.mget(_a.authority),  
      dialogHandler : this,
      ...this.mget('shareeItem')
    };
    this._sync_bind = this._sync.bind(this); 
    return RADIO_BROADCAST.on("remove:sharee", this._sync_bind);
  }

  /**
   * 
   * @param {*} item 
   * @returns 
   */
  onDestroy(item) {
    return RADIO_BROADCAST.off("remove:sharee", this._sync_bind);
  }

  /**
   * 
   * @param {*} item 
   * @returns 
   */
  _sync(item) {
    const c = this.content.collection;
    const email = item.mget(_a.email);
    return c.each(function(m){
      if ((m != null) && (email === m.get(_a.email))) {
        return c.remove(m);
      }
    });
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @param {*} section 
   * @returns 
   */
  onPartReady(child, pn, section) {
    switch (pn) {
      case "wrapper-dialog":
        return this.dialogWrapper = child;

      case "roll-content":
        var c = child.collection;
        this.content = child;
        return child.onChildDestroy = k=> {
          const l = this.findPart("content-label");
          if ((l == null)) {
            return; 
          }
          if (_.isEmpty(this.label())) {
            return l.setState(0);
          } else { 
            l.setState(1);
            return l.set({
              content : this.label()});
          }
        };
    }
  }

  /**
   * 
   * @returns 
   */
  label() { 
    let p, sharees;
    if (!_.isEmpty(this.mget(_a.label))) {
      return this.mget(_a.label);
    }
    if (this.content) {
      sharees = this.content.collection || [];
      try { 
        p = this.content.collection.first().toJSON();
      } catch (error) { 
        p = {};
      }
    } else {
      sharees = this.mget(_a.sharees) || [];
      p = sharees[0];
    }
    switch (sharees.length) {
      case 0: 
        return LOCALE.NO_CONTACT; //LOCALE.NO_ACCESS_TO_FILE
        break;
      case 1:
        if (p.email === '*') {
          return LOCALE.ACTIVE_PUBLIC_LINK;
        }
        break;
    }
    return '';
  }


  /**
   * 
   * @returns 
   */
  onDomRefresh() { 
    this.shareeItem.dialogHandler = this.getHandlers(_a.ui)[0];
    this.feed(require('./skeleton')(this));
  }
      

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd) {
    const service = cmd.service || cmd.mget(_a.service);
    switch (service) {
      case _e.close:
        return this.softDestroy();
    }
  }
  
  __dispatchRest(method, data, socket) {
    switch (method) {      
      case SERVICE.hub.get_contributors:
        return this._start(data);
    }
  }
}

module.exports = __invitation_shareeroll;
