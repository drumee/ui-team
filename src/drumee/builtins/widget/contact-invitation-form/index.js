
// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /home/somanos/devel/ui/letc/template/index.coffee
//   TYPE : Component
// ==================================================================== *

//########################################

class ___contact_invitationForm extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.openContactManager = this.openContactManager.bind(this);
  }

  static initClass() {
    this.prototype.fig = 1;
    this.prototype.behaviorSet =
      { bhv_socket: 1 };
  }

  // ===========================================================
  //
  // ===========================================================
  initialize(opt) {
    if (opt == null) { opt = {}; }
    require('./skin');
    super.initialize();
    this.mode = opt.mode;
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

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    return this.feed(require('./skeleton')(this));
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case _e.submit:
        return this._addContact();

      case 'open-sent-contact':
        return this.openContactManager(cmd);

      default:
        this.source = cmd;
        this.service = service;
        return this.triggerHandlers();
    }
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  openContactManager(cmd) {
    const page = cmd.mget(_a.type);
    const w = Wm.getItemByKind('window_addressbook');
    if (w) {
      w.raise();
      w.reload({ page });
      return;
    }

    return Wm.launch({
      hub_id: '*',
      type: 'address-book',
      page,
      style: {
        left: this.$el.position().left + 30,
        top: this.$el.position().top + 30
      }
    });
  }

  /**
   * 
   * @returns 
   */
  _addContact() {
    const cfd = this.getData(_a.formItem);
    this.validateData();
    if (this.formStatus === _a.error) {
      return;
    }

    this.__submitButton.el.dataset.wait = 1;

    this.postService({
      service: SERVICE.contact.invite,
      surname: cfd.surname,
      email: cfd.email,
      message: cfd.message,
      hub_id: Visitor.id
    }).then((data)=>{
      this._inviteResponse(data);
    })
  }


  /**
   * 
   * @param {*} data 
   * @returns 
   */
  _inviteResponse(data) {
    let errorMessage = null;
    switch (data.status) {
      case 'SAME_DOMAIN':
        errorMessage = LOCALE.ALREADY_CONTACT_LIST;
        break;

      case 'ALREADY_IN_CONTACT':
        errorMessage = LOCALE.ALREADY_CONTACT_LIST;
        break;

      case 'INVALID_DATA':
        errorMessage = 'Invalid email or ident.';
        break;

      case 'INVITE_RECEIVED':
        errorMessage = LOCALE.INVITE_AWAITING_FOR_YOUR_RESPONSE;
        break;

      case 'EMAIL_NOT_SENT':
        errorMessage = LOCALE.MESSAGE_NOT_SENT_RETRY;
        if(_.isArray(data.failed)){
          errorMessage = `${errorMessage}<br>${LOCALE.RECIPIENTS}: ${data.failed.join('<br>')}`
        }
        break;

      default:
        errorMessage = null;
    }

    if (errorMessage) {
      this.__wrapperErrorBox.feed(Skeletons.Note(errorMessage));
      const f = () => {
        this.__wrapperErrorBox.clear();
        return this.__submitButton.el.dataset.wait = 0;
      };
      _.delay(f, Visitor.timeout(5000));
      return;
    }

    this.__submitButton.el.dataset.wait = 0;
    this.source = { type: 'my_contact', ...data };
    this.service = 'invite-response';
    return this.triggerHandlers();
  }

  /**
   * 
   * @param {*} xhr 
   * @returns 
   */
  onServerComplain(xhr) {
    this.__wrapperErrorBox.feed(Skeletons.Note(LOCALE.TRY_AGAIN));
    return this.warn(xhr);
  }

 
}
___contact_invitationForm.initClass();

module.exports = ___contact_invitationForm;
function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}