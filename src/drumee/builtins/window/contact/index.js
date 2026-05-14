const __window_interact = require('window/interact');
class __window_contact extends __window_interact {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this._loadContactInviteForm = this._loadContactInviteForm.bind(this);
    this.getCurrentLabel = this.getCurrentLabel.bind(this);
  }

  static initClass() {
    this.prototype.acceptMedia       = 1;
    this.prototype.figName        = "window_contact";
  }
  
  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    require('./skin');
    super.initialize();
    this.contextmenuSkeleton = _a.none;
    return this.debug("__window_contact initialize", opt, this);
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    this.feed(require("./skeleton")(this));
    return super.onDomRefresh();
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @param {*} section 
   * @returns 
   */
  onPartReady(child, pn, section) {
    this.raise();
    switch (pn) {
      case _a.content:
        this.__content.feed(this._loadContactInviteForm());
        return this.setupInteract();
      
      default:
        return super.onPartReady(child, pn, section);
    }
  }


  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd) {
    const service = cmd.service || cmd.model.get(_a.service);
    const {
      status
    } = cmd;

    
    if (pointerDragged) {
      return;
    }

    switch (service) {
      case 'invite-response':
        return this._inviteResponse(cmd.source);
      
      case 'invite-others':
        return this.__content.feed(this._loadContactInviteForm());

      case 'close-invite': case _e.close: case 'close-popup':
        return this.goodbye();
      
      default:
        this.source = cmd.source;
        this.service = service;
        return this.triggerHandlers();
    }
  }



  /**
   * 
   * @returns 
   */
  _loadContactInviteForm() {
    const inviteForm = { 
      kind      : 'contact_invitation_form',
      className : 'contact-invitation-form',
      mode      : _a.contact
    };
    
    return inviteForm;
  }


  /**
   * 
   * @param {*} c 
   * @returns 
   */
  check_sanity(c) {
    return this.debug("__window_contact check_sanity, ", this, c);
  }


  /**
   * 
   * @returns 
   */
  getCurrentLabel() {
    if (this.mget(_a.trigger)) {
      return this.mget(_a.trigger).mget(_a.label);
    }
    return this._currentLabel || "Not set ";
  }


  /**
   * 
   * @param {*} data 
   * @returns 
   */
  _inviteResponse(data) {
    this.source = data;
    return this.__content.feed(require('./skeleton/acknowledge')(this));
  }


  /**
   * 
   * @param {*} method 
   * @param {*} data 
   * @returns 
   */
  __dispatchRest(method, data) {
    switch (method) {
      case SERVICE.drumate.my_contacts:
        return this._isDrumee(data);
    }
  }
}
__window_contact.initClass();

module.exports = __window_contact;
