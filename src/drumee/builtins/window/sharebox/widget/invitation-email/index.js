/* ==================================================================== *
*   Copyright Xialia.com  2011-2020
*   FILE : src/drumee/builtins/window/sharebox/widget/invitation-email/index.js
*   TYPE : Component
* ==================================================================== */

class ___invitation_email extends LetcBox {


  /* ===========================================================
   *
   * ===========================================================*/
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this.emails = this.mget('selectedEmail') || [];
    this.emailList = [];
    this.mode = this.mget(_a.mode) || _a.edit

    this._onOutsideClick = (e, origin) => {
      if (mouseDragged) {
        return
      }
      if (e && this.getPart('suggestion-wrapper') &&
        this.getPart('email-entry') && 
        !(
          this.getPart('suggestion-wrapper').el.contains(e.currentTarget) ||
          this.getPart('email-entry').el.contains(e.currentTarget)
        )) {
        this.getPart('suggestion-wrapper').clear()
      }
    }

    RADIO_CLICK.on(_e.click, this._onOutsideClick)
  }

  /* ===========================================================
   *
   * ===========================================================*/
  onPartReady(child, pn) {
    switch (pn) {
      case 'email-entry':
        this.waitElement(child.el, () => _.delay(() => child._entry.setValue(''), 1000))
      case 'notification-email-list':
        this.emails.map((item) => {
          this.addToNotifications(item, false );
        });
        break;

      default:
        this.debug("onPartReady");
    }
  }

  

  /* ===========================================================
   *
   * ===========================================================*/
  onDomRefresh() {
    this.feed(require('./skeleton').default(this));
  }

  /* ===========================================================
  # onValidateError 
  # ===========================================================*/
  onValidateError(cmd) {
    this.debug(cmd, this)
  }
  /* ===========================================================
  # onValidateSuccess
  # =========================================================== */
  onValidateSuccess(cmd) {
    this.debug(cmd, this)
  }

  /* ===========================================================
   *
   * ===========================================================*/
  onUiEvent(cmd, args) {
    let service = cmd.get(_a.service) || cmd.get(_a.name);
    const status = cmd.get(_a.status);
    this.debug("onUiEvent", service, status, this)

    switch (service) {
      case "add-item":
        this.addToNotifications(args.item);
        return this.triggerEmailUpdate();
      case "add-selection":
        if(!_.isArray(args.items)) return;
        for(var item of args.items){
          this.addToNotifications(item);
        }
        return this.triggerEmailUpdate();
      case 'remove-user':
        return this.deleteUser(cmd);
      case 'add-to-notification':
        this.addToNotifications(cmd);
        return this.triggerEmailUpdate();
      case 'add-email-to-contacts':
        this.addEmailToContacts();
        return this.triggerEmailUpdate();
      case 'open-contacts':
        return this.openContacts(cmd);
      case 'email-input':
        if (status == _a.interactive) {
          this.openSuggestion(cmd);
        }
        if (status == _a.commit) {
          let email = this.getPart('email-entry')._entry.getValue();
          this.getPart('email-entry')._entry.setValue(email.replace(/(?:\r\n|\r|\n|\s)/g, ''));
          this.addEmailToContacts();
          return this.triggerEmailUpdate();
        }
        break;
      default:
        this.debug("Created by kind builder");
    }
  }

  deleteUser(cmd) {
    let email = cmd.mget(_a.email);
    this.emailList = this.emailList.filter(row => row.email != email);
    let onDeleteUser = this.mget('onDeleteUser');
    if (onDeleteUser && _.isFunction(onDeleteUser)) {
      onDeleteUser({email:email}, this);
    }
    cmd.goodbye();
    return this.triggerEmailUpdate();
  }

  triggerEmailUpdate(){
    this.data = this.emailList;
    this.source = this;
    this.service = 'notification-list-updated';
    this.triggerHandlers();
    this.service = '';
  }

  addEmailToContacts() {
    let email = this.getPart('email-entry')._entry.getValue();
    email = email.replace(/(?:\r\n|\r|\n|\s)/g, '');
    if (_.isEmpty(email)){
      return true;
    }
    if (Validator.email(email)) {
      this.pushEmailToNotification({ email: email });
      this.getPart('email-entry')._entry.setValue('');
      return email;
    } else {
      this.getPart('email-entry').__refEntry._reject(LOCALE.ENTER_A_VALID_EMAIL,1)
      return false
    }
  }

  addToNotifications(item, triggerAPI = true) {
    // let dataModel = item.model.attributes;
    let opt = {};
    if(_.isString(item)){
      opt = {id:_.uniqueId('guest-'), email:item};
    }else if(item && item.model){
      let dataModel = item.model.toJSON();
      opt = {
        email: dataModel.email,
        firstname: dataModel.firstname,
        fullname: dataModel.fullname,
        id: dataModel.id,
        ident: dataModel.ident,
        is_blocked: dataModel.is_blocked,
        is_blocked_me: dataModel.is_blocked_me,
        is_drumate: dataModel.is_drumate,
        is_mycontact: dataModel.is_mycontact,
        is_need_email: dataModel.is_need_email,
        lastname: dataModel.lastname,
        page: dataModel.page,
        status: dataModel.status,
        surname: dataModel.surname,
        source: item
      }
    }else if(item && _.isObject(item) && item.email){
      opt = {id:_.uniqueId('guest-'), email:item.email, ...item};
    }
    opt.kind = 'widget_invitation_email_item';
    opt.mode = this.mode
    if(!opt.email || !opt.email.isEmail()){
      if(opt.id && opt.id.isEmail()){
        opt.email = opt.id;
      }else{
        this.warn("INVALID EMAIL", opt);
        return
      }
    }
    this.pushEmailToNotification(opt, triggerAPI);
  }

  pushEmailToNotification(data, triggerAPI = true) {
    if (_.isEmpty(this.emailList.find(row => row.email == data.email))) {
      this.emailList.push(data);
      let onAddUser = this.mget('onAddUser');

      this.getPart('notification-email-list').append(data);
      if(onAddUser && _.isFunction(onAddUser) && triggerAPI){
        onAddUser(data,this);
      }
    }
  }

  openContacts() {
    this.getPart('suggestion-wrapper').feed(require('./skeleton/papercontactlist').default(this))
  }


  openSuggestion(cmd) {
    let value = cmd.getValue();
    if (_.isEmpty(value)) {
      this.getPart('add-email-button').el.dataset.state = _a.closed
      this.getPart('contact-book-icon').el.dataset.state = _a.open
      // this.getPart('suggestion-wrapper').clear()
      return
    } else {
      this.getPart('add-email-button').el.dataset.state = _a.open
      this.getPart('contact-book-icon').el.dataset.state = _a.closed
    }

    this.fetchService({
      service: SERVICE.contact.my_contacts,
      status: "paper",
      filter: this.emailList.map((row) => row.email),
      value: `${value}%`,
      hub_id: Visitor.id
    }).then((data) => {
      if (!data.length) {
        return this.getPart('suggestion-wrapper').clear()
      }
      let contacts = data.map((row) => {
        return {
          kind: 'contact_item',
          service: "add-to-notification",
          uiHandler: [this],
          ...row
        }
      });
      this.getPart('suggestion-wrapper').feed({
        kind: _a.box,
        kids: contacts
      })
    })
  }

  getSearchApi() {
    const a = {
      service: SERVICE.contact.my_contacts,
      status: "paper",
      // filter  : this.emailList.map((row)=>row.email),
      // value: `%`,
      hub_id: Visitor.id
    };
    return a; 
  }

  getAllApi() {
    const a = {
      service: SERVICE.contact.my_contacts,
      status: "paper",
      // filter  : this.emailList.map((row)=>row.email),
      value: `%`,
      hub_id: Visitor.id
    };
    return a; 
  }

}


___invitation_email.initClass();
module.exports = ___invitation_email;
