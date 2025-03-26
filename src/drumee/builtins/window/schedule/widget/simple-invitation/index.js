/* ==================================================================== *
*   Copyright Xialia.com  2011-2020
*   FILE : src/drumee/builtins/window/sharebox/widget/simple-invitation/index.js
*   TYPE : Component
* ==================================================================== */

class ___simple_invitation extends LetcBox {




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

    if (this._responsive) RADIO_BROADCAST.on(_e.responsive, this._responsive);
    this.model.atLeast({
      format     : _a.slide,
      autostart  : false,
      mute       : true,
      innerClass : _K.char.empty,
      widgetId   : this._id, 
      fit        : _a.height,
      video      : 0,
      audio      : 1
    });
    this.service_class = 'conference',
    this._configs = {};
    this.logicalParent = this.getHandlers(_a.ui)[0];
    this.mset({
      nid : this.logicalParent.mget(_a.nodeId),
      hub_id : this.logicalParent.mget(_a.hub_id)
    })
    //this._setSize({height:_a.auto, width:_a.auto});
    this.formData = {
      email : []
    };
    this.declareHandlers();
  }

  /* ===========================================================
   *
   * ===========================================================*/
  onPartReady(child, pn) {
    switch (pn) {
      case 'recipients-list':
        if(!_.isArray(this.emails)) return;
        for(var item of this.emails){
          item.kind = 'schedule_recipient';
          item.type = this.mget(_a.type);
          this.__recipientsList.append(item);
        }
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
  onUiEvent(cmd, args = {}) {
    let service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    const status = cmd.get(_a.status);
    this.debug("onUiEvent", service, status, this)

    switch (service) {
      case "add-item":
        return this.addDrumate(args.item);
      case "add-guest":
        return this.addGuest(args);

      case "add-guest":
        return this.addGuest(args);
      case 'delete':
        return this.deleteUser(cmd);
      case 'invitation-item':
        this.debug('invitation-item-ranjith',cmd,args)
        if(args.item && _.isObject(args.item)){
          args.items = [args.item];
        } 
        if(!_.isArray(args.items)) return;
        for(var item of args.items){
          this.addDrumate(item);
        }
        if(status == _a.commit){
          return this.addGuest(args);
        }

      default:
        this.debug("Created by kind builder");
    }
  }


  /**
   * 
   */
  addGuest(data) {
    let opt = {};
    if(data && data.email){
      opt = data;
      opt.id = _.uniqueId();
    }
    opt.kind = 'schedule_recipient';
    if(!opt.email || !opt.email.isEmail()){
      if(this.handleError) {this.handleError({error:1});}
      this.warn("INVALID EMAIL", opt);
      return
    }
    let exists = this.__recipientsList.getItemsByAttr(_a.email, opt.email);
    if(exists[0]){
      exists[0].anim([0.3, {scale:0.9, alpha:0.7}], [0.3, {scale:1, alpha:1}]);
      return;
    }
    this.source = data
    this.service = 'add-guest'
    this.triggerHandlers()
    this.__recipientsList.append(opt);
  }

  /**
   * 
   */
   addDrumate(source) {
    let opt = {};
    if(source.model){
      opt = source.model.toJSON();
    }
    opt.kind = 'schedule_recipient';
    if(!opt.email || !opt.email.isEmail()){
      if(opt.id && opt.id.isEmail()){
        opt.email = opt.id;
      }else{
        this.handleError({error:1});
        this.warn("INVALID EMAIL", opt);
        return
      }
    }
    let exists = this.__recipientsList.getItemsByAttr(_a.email, opt.email);
    if(exists[0]){
      exists[0].anim([0.3, {scale:0.9, alpha:0.7}], [0.3, {scale:1, alpha:1}]);
      return;
    }
    this.source = opt
    this.service = 'add-drumate'
    this.triggerHandlers()
    this.__recipientsList.append(opt);
  }


  deleteUser(cmd) {
    let email = cmd.mget(_a.email);
    let opt = {};
    if(cmd.source.model){
      opt = cmd.source.model.toJSON();
    }
    this.emailList = this.emailList.filter(row => row.email != email);
    let onDeleteUser = this.mget('onDeleteUser');
    if (onDeleteUser && _.isFunction(onDeleteUser)) {
      onDeleteUser({email:email}, this);
    }
    this.source = opt
    this.service = 'delete-member'
    this.triggerHandlers()
    cmd.goodbye();
    // return this.triggerEmailUpdate();
  }

  getMembersList(){
    return this.__recipientsList.collection.toJSON();
  }

  submitEmail(){
    return this.__invitationSearch.submitInput();
  }

  triggerEmailUpdate(){
    this.data = this.emailList;
    this.source = this;
    this.service = 'updated-invitation-list';
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

  // openContacts() {
  //   this.getPart('suggestion-wrapper').feed(require('./skeleton/papercontactlist').default(this))
  // }


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


module.exports = ___simple_invitation;
